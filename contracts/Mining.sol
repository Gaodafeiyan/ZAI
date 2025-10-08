// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Zenithus Virtual Mining Contract
 * @dev Simulated Proof-of-AI-Compute (PoAIC) mining system with virtual miners
 *
 * ============ Core Concept ============
 * This is NOT real mining or AI computation. It's a gamified staking mechanism where:
 * - Users "buy miners" by staking ZAI tokens
 * - Virtual "power" is allocated based on stake amount (pure algorithm, no actual AI)
 * - Daily rewards distributed proportionally to power share
 * - Rewards follow exponential decay curve (deflationary model)
 * - 3-level referral system incentivizes growth
 * - Annual miner renewals create sustainable token burns
 *
 * ============ Economic Model (30-Year Cycle) ============
 * Total Rewards Pool: 9,000,000 ZAI (over ~30 years via decay)
 * Initial Daily Release: 328 ZAI/day
 * Decay Rate: 0.9999636 per day (optimized for 9M total over 30 years)
 * Fee Structure:
 * - Buy/Upgrade: 10% fee (50% burn, 30% marketing, 20% operational)
 * - Renewal: 10% of original purchase price (same allocation)
 * - Referral: Up to 10% of rewards (5% L1, 3% L2, 1% L3)
 *
 * ============ Security Features ============
 * - OpenZeppelin battle-tested contracts (IERC20, Ownable, ReentrancyGuard)
 * - No external oracles or off-chain dependencies
 * - Overflow protection via Solidity 0.8.20
 * - Reentrancy guards on fund transfers
 * - Owner access controls (to be transferred to DAO)
 *
 * @author Zenithus Team
 */
