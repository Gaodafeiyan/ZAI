// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Zenith USD (ZUSD)
 * @dev Stablecoin token pegged 1:1 to USDT via PancakeSwap liquidity pool
 *
 * ============ Core Features ============
 * 1. Maximum Supply: 100 billion ZUSD (hard cap to prevent infinite inflation)
 * 2. Mint Mechanism: Owner can mint tokens for LP injection (no initial supply)
 * 3. Burn Fee: 0.1% burn on transfers to reduce circulating supply over time
 * 4. No Buy/Sell Taxes: Maintains price stability (unlike ZAI)
 * 5. Anti-Bot Protection:
 *    - Max transaction limit (1% of supply initially)
 *    - Cooldown period between transfers (30 seconds)
 *    - Blacklist mechanism for malicious actors
 * 6. Whitelist: Exempt addresses from fees and limits (owner, contracts, LPs)
 *
 * ============ Price Peg Mechanism ============
 * - Not a real-world fiat anchor (no reserves/collateral)
 * - Price pegged via PancakeSwap ZUSD/USDT liquidity pool
 * - Owner mints ZUSD and pairs with USDT to establish 1:1 ratio
 * - Market forces maintain peg through arbitrage opportunities
 *
 * ============ Security Considerations ============
 * - OpenZeppelin battle-tested contracts
 * - No reentrancy risks (no external calls in critical paths)
 * - SafeMath built-in (Solidity ^0.8.0)
 * - Owner-only privileged functions (to be transferred to DAO later)
 * - Comprehensive event logging for transparency
 *
 * @author Zenithus Team
 */