contract ZenithMining is Ownable, ReentrancyGuard {
    // ============ Constants ============

    /// @notice ZAI token contract address (set after ZAI deployment)
    IERC20 public immutable ZAI;

    /// @notice Total reward pool cap: 9,000,000 ZAI (30-year cycle)
    uint256 public constant MAX_TOTAL_REWARDS = 9_000_000 * 10**18;

    /// @notice Basis points denominator (for percentage calculations)
    uint256 private constant BP_DENOMINATOR = 10000;

    /// @notice Fixed-point precision for decay calculations (18 decimals)
    uint256 private constant PRECISION = 1e18;

    /// @notice Miner renewal period: 1 year (365 days)
    uint256 public constant RENEWAL_PERIOD = 365 days;

    /// @notice Reward lock period: 30 days (30% of claimed rewards locked)
    uint256 public constant REWARD_LOCK_PERIOD = 30 days;

    /// @notice Difficulty adjustment period: 14 days
    uint256 public constant DIFFICULTY_PERIOD = 14 days;

    /// @notice Max miners to process in adjustDifficulty (gas limit)
    uint256 public constant MAX_DEACTIVATE_PER_CALL = 1000;

    // ============ Structures ============

    /**
     * @dev Virtual Miner structure
     * Represents a user's staked position with virtual mining power
     */
    struct Miner {
        address owner;              // Miner owner address
        uint256 purchasePrice;      // Initial ZAI paid (for renewal calculation)
        uint256 powerLevel;         // Virtual mining power (1:1 with staked ZAI)
        uint256 purchaseTime;       // Timestamp of purchase
        uint256 renewalTime;        // Timestamp of last renewal (expires after 365 days)
        bool active;                // Whether miner is active (not expired)
    }

    /**
     * @dev Locked reward structure
     * Tracks rewards locked for 30 days after claiming
     */
    struct LockedReward {
        uint256 amount;             // Amount locked
        uint256 releaseTime;        // Timestamp when unlockable
    }

    // ============ State Variables ============

    /// @notice Marketing wallet address (receives 30% of fees)
    address public marketingWallet;

    /// @notice Operational wallet address (receives 20% of fees)
    address public operationalWallet;

    /// @notice Mining start timestamp (when rewards begin)
    uint256 public startTimestamp;

    /// @notice Initial daily reward amount: 328 ZAI/day (30-year cycle)
    uint256 public initialDailyReward = 328 * 10**18;

    /// @notice Daily decay rate (0.9999636 in fixed-point, 99.99636%)
    /// @dev Represented as 9999636e11 (0.9999636 * 1e18) - optimized for 9M total over 30 years
    uint256 public decayRate = 9999636e11;

    /// @notice Total ZAI released as rewards so far
    uint256 public totalReleased;

    /// @notice Last difficulty adjustment timestamp
    uint256 public lastDifficultyAdjustment;

    /// @notice Global total power from all active miners
    uint256 public globalTotalPower;

    /// @notice Accumulated burn pool (for annual burns)
    uint256 public burnPool;

    /// @notice Total locked rewards across all users (for circulating supply calc)
    uint256 public totalLockedRewards;

    /// @notice Fee allocation percentages (in basis points)
    /// @dev Default: 50% burn, 30% marketing, 20% operational
    uint256 public burnFeePercent = 5000;      // 50%
    uint256 public marketingFeePercent = 3000; // 30%
    uint256 public operationalFeePercent = 2000; // 20%

    /// @notice Annual burn target percentage (12.55% of circulating supply)
    uint256 public annualBurnPercent = 1255; // 12.55% in basis points

    /// @notice Track all users who have miners (for adjustDifficulty iteration)
    address[] public allUsers;
    mapping(address => bool) public isUserRegistered;

    // ============ Mappings ============

    /// @notice User's miners array
    mapping(address => Miner[]) public userMiners;

    /// @notice Pending claimable rewards (70% unlocked immediately)
    mapping(address => uint256) public pendingRewards;

    /// @notice Locked rewards (30% locked for 30 days)
    mapping(address => LockedReward[]) public lockedRewards;

    /// @notice Referrer mapping (user => referrer address)
    mapping(address => address) public referrer;

    /// @notice Downline mapping (referrer => downline addresses)
    mapping(address => address[]) public downlines;

    /// @notice Last reward claim timestamp per user (for accrual calculation)
    mapping(address => uint256) public lastClaimTime;

    /// @notice User total power cache (for efficiency)
    mapping(address => uint256) public userTotalPower;

    // ============ Events ============

    /// @notice Emitted when a user buys a new miner
    event MinerBought(
        address indexed user,
        uint256 indexed minerId,
        uint256 price,
        uint256 powerLevel,
        address indexed referrer
    );

    /// @notice Emitted when a user upgrades an existing miner
    event MinerUpgraded(
        address indexed user,
        uint256 indexed minerId,
        uint256 additionalZAI,
        uint256 newPowerLevel
    );

    /// @notice Emitted when a user renews an expired miner
    event MinerRenewed(
        address indexed user,
        uint256 indexed minerId,
        uint256 renewalFee,
        uint256 newRenewalTime
    );

    /// @notice Emitted when rewards are claimed
    event RewardClaimed(
        address indexed user,
        uint256 unlockedAmount,
        uint256 lockedAmount,
        uint256 timestamp
    );

    /// @notice Emitted when referral rewards are paid
    event ReferralReward(
        address indexed referrer,
        address indexed downline,
        uint256 level,
        uint256 amount
    );

    /// @notice Emitted when annual burn is executed
    event BurnExecuted(uint256 amount, uint256 timestamp);

    /// @notice Emitted when difficulty is adjusted
    event DifficultyAdjusted(uint256 newGlobalPower, uint256 deactivatedCount, uint256 timestamp);

    /// @notice Emitted when locked rewards are claimed
    event LockedRewardClaimed(address indexed user, uint256 amount);

    /// @notice Emitted when wallets are updated
    event WalletUpdated(string walletType, address newAddress);

    /// @notice Emitted when decay parameters are updated
    event DecayParamsUpdated(uint256 initialDaily, uint256 decayRate, uint256 startTime);

    // ============ Constructor ============

    /**
     * @dev Initializes mining contract
     * @param _zaiAddress ZAI token contract address
     * @param _marketingWallet Marketing wallet address
     * @param _operationalWallet Operational wallet address
     */
    constructor(
        address _zaiAddress,
        address _marketingWallet,
        address _operationalWallet
    ) Ownable(msg.sender) {
        require(_zaiAddress != address(0), "Mining: Invalid ZAI address");
        require(_marketingWallet != address(0), "Mining: Invalid marketing wallet");
        require(_operationalWallet != address(0), "Mining: Invalid operational wallet");

        ZAI = IERC20(_zaiAddress);
        marketingWallet = _marketingWallet;
        operationalWallet = _operationalWallet;
        startTimestamp = block.timestamp;
        lastDifficultyAdjustment = block.timestamp;
    }

    // ============ Core Mining Functions ============

    /**
     * @notice Buy a new virtual miner by staking ZAI
     * @param amountZAI Amount of ZAI to stake (minimum 500 ZAI)
     * @param _referrer Referrer address (optional, use address(0) if none)
     *
     * Process:
     * 1. Transfer ZAI from user to contract
     * 2. Deduct 10% fee (50% burn, 30% marketing, 20% operational)
     * 3. Create new Miner with powerLevel = remaining ZAI
     * 4. Register referral relationship (if valid)
     * 5. Update global power
     */
    function buyMiner(uint256 amountZAI, address _referrer) external nonReentrant {
        require(amountZAI >= 500 * 10**18, "Mining: Minimum 500 ZAI required");
        require(_referrer != msg.sender, "Mining: Cannot refer yourself");

        // Accrue pending rewards before power change
        _accrueRewards(msg.sender);

        // Transfer ZAI from user
        require(ZAI.transferFrom(msg.sender, address(this), amountZAI), "Mining: Transfer failed");

        // Calculate and distribute fees (10% total)
        uint256 totalFee = (amountZAI * 1000) / BP_DENOMINATOR; // 10%
        _distributeFees(totalFee);

        // Remaining ZAI becomes miner's power
        uint256 netAmount = amountZAI - totalFee;
        uint256 powerLevel = netAmount; // 1:1 ratio (can be adjusted with factor)

        // Create new miner
        Miner memory newMiner = Miner({
            owner: msg.sender,
            purchasePrice: amountZAI,
            powerLevel: powerLevel,
            purchaseTime: block.timestamp,
            renewalTime: block.timestamp + RENEWAL_PERIOD,
            active: true
        });

        userMiners[msg.sender].push(newMiner);
        uint256 minerId = userMiners[msg.sender].length - 1;

        // Update user and global power
        userTotalPower[msg.sender] += powerLevel;
        globalTotalPower += powerLevel;

        // Register user in allUsers list (for difficulty adjustment)
        if (!isUserRegistered[msg.sender]) {
            allUsers.push(msg.sender);
            isUserRegistered[msg.sender] = true;
        }

        // Register referral (first time only)
        if (referrer[msg.sender] == address(0) && _referrer != address(0)) {
            referrer[msg.sender] = _referrer;
            downlines[_referrer].push(msg.sender);
        }

        // Initialize last claim time
        if (lastClaimTime[msg.sender] == 0) {
            lastClaimTime[msg.sender] = block.timestamp;
        }

        emit MinerBought(msg.sender, minerId, amountZAI, powerLevel, _referrer);
    }

    /**
     * @notice Upgrade existing miner by adding more ZAI
     * @param minerId Miner index in user's miners array
     * @param amountZAI Additional ZAI to stake
     */
    function upgradeMiner(uint256 minerId, uint256 amountZAI) external nonReentrant {
        require(minerId < userMiners[msg.sender].length, "Mining: Invalid miner ID");
        Miner storage miner = userMiners[msg.sender][minerId];
        require(miner.active, "Mining: Miner is not active");

        // Accrue pending rewards before power change
        _accrueRewards(msg.sender);

        // Transfer ZAI from user
        require(ZAI.transferFrom(msg.sender, address(this), amountZAI), "Mining: Transfer failed");

        // Calculate and distribute fees (10% total)
        uint256 totalFee = (amountZAI * 1000) / BP_DENOMINATOR;
        _distributeFees(totalFee);

        // Add remaining ZAI to power
        uint256 netAmount = amountZAI - totalFee;
        uint256 additionalPower = netAmount;

        miner.powerLevel += additionalPower;
        miner.purchasePrice += amountZAI; // Update for renewal calculation

        // Update user and global power
        userTotalPower[msg.sender] += additionalPower;
        globalTotalPower += additionalPower;

        emit MinerUpgraded(msg.sender, minerId, amountZAI, miner.powerLevel);
    }

    /**
     * @notice Renew an expired miner (annual renewal)
     * @param minerId Miner index in user's miners array
     *
     * Renewal Cost: 10% of original purchase price
     * Effect: Extends miner validity by 365 days, reactivates if expired
     */
    function renewMiner(uint256 minerId) external nonReentrant {
        require(minerId < userMiners[msg.sender].length, "Mining: Invalid miner ID");
        Miner storage miner = userMiners[msg.sender][minerId];
        require(block.timestamp >= miner.renewalTime - 30 days, "Mining: Too early to renew");

        // Calculate renewal fee (10% of purchase price)
        uint256 renewalFee = (miner.purchasePrice * 1000) / BP_DENOMINATOR;

        // Transfer renewal fee from user
        require(ZAI.transferFrom(msg.sender, address(this), renewalFee), "Mining: Transfer failed");

        // Distribute fees
        _distributeFees(renewalFee);

        // Update renewal time and reactivate
        miner.renewalTime = block.timestamp + RENEWAL_PERIOD;
        if (!miner.active) {
            miner.active = true;
            // Re-add power to global pool
            userTotalPower[msg.sender] += miner.powerLevel;
            globalTotalPower += miner.powerLevel;
        }

        emit MinerRenewed(msg.sender, minerId, renewalFee, miner.renewalTime);
    }

    // ============ Reward Functions ============

    /**
     * @notice Claim pending rewards (70% unlocked, 30% locked for 30 days)
     *
     * Process:
     * 1. Accrue rewards up to current block
     * 2. Calculate referral bonuses (5% L1, 3% L2, 1% L3)
     * 3. Split rewards: 70% immediate, 30% locked
     * 4. Transfer unlocked amount to user
     * 5. Store locked amount with 30-day timer
     */
    function claimRewards() external nonReentrant {
        // Accrue latest rewards
        _accrueRewards(msg.sender);

        uint256 claimableAmount = pendingRewards[msg.sender];
        require(claimableAmount > 0, "Mining: No rewards to claim");
        require(claimableAmount <= ZAI.balanceOf(address(this)), "Mining: Insufficient reward pool");

        // Pay referral bonuses (up to 10% of rewards)
        uint256 referralTotal = _payReferralRewards(msg.sender, claimableAmount);

        // Net rewards after referral
        uint256 netRewards = claimableAmount - referralTotal;

        // Split: 70% unlocked, 30% locked for 30 days
        uint256 unlockedAmount = (netRewards * 7000) / BP_DENOMINATOR; // 70%
        uint256 lockedAmount = netRewards - unlockedAmount;            // 30%

        // Reset pending rewards
        pendingRewards[msg.sender] = 0;

        // Store locked rewards and update total locked
        if (lockedAmount > 0) {
            lockedRewards[msg.sender].push(LockedReward({
                amount: lockedAmount,
                releaseTime: block.timestamp + REWARD_LOCK_PERIOD
            }));
            totalLockedRewards += lockedAmount;
        }

        // Transfer unlocked rewards
        if (unlockedAmount > 0) {
            require(ZAI.transfer(msg.sender, unlockedAmount), "Mining: Transfer failed");
        }

        emit RewardClaimed(msg.sender, unlockedAmount, lockedAmount, block.timestamp);
    }

    /**
     * @notice Claim unlocked rewards after 30-day lock period
     *
     * Iterates through user's locked rewards and transfers any that are unlocked
     */
    function claimLockedRewards() external nonReentrant {
        LockedReward[] storage locks = lockedRewards[msg.sender];
        require(locks.length > 0, "Mining: No locked rewards");

        uint256 totalUnlocked = 0;
        uint256 i = 0;

        // Iterate and collect unlocked rewards
        while (i < locks.length) {
            if (block.timestamp >= locks[i].releaseTime) {
                totalUnlocked += locks[i].amount;

                // Remove unlocked entry by swapping with last element
                locks[i] = locks[locks.length - 1];
                locks.pop();
            } else {
                i++;
            }
        }

        require(totalUnlocked > 0, "Mining: No rewards unlocked yet");

        // Update total locked rewards
        totalLockedRewards -= totalUnlocked;

        require(ZAI.transfer(msg.sender, totalUnlocked), "Mining: Transfer failed");

        emit LockedRewardClaimed(msg.sender, totalUnlocked);
    }

    // ============ Internal Functions ============

    /**
     * @dev Accrue rewards for user since last claim
     * @param user User address
     *
     * Formula:
     * Daily Total T = initialDailyReward * (decayRate ^ daysSinceStart)
     * Personal P = (userPower / globalPower) * T * daysSinceLastClaim
     */
    function _accrueRewards(address user) internal {
        if (userTotalPower[user] == 0) return;
        if (globalTotalPower == 0) return;

        uint256 timeSinceLastClaim = block.timestamp - lastClaimTime[user];
        if (timeSinceLastClaim == 0) return;

        // Calculate daily reward with exponential decay
        uint256 dailyTotal = _getDailyReward();

        // User's share of daily total
        uint256 userShare = (dailyTotal * userTotalPower[user]) / globalTotalPower;

        // Pro-rate for time since last claim
        uint256 reward = (userShare * timeSinceLastClaim) / 1 days;

        // Cap at remaining pool
        if (totalReleased + reward > MAX_TOTAL_REWARDS) {
            reward = MAX_TOTAL_REWARDS - totalReleased;
        }

        if (reward > 0) {
            pendingRewards[user] += reward;
            totalReleased += reward;
        }

        lastClaimTime[user] = block.timestamp;
    }

    /**
     * @dev Calculate current daily reward with exponential decay
     * @return Current daily reward amount
     *
     * Formula: T = initialDailyReward * (0.9999636 ^ daysSinceStart)
     * Uses iterative multiplication for fixed-point decay (no external lib)
     *
     * FIXED: Loop-based pow approximation with cap check
     */
    function _getDailyReward() internal view returns (uint256) {
        uint256 daysSinceStart = (block.timestamp - startTimestamp) / 1 days;

        // Handle edge case: day 0
        if (daysSinceStart == 0) return initialDailyReward;

        // Calculate decay using iterative multiplication
        // current = initial * (decayRate ^ days)
        uint256 current = initialDailyReward;

        for (uint256 i = 0; i < daysSinceStart; i++) {
            current = (current * decayRate) / PRECISION;

            // Early exit if reward becomes negligible
            if (current == 0) break;
        }

        // Cap at remaining rewards to prevent over-distribution
        uint256 remaining = MAX_TOTAL_REWARDS - totalReleased;
        if (current > remaining) {
            current = remaining;
        }

        return current;
    }

    /**
     * @dev Distribute fees from miner purchases/upgrades/renewals
     * @param feeAmount Total fee amount (10% of transaction)
     *
     * Allocation:
     * - 50% → Burn pool (for annual burns)
     * - 30% → Marketing wallet
     * - 20% → Operational wallet
     */
    function _distributeFees(uint256 feeAmount) internal {
        uint256 burnAmount = (feeAmount * burnFeePercent) / BP_DENOMINATOR;
        uint256 marketingAmount = (feeAmount * marketingFeePercent) / BP_DENOMINATOR;
        uint256 operationalAmount = (feeAmount * operationalFeePercent) / BP_DENOMINATOR;

        // Add to burn pool (for annual burn)
        burnPool += burnAmount;

        // Transfer to wallets
        if (marketingAmount > 0) {
            require(ZAI.transfer(marketingWallet, marketingAmount), "Mining: Marketing transfer failed");
        }
        if (operationalAmount > 0) {
            require(ZAI.transfer(operationalWallet, operationalAmount), "Mining: Operational transfer failed");
        }
    }

    /**
     * @dev Pay referral rewards (3-level system)
     * @param user Downline user claiming rewards
     * @param rewardAmount Base reward amount
     * @return Total referral rewards paid
     *
     * Referral rates:
     * - Level 1 (direct): 5% of rewards
     * - Level 2: 3% of rewards
     * - Level 3: 1% of rewards
     *
     * Requirements:
     * - Referrer must have active miner (not expired)
     * - Total cap: 10% of rewards
     */
    function _payReferralRewards(address user, uint256 rewardAmount) internal returns (uint256) {
        uint256 totalPaid = 0;

        address level1 = referrer[user];
        if (level1 != address(0) && _hasActiveMiner(level1)) {
            uint256 level1Reward = (rewardAmount * 500) / BP_DENOMINATOR; // 5%
            pendingRewards[level1] += level1Reward;
            totalPaid += level1Reward;
            emit ReferralReward(level1, user, 1, level1Reward);

            address level2 = referrer[level1];
            if (level2 != address(0) && _hasActiveMiner(level2)) {
                uint256 level2Reward = (rewardAmount * 300) / BP_DENOMINATOR; // 3%
                pendingRewards[level2] += level2Reward;
                totalPaid += level2Reward;
                emit ReferralReward(level2, user, 2, level2Reward);

                address level3 = referrer[level2];
                if (level3 != address(0) && _hasActiveMiner(level3)) {
                    uint256 level3Reward = (rewardAmount * 100) / BP_DENOMINATOR; // 1%
                    pendingRewards[level3] += level3Reward;
                    totalPaid += level3Reward;
                    emit ReferralReward(level3, user, 3, level3Reward);
                }
            }
        }

        return totalPaid;
    }

    /**
     * @dev Check if user has at least one active miner
     * @param user User address
     * @return True if user has active miner
     */
    function _hasActiveMiner(address user) internal view returns (bool) {
        Miner[] storage miners = userMiners[user];
        for (uint256 i = 0; i < miners.length; i++) {
            if (miners[i].active && block.timestamp < miners[i].renewalTime) {
                return true;
            }
        }
        return false;
    }

    // ============ Admin Functions ============

    /**
     * @notice Execute annual burn (12.55% of circulating supply target)
     * @dev Auto-calculates circulating supply and burns target percentage from burnPool
     *
     * FIXED: Auto-calculation of circulating supply
     * Circulating = totalSupply - locked rewards - burnPool
     * Target = 12.55% of circulating
     * Burns min(target, burnPool) to prevent over-burn
     */
    function executeAnnualBurn() external onlyOwner nonReentrant {
        require(burnPool > 0, "Mining: Burn pool is empty");

        // Get ZAI total supply
        uint256 totalSupply = ZAI.totalSupply();

        // Calculate circulating supply (exclude locked rewards and burn pool)
        uint256 circulatingSupply = totalSupply - totalLockedRewards - burnPool;

        // Calculate target burn (12.55% of circulating supply)
        uint256 targetBurn = (circulatingSupply * annualBurnPercent) / BP_DENOMINATOR;

        // Burn the minimum of target and available burn pool
        uint256 burnAmount = targetBurn < burnPool ? targetBurn : burnPool;

        require(burnAmount > 0, "Mining: No amount to burn");

        burnPool -= burnAmount;

        // Burn by transferring to dead address
        require(ZAI.transfer(address(0xdead), burnAmount), "Mining: Burn failed");

        emit BurnExecuted(burnAmount, block.timestamp);
    }

    /**
     * @notice Adjust difficulty (recalculate global power and deactivate expired miners)
     * @dev Called automatically every 14 days or manually by owner
     *
     * FIXED: Auto-deactivate expired miners in loop (max 1000 per call for gas limit)
     * Iterates through allUsers, checks each miner, deactivates if block.timestamp > renewalTime
     */
    function adjustDifficulty() external {
        require(
            block.timestamp >= lastDifficultyAdjustment + DIFFICULTY_PERIOD || msg.sender == owner(),
            "Mining: Too early for difficulty adjustment"
        );

        uint256 deactivatedCount = 0;
        uint256 processedCount = 0;

        // Iterate through all users and deactivate expired miners
        for (uint256 i = 0; i < allUsers.length && processedCount < MAX_DEACTIVATE_PER_CALL; i++) {
            address user = allUsers[i];
            Miner[] storage miners = userMiners[user];

            for (uint256 j = 0; j < miners.length && processedCount < MAX_DEACTIVATE_PER_CALL; j++) {
                processedCount++;

                if (miners[j].active && block.timestamp > miners[j].renewalTime) {
                    // Accrue rewards before deactivating
                    _accrueRewards(user);

                    // Deactivate miner
                    miners[j].active = false;

                    // Subtract power from totals
                    userTotalPower[user] -= miners[j].powerLevel;
                    globalTotalPower -= miners[j].powerLevel;

                    deactivatedCount++;
                }
            }
        }

        lastDifficultyAdjustment = block.timestamp;

        emit DifficultyAdjusted(globalTotalPower, deactivatedCount, block.timestamp);
    }

    /**
     * @notice Deactivate expired miner manually
     * @param user Miner owner address
     * @param minerId Miner index
     *
     * Anyone can call to help maintain accurate global power
     */
    function deactivateExpiredMiner(address user, uint256 minerId) external {
        require(minerId < userMiners[user].length, "Mining: Invalid miner ID");
        Miner storage miner = userMiners[user][minerId];

        require(miner.active, "Mining: Miner already inactive");
        require(block.timestamp > miner.renewalTime, "Mining: Miner not expired yet");

        // Accrue rewards before power change
        _accrueRewards(user);

        // Deactivate and remove power
        miner.active = false;
        userTotalPower[user] -= miner.powerLevel;
        globalTotalPower -= miner.powerLevel;
    }

    /**
     * @notice Update marketing wallet address
     * @param _marketingWallet New marketing wallet
     */
    function setMarketingWallet(address _marketingWallet) external onlyOwner {
        require(_marketingWallet != address(0), "Mining: Invalid address");
        marketingWallet = _marketingWallet;
        emit WalletUpdated("marketing", _marketingWallet);
    }

    /**
     * @notice Update operational wallet address
     * @param _operationalWallet New operational wallet
     */
    function setOperationalWallet(address _operationalWallet) external onlyOwner {
        require(_operationalWallet != address(0), "Mining: Invalid address");
        operationalWallet = _operationalWallet;
        emit WalletUpdated("operational", _operationalWallet);
    }

    /**
     * @notice Update decay parameters
     * @param _initialDailyReward New initial daily reward
     * @param _decayRate New decay rate (in fixed-point, e.g., 999e15 for 0.999)
     * @param _startTimestamp New start timestamp
     */
    function setDecayParams(
        uint256 _initialDailyReward,
        uint256 _decayRate,
        uint256 _startTimestamp
    ) external onlyOwner {
        require(_decayRate > 0 && _decayRate <= PRECISION, "Mining: Invalid decay rate");
        initialDailyReward = _initialDailyReward;
        decayRate = _decayRate;
        startTimestamp = _startTimestamp;
        emit DecayParamsUpdated(_initialDailyReward, _decayRate, _startTimestamp);
    }

    /**
     * @notice Adjust fee allocation percentages
     * @param _burnPercent Burn percentage (basis points)
     * @param _marketingPercent Marketing percentage (basis points)
     * @param _operationalPercent Operational percentage (basis points)
     */
    function setFeeAllocation(
        uint256 _burnPercent,
        uint256 _marketingPercent,
        uint256 _operationalPercent
    ) external onlyOwner {
        require(
            _burnPercent + _marketingPercent + _operationalPercent == BP_DENOMINATOR,
            "Mining: Percentages must sum to 100%"
        );
        burnFeePercent = _burnPercent;
        marketingFeePercent = _marketingPercent;
        operationalFeePercent = _operationalPercent;
    }

    /**
     * @notice Update annual burn percentage
     * @param _annualBurnPercent New annual burn percentage (basis points, e.g., 1255 for 12.55%)
     */
    function setAnnualBurnPercent(uint256 _annualBurnPercent) external onlyOwner {
        require(_annualBurnPercent <= BP_DENOMINATOR, "Mining: Invalid percentage");
        annualBurnPercent = _annualBurnPercent;
    }

    /**
     * @notice Owner deposits ZAI into reward pool
     * @param amount Amount of ZAI to deposit
     *
     * Used to pre-fund the reward pool (up to 9M ZAI)
     */
    function fundRewardPool(uint256 amount) external onlyOwner {
        require(ZAI.transferFrom(msg.sender, address(this), amount), "Mining: Transfer failed");
    }

    // ============ View Functions ============

    /**
     * @notice Get all miners for a user
     * @param user User address
     * @return Array of user's miners
     */
    function getUserMiners(address user) external view returns (Miner[] memory) {
        return userMiners[user];
    }

    /**
     * @notice Get pending rewards for a user (including accrued but unclaimed)
     * @param user User address
     * @return Pending reward amount
     */
    function getPendingRewards(address user) external view returns (uint256) {
        if (userTotalPower[user] == 0 || globalTotalPower == 0) {
            return pendingRewards[user];
        }

        uint256 timeSinceLastClaim = block.timestamp - lastClaimTime[user];
        if (timeSinceLastClaim == 0) return pendingRewards[user];

        uint256 dailyTotal = _getDailyReward();
        uint256 userShare = (dailyTotal * userTotalPower[user]) / globalTotalPower;
        uint256 accruedReward = (userShare * timeSinceLastClaim) / 1 days;

        // Cap at remaining
        if (totalReleased + accruedReward > MAX_TOTAL_REWARDS) {
            accruedReward = MAX_TOTAL_REWARDS - totalReleased;
        }

        return pendingRewards[user] + accruedReward;
    }

    /**
     * @notice Get user's locked rewards
     * @param user User address
     * @return Array of locked rewards
     */
    function getLockedRewards(address user) external view returns (LockedReward[] memory) {
        return lockedRewards[user];
    }

    /**
     * @notice Get user's total unlockable rewards (expired locks)
     * @param user User address
     * @return Total unlockable amount
     */
    function getUnlockableRewards(address user) external view returns (uint256) {
        LockedReward[] storage locks = lockedRewards[user];
        uint256 unlockable = 0;

        for (uint256 i = 0; i < locks.length; i++) {
            if (block.timestamp >= locks[i].releaseTime) {
                unlockable += locks[i].amount;
            }
        }

        return unlockable;
    }

    /**
     * @notice Get current daily reward with decay
     * @return Current daily total reward
     */
    function getDailyReward() external view returns (uint256) {
        return _getDailyReward();
    }

    /**
     * @notice Get remaining rewards to be released
     * @return Remaining reward pool amount
     */
    function getRemainingRewards() external view returns (uint256) {
        return MAX_TOTAL_REWARDS - totalReleased;
    }

    /**
     * @notice Get user's referral tree (downlines)
     * @param user User address
     * @return Array of direct downlines
     */
    function getDownlines(address user) external view returns (address[] memory) {
        return downlines[user];
    }

    /**
     * @notice Get global total mining power
     * @return Global total power
     */
    function getGlobalTotalPower() external view returns (uint256) {
        return globalTotalPower;
    }

    /**
     * @notice Get user's total mining power
     * @param user User address
     * @return User's total power
     */
    function getUserTotalPower(address user) external view returns (uint256) {
        return userTotalPower[user];
    }

    /**
     * @notice Get miner count for user
     * @param user User address
     * @return Number of miners
     */
    function getMinerCount(address user) external view returns (uint256) {
        return userMiners[user].length;
    }

    /**
     * @notice Check if miner is active
     * @param user Miner owner
     * @param minerId Miner index
     * @return True if active and not expired
     */
    function isMinerActive(address user, uint256 minerId) external view returns (bool) {
        if (minerId >= userMiners[user].length) return false;
        Miner storage miner = userMiners[user][minerId];
        return miner.active && block.timestamp < miner.renewalTime;
    }

    /**
     * @notice Get total number of registered users
     * @return Total users count
     */
    function getTotalUsers() external view returns (uint256) {
        return allUsers.length;
    }

    /**
     * @notice Get circulating supply (for burn calculation verification)
     * @return Circulating supply amount
     */
    function getCirculatingSupply() external view returns (uint256) {
        uint256 totalSupply = ZAI.totalSupply();
        return totalSupply - totalLockedRewards - burnPool;
    }
}