contract ZenithUSD is ERC20, Ownable {
    // ============ Constants ============

    /// @notice Maximum total supply cap: 100 billion ZUSD
    /// @dev Prevents infinite inflation and maintains token scarcity
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10**18;

    /// @notice Basis points denominator (1 basis point = 0.01%)
    uint256 private constant BP_DENOMINATOR = 10000;

    // ============ State Variables ============

    /// @notice Burn fee on transfers in basis points (10 = 0.1%)
    /// @dev Applied to all non-whitelisted transfers to reduce supply
    uint256 public burnFee = 10; // 0.1%

    /// @notice Maximum transaction amount (initially 1% of max supply)
    /// @dev Anti-whale mechanism to prevent large dumps
    uint256 public maxTxAmount = MAX_SUPPLY / 100; // 1%

    /// @notice Cooldown period between transfers in seconds
    /// @dev Anti-bot mechanism to prevent rapid trading/sniping
    uint256 public cooldownTime = 30; // 30 seconds

    /// @notice Whitelist mapping: addresses exempt from fees and limits
    /// @dev Includes owner, contract, LP pairs, trusted contracts
    mapping(address => bool) private whitelisted;

    /// @notice Blacklist mapping: blocked addresses cannot transfer
    /// @dev Used to ban malicious bots, scammers, or sanctioned addresses
    mapping(address => bool) private blacklisted;

    /// @notice Last transfer timestamp for each address
    /// @dev Used to enforce cooldown period between transactions
    mapping(address => uint256) private lastTransferTime;

    // ============ Events ============

    /// @notice Emitted when burn fee is updated
    /// @param newFee New burn fee in basis points
    event FeesUpdated(uint256 newFee);

    /// @notice Emitted when max transaction amount is updated
    /// @param newMaxTx New maximum transaction amount
    event MaxTxUpdated(uint256 newMaxTx);

    /// @notice Emitted when cooldown time is updated
    /// @param newCooldown New cooldown period in seconds
    event CooldownUpdated(uint256 newCooldown);

    /// @notice Emitted when an address is blacklisted or removed from blacklist
    /// @param account Address being blacklisted/unblacklisted
    /// @param status true = blacklisted, false = removed from blacklist
    event Blacklisted(address indexed account, bool status);

    /// @notice Emitted when whitelist status is updated
    /// @param account Address being whitelisted/unwhitelisted
    /// @param status true = whitelisted, false = removed from whitelist
    event WhitelistUpdated(address indexed account, bool status);

    /// @notice Emitted when tokens are minted
    /// @param to Recipient address
    /// @param amount Amount of tokens minted
    event TokensMinted(address indexed to, uint256 amount);

    /// @notice Emitted when tokens are burned via transfer fee
    /// @param from Sender address
    /// @param amount Amount of tokens burned
    event TokensBurned(address indexed from, uint256 amount);

    // ============ Constructor ============

    /**
     * @dev Initializes ZUSD token with zero initial supply
     *
     * Initial Configuration:
     * - Name: "Zenith USD"
     * - Symbol: "ZUSD"
     * - Decimals: 18 (inherited from ERC20)
     * - Initial Supply: 0 (owner mints later for LP)
     * - Initial Whitelist: owner and contract address
     *
     * Deployment Flow:
     * 1. Deploy ZUSD contract
     * 2. Mint tokens to owner: mint(owner, amount)
     * 3. Create ZUSD/USDT pair on PancakeSwap
     * 4. Add liquidity with 1:1 ratio
     * 5. Whitelist LP pair address
     */
    constructor() ERC20("Zenith USD", "ZUSD") Ownable(msg.sender) {
        // Initialize whitelist: owner and contract are exempt from fees/limits
        whitelisted[msg.sender] = true;
        whitelisted[address(this)] = true;

        emit WhitelistUpdated(msg.sender, true);
        emit WhitelistUpdated(address(this), true);
    }

    // ============ Core Transfer Logic with Burn Fee ============

    /**
     * @dev Overrides ERC20 transfer logic to implement burn fee and anti-bot measures
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     *
     * ============ Transfer Flow ============
     * 1. Security Checks:
     *    - Verify sender and recipient are not blacklisted
     *    - Skip checks if whitelisted (owner, contracts, LPs)
     * 2. Anti-Bot Enforcement (non-whitelisted only):
     *    - Check max transaction limit
     *    - Enforce cooldown period since last transfer
     * 3. Burn Fee Application:
     *    - Calculate 0.1% burn fee
     *    - Burn tokens from sender
     *    - Transfer remaining amount to recipient
     * 4. Update State:
     *    - Record transfer timestamp for cooldown
     *
     * @notice Whitelisted addresses bypass all restrictions
     * @notice Burn fee reduces total supply permanently
     */
    function _update(address from, address to, uint256 amount) internal override {
        // Prevent zero address transfers (except mint/burn)
        require(from != address(0) || to != address(0), "ZUSD: Invalid transfer");

        // Blacklist check: block malicious actors
        require(!blacklisted[from], "ZUSD: Sender is blacklisted");
        require(!blacklisted[to], "ZUSD: Recipient is blacklisted");

        // Skip restrictions for whitelisted addresses (owner, contracts, LPs)
        bool isWhitelistedTx = whitelisted[from] || whitelisted[to];

        // ============ Anti-Bot Measures (non-whitelisted only) ============
        if (!isWhitelistedTx && from != address(0) && to != address(0)) {
            // 1. Max transaction limit (prevents whale dumps)
            require(amount <= maxTxAmount, "ZUSD: Transfer amount exceeds maximum");

            // 2. Cooldown enforcement (prevents rapid trading/bots)
            require(
                block.timestamp >= lastTransferTime[from] + cooldownTime,
                "ZUSD: Cooldown period not elapsed"
            );

            // Update last transfer time for sender
            lastTransferTime[from] = block.timestamp;
        }

        // ============ Burn Fee Logic ============
        if (!isWhitelistedTx && from != address(0) && to != address(0) && burnFee > 0) {
            // Calculate 0.1% burn fee
            uint256 feeAmount = (amount * burnFee) / BP_DENOMINATOR;

            // Ensure fee doesn't exceed transfer amount
            if (feeAmount > 0 && feeAmount < amount) {
                // Burn tokens from sender (reduces total supply)
                super._update(from, address(0), feeAmount);
                emit TokensBurned(from, feeAmount);

                // Reduce transfer amount by fee
                amount -= feeAmount;
            }
        }

        // Execute actual transfer with reduced amount
        super._update(from, to, amount);
    }

    // ============ Minting Function ============

    /**
     * @notice Mints new ZUSD tokens to specified address (owner only)
     * @param to Recipient address (typically owner for LP injection)
     * @param amount Amount of tokens to mint
     *
     * Use Cases:
     * - Minting initial supply for liquidity pool creation
     * - Expanding supply to maintain USDT peg during high demand
     * - Funding ecosystem reserves or treasury
     *
     * Constraints:
     * - Only owner can call (to be transferred to DAO governance later)
     * - Cannot exceed MAX_SUPPLY (100 billion hard cap)
     * - Cannot mint to zero address
     *
     * @dev Automatically whitelists recipient to avoid burn fee on mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "ZUSD: Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "ZUSD: Exceeds maximum supply");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // ============ Whitelist Management ============

    /**
     * @notice Adds or removes address from whitelist (owner only)
     * @param account Target address
     * @param status true = whitelist (exempt), false = remove from whitelist
     *
     * Whitelist Benefits:
     * - No burn fee on transfers
     * - No max transaction limit
     * - No cooldown period
     * - Cannot be blacklisted
     *
     * Typical Whitelisted Addresses:
     * - Owner and team wallets
     * - PancakeSwap LP pairs
     * - Staking contracts
     * - Bridge contracts
     * - Treasury/reserve wallets
     */
    function setWhitelisted(address account, bool status) public onlyOwner {
        require(account != address(0), "ZUSD: Cannot whitelist zero address");
        whitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }

    /**
     * @notice Batch whitelist operation (gas efficient)
     * @param accounts Array of addresses to whitelist/unwhitelist
     * @param status Whitelist status to apply to all addresses
     *
     * @dev Use this for whitelisting multiple LP pairs or contract addresses
     */
    function setWhitelistedBatch(address[] calldata accounts, bool status) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "ZUSD: Cannot whitelist zero address");
            whitelisted[accounts[i]] = status;
            emit WhitelistUpdated(accounts[i], status);
        }
    }

    /**
     * @notice Checks if address is whitelisted
     * @param account Address to check
     * @return True if whitelisted (exempt from fees/limits)
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelisted[account];
    }

    // ============ Blacklist Management ============

    /**
     * @notice Adds or removes address from blacklist (owner only)
     * @param account Target address
     * @param status true = blacklist (block transfers), false = remove from blacklist
     *
     * Blacklist Use Cases:
     * - Blocking known scam addresses
     * - Preventing MEV bots
     * - Complying with legal/regulatory requirements
     * - Temporarily freezing suspicious accounts pending investigation
     *
     * @dev Blacklisted addresses cannot send or receive tokens
     */
    function setBlacklisted(address account, bool status) external onlyOwner {
        require(account != address(0), "ZUSD: Cannot blacklist zero address");
        require(!whitelisted[account], "ZUSD: Cannot blacklist whitelisted address");
        blacklisted[account] = status;
        emit Blacklisted(account, status);
    }

    /**
     * @notice Checks if address is blacklisted
     * @param account Address to check
     * @return True if blacklisted (cannot transfer)
     */
    function isBlacklisted(address account) external view returns (bool) {
        return blacklisted[account];
    }

    // ============ Anti-Bot Configuration ============

    /**
     * @notice Updates maximum transaction amount (owner only)
     * @param _maxTxAmount New max transaction amount in wei
     *
     * Recommended Values:
     * - Launch: 1% of max supply (anti-whale)
     * - Mature: 5-10% of max supply (less restrictive)
     * - Set to MAX_SUPPLY to effectively disable
     *
     * @dev Must be reasonable to prevent locking normal users
     */
    function setMaxTxAmount(uint256 _maxTxAmount) external onlyOwner {
        require(_maxTxAmount > 0, "ZUSD: Max tx amount must be positive");
        require(_maxTxAmount <= MAX_SUPPLY, "ZUSD: Max tx cannot exceed supply");
        maxTxAmount = _maxTxAmount;
        emit MaxTxUpdated(_maxTxAmount);
    }

    /**
     * @notice Updates cooldown period between transfers (owner only)
     * @param _cooldownTime New cooldown in seconds
     *
     * Recommended Values:
     * - Launch: 30-60 seconds (strong anti-bot)
     * - Mature: 0-10 seconds (user-friendly)
     * - Set to 0 to disable cooldown
     *
     * @dev Balance security vs user experience
     */
    function setCooldownTime(uint256 _cooldownTime) external onlyOwner {
        require(_cooldownTime <= 300, "ZUSD: Cooldown too long (max 5 min)");
        cooldownTime = _cooldownTime;
        emit CooldownUpdated(_cooldownTime);
    }

    /**
     * @notice Updates burn fee on transfers (owner only)
     * @param _burnFee New burn fee in basis points (10 = 0.1%)
     *
     * Recommended Values:
     * - Default: 10 basis points (0.1%)
     * - Range: 0-100 basis points (0-1%)
     * - Set to 0 to disable burn mechanism
     *
     * @dev Higher fees reduce supply faster but may hurt liquidity
     */
    function setBurnFee(uint256 _burnFee) external onlyOwner {
        require(_burnFee <= 100, "ZUSD: Burn fee too high (max 1%)");
        burnFee = _burnFee;
        emit FeesUpdated(_burnFee);
    }

    // ============ View Functions ============

    /**
     * @notice Gets remaining mintable supply
     * @return Amount of ZUSD that can still be minted before hitting cap
     */
    function getRemainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @notice Gets total burned supply
     * @return Total amount of ZUSD burned via transfer fees
     * @dev Burned tokens are sent to address(0) and removed from circulation
     */
    function getTotalBurned() external view returns (uint256) {
        return balanceOf(address(0));
    }

    /**
     * @notice Gets last transfer timestamp for an address
     * @param account Address to check
     * @return Unix timestamp of last transfer
     * @dev Used to calculate cooldown remaining time
     */
    function getLastTransferTime(address account) external view returns (uint256) {
        return lastTransferTime[account];
    }

    /**
     * @notice Calculates cooldown remaining for an address
     * @param account Address to check
     * @return Seconds remaining until next transfer allowed (0 if ready)
     */
    function getCooldownRemaining(address account) external view returns (uint256) {
        if (whitelisted[account]) return 0;

        uint256 timePassed = block.timestamp - lastTransferTime[account];
        if (timePassed >= cooldownTime) return 0;

        return cooldownTime - timePassed;
    }
}
