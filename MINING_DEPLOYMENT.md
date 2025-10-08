# Zenithus Mining Contract Deployment Guide

## Overview
The Zenithus Mining contract implements a virtual Proof-of-AI-Compute (PoAIC) staking system where users buy "virtual miners" by staking ZAI tokens and earn rewards based on their mining power share.

**Key Features:**
- Virtual miners with power proportional to staked ZAI
- Exponential decay reward distribution (9M ZAI over ~10 years)
- 3-level referral system (5% L1, 3% L2, 1% L3)
- Annual miner renewals with burns
- 70% immediate + 30% locked (30 days) reward structure

---

## Prerequisites

### 1. Deployed Contracts
- ✅ **ZAI Token** deployed and verified
- ✅ Marketing wallet address configured
- ✅ Operational wallet address configured

### 2. Owner Requirements
- **ZAI Balance**: 9,000,000 ZAI (for reward pool funding)
- **BNB Balance**: ~0.1 BNB (for deployment gas)

### 3. Environment Setup
```bash
# Install dependencies (if not already done)
npm install

# Configure .env file
PRIVATE_KEY=your_deployer_private_key
BSCSCAN_API_KEY=your_bscscan_api_key
```

---

## Deployment Steps

### Step 1: Update Deployment Script

Edit `scripts/deploy-mining.js` and update these addresses:

```javascript
const ZAI_ADDRESS = "0x..."; // Your deployed ZAI contract address
const MARKETING_WALLET = "0x786849bB473d78CA06DbB8224D768E2900Ad3809";
const OPERATIONAL_WALLET = "0x..."; // Your operational wallet address
```

---

### Step 2: Deploy to BSC Testnet (Recommended First)

```bash
# Compile contracts
npx hardhat compile

# Run tests (IMPORTANT!)
npx hardhat test test/Mining.test.js

# Deploy to testnet
npx hardhat run scripts/deploy-mining.js --network bscTestnet
```

**Expected Output:**
```
====================================
Deploying Zenithus Mining Contract
====================================

Deployer: 0x...
BNB Balance: 0.5 BNB

✅ Mining Contract Deployed!
Contract Address: 0x...
Transaction Hash: 0x...
```

**Save the contract address!** You'll need it for all subsequent steps.

---

### Step 3: Verify Contract on BSCScan

```bash
npx hardhat verify --network bscTestnet MINING_CONTRACT_ADDRESS \
  "ZAI_CONTRACT_ADDRESS" \
  "MARKETING_WALLET_ADDRESS" \
  "OPERATIONAL_WALLET_ADDRESS"
```

**Example:**
```bash
npx hardhat verify --network bscTestnet 0x123... \
  "0xABC..." \
  "0x786849bB473d78CA06DbB8224D768E2900Ad3809" \
  "0xDEF..."
```

---

### Step 4: Fund Reward Pool (9M ZAI)

**Why 9M ZAI?**
- Total reward pool for mining rewards over ~10 years
- Distributed via exponential decay (initial ~9,037 ZAI/day)

**Method 1: Via Hardhat Console (Recommended)**

```bash
npx hardhat console --network bscTestnet
```

Then in console:
```javascript
// Get contract instances
const ZAI = await ethers.getContractAt("ZenithAI", "ZAI_CONTRACT_ADDRESS");
const Mining = await ethers.getContractAt("ZenithMining", "MINING_CONTRACT_ADDRESS");

// Check your ZAI balance
const balance = await ZAI.balanceOf("YOUR_ADDRESS");
console.log("Your ZAI:", ethers.formatEther(balance));

// Approve Mining contract to spend 9M ZAI
await ZAI.approve(await Mining.getAddress(), ethers.parseEther("9000000"));

// Fund reward pool
await Mining.fundRewardPool(ethers.parseEther("9000000"));

// Verify funding
const remaining = await Mining.getRemainingRewards();
console.log("Reward Pool:", ethers.formatEther(remaining), "ZAI");
```

**Method 2: Via BSCScan (Easier for Non-Developers)**

1. Go to ZAI contract on BSCScan → "Write Contract"
2. Connect your wallet (owner wallet with 9M ZAI)
3. Call `approve` function:
   - `spender`: Mining contract address
   - `amount`: `9000000000000000000000000` (9M with 18 decimals)
4. Go to Mining contract → "Write Contract"
5. Call `fundRewardPool` function:
   - `amount`: `9000000000000000000000000`
6. Wait for transaction confirmation
7. Verify on "Read Contract" → `getRemainingRewards()` shows 9M

---

### Step 5: Post-Deployment Configuration

#### 5.1 Whitelist Marketing/Operational Wallets (Optional)

If you want wallets to buy miners without fees:

```javascript
await Mining.setWhitelisted("MARKETING_WALLET", true);
await Mining.setWhitelisted("OPERATIONAL_WALLET", true);
```

*(Not recommended initially - wallets should participate normally)*

---

### Step 6: Test User Flow

**Test Scenario: User Buys First Miner**

```javascript
// As a test user
const testUser = "0x..."; // Test wallet address

// 1. User approves Mining contract to spend ZAI
const ZAI = await ethers.getContractAt("ZenithAI", ZAI_ADDRESS);
await ZAI.connect(testUserSigner).approve(MINING_ADDRESS, ethers.MaxUint256);

// 2. User buys miner (minimum 500 ZAI)
const Mining = await ethers.getContractAt("ZenithMining", MINING_ADDRESS);
await Mining.connect(testUserSigner).buyMiner(
    ethers.parseEther("1000"), // 1000 ZAI
    ethers.ZeroAddress          // No referrer
);

// 3. Verify miner created
const miners = await Mining.getUserMiners(testUser);
console.log("Miners:", miners);
console.log("Power:", ethers.formatEther(miners[0].powerLevel));

// 4. Check global state
console.log("Global Power:", await Mining.getGlobalTotalPower());
console.log("Daily Reward:", await Mining.getDailyReward());
```

---

### Step 7: Monitor After Launch

**Key Metrics to Track:**

```javascript
// Global metrics
const globalPower = await Mining.getGlobalTotalPower();
const dailyReward = await Mining.getDailyReward();
const totalReleased = await Mining.totalReleased();
const remaining = await Mining.getRemainingRewards();
const burnPool = await Mining.burnPool();

console.log("Global Power:", ethers.formatEther(globalPower));
console.log("Daily Reward:", ethers.formatEther(dailyReward), "ZAI/day");
console.log("Released:", ethers.formatEther(totalReleased), "ZAI");
console.log("Remaining:", ethers.formatEther(remaining), "ZAI");
console.log("Burn Pool:", ethers.formatEther(burnPool), "ZAI");

// User metrics
const userPower = await Mining.getUserTotalPower(userAddress);
const pending = await Mining.getPendingRewards(userAddress);
const locked = await Mining.getLockedRewards(userAddress);

console.log("User Power:", ethers.formatEther(userPower));
console.log("Pending:", ethers.formatEther(pending), "ZAI");
console.log("Locked Rewards:", locked.length);
```

---

## Testing Checklist

### Pre-Deployment Tests (Testnet)

- [ ] Deploy Mining contract successfully
- [ ] Verify on BSCScan
- [ ] Fund reward pool (9M ZAI)
- [ ] Buy miner (minimum 500 ZAI)
- [ ] Verify power allocation
- [ ] Check fee distribution (burn/marketing/operational)
- [ ] Wait 24 hours and check reward accrual
- [ ] Claim rewards (70/30 split)
- [ ] Wait 30 days and claim locked rewards
- [ ] Test referral system (3 levels)
- [ ] Test miner upgrade
- [ ] Test miner renewal (after 335 days)
- [ ] Test annual burn
- [ ] Deactivate expired miner

---

## Detailed Test Scenarios

### Test 1: Buy Miner with Fees

```javascript
const buyAmount = ethers.parseEther("1000"); // 1000 ZAI

// Before
const balanceBefore = await ZAI.balanceOf(userAddress);
const marketingBefore = await ZAI.balanceOf(marketingWallet);
const operationalBefore = await ZAI.balanceOf(operationalWallet);

// Buy miner
await Mining.connect(user).buyMiner(buyAmount, ethers.ZeroAddress);

// After
const balanceAfter = await ZAI.balanceOf(userAddress);
const marketingAfter = await ZAI.balanceOf(marketingWallet);
const operationalAfter = await ZAI.balanceOf(operationalWallet);
const burnPool = await Mining.burnPool();

// Verify
const totalFee = buyAmount / 10n; // 10%
console.assert(burnPool === totalFee * 50n / 100n, "Burn pool 50%");
console.assert(marketingAfter - marketingBefore === totalFee * 30n / 100n, "Marketing 30%");
console.assert(operationalAfter - operationalBefore === totalFee * 20n / 100n, "Operational 20%");

// Verify miner power
const miners = await Mining.getUserMiners(userAddress);
const expectedPower = buyAmount - totalFee;
console.assert(miners[0].powerLevel === expectedPower, "Power = 900 ZAI");
```

---

### Test 2: Reward Calculation and Claiming

```javascript
// Buy miner
await Mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

// Wait 7 days
await time.increase(7 * 24 * 60 * 60);

// Check pending rewards
const pending = await Mining.getPendingRewards(user1.address);
console.log("Pending after 7 days:", ethers.formatEther(pending), "ZAI");

// Claim rewards
const balanceBefore = await ZAI.balanceOf(user1.address);
await Mining.connect(user1).claimRewards();
const balanceAfter = await ZAI.balanceOf(user1.address);

// Verify 70% unlocked
const unlocked = balanceAfter - balanceBefore;
const expectedUnlocked = (pending * 70n) / 100n;
console.assert(unlocked === expectedUnlocked, "70% unlocked");

// Verify 30% locked
const lockedRewards = await Mining.getLockedRewards(user1.address);
console.log("Locked:", ethers.formatEther(lockedRewards[0].amount), "ZAI");
console.assert(lockedRewards.length === 1, "1 locked entry");

// Wait 31 days
await time.increase(31 * 24 * 60 * 60);

// Claim locked
const unlockable = await Mining.getUnlockableRewards(user1.address);
await Mining.connect(user1).claimLockedRewards();

// Verify received
console.assert(unlockable > 0, "Locked rewards unlocked");
```

---

### Test 3: Referral System (3 Levels)

```javascript
// Build referral tree: user2 -> user1 -> user3 -> user4
await Mining.connect(user1).buyMiner(MIN_MINER, user2.address);
await Mining.connect(user3).buyMiner(MIN_MINER, user1.address);
await Mining.connect(user4).buyMiner(MIN_MINER, user3.address);

// All referrers must have miners to receive bonuses
await Mining.connect(user2).buyMiner(MIN_MINER, ethers.ZeroAddress);

// Wait for rewards
await time.increase(7 * 24 * 60 * 60);

// user4 claims (triggers referral cascade)
const user1PendingBefore = await Mining.getPendingRewards(user1.address);
const user2PendingBefore = await Mining.getPendingRewards(user2.address);
const user3PendingBefore = await Mining.getPendingRewards(user3.address);

const user4Pending = await Mining.getPendingRewards(user4.address);
await Mining.connect(user4).claimRewards();

// Verify referral rewards
const user3Reward = (await Mining.getPendingRewards(user3.address)) - user3PendingBefore; // L1: 5%
const user1Reward = (await Mining.getPendingRewards(user1.address)) - user1PendingBefore; // L2: 3%
const user2Reward = (await Mining.getPendingRewards(user2.address)) - user2PendingBefore; // L3: 1%

console.log("L1 (user3):", ethers.formatEther(user3Reward), "ZAI (~5%)");
console.log("L2 (user1):", ethers.formatEther(user1Reward), "ZAI (~3%)");
console.log("L3 (user2):", ethers.formatEther(user2Reward), "ZAI (~1%)");
```

---

### Test 4: Miner Renewal

```javascript
// Buy miner
await Mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

// Fast forward to 335 days (30 days before expiry)
await time.increase(335 * 24 * 60 * 60);

// Renew miner (10% of purchase price)
const renewalFee = ethers.parseEther("1000") / 10n; // 100 ZAI
await Mining.connect(user1).renewMiner(0);

// Verify extended
const miners = await Mining.getUserMiners(user1.address);
const renewalTime = miners[0].renewalTime;
console.log("New renewal time:", new Date(Number(renewalTime) * 1000));

// Verify still active after renewal
console.assert(miners[0].active, "Miner active after renewal");
```

---

### Test 5: Exponential Decay

```javascript
// Day 0
const day0Reward = await Mining.getDailyReward();
console.log("Day 0:", ethers.formatEther(day0Reward), "ZAI");

// Day 1
await time.increase(1 * 24 * 60 * 60);
const day1Reward = await Mining.getDailyReward();
console.log("Day 1:", ethers.formatEther(day1Reward), "ZAI");

// Verify decay (should be ~99.9% of previous)
const decayRatio = (day1Reward * 1000n) / day0Reward;
console.assert(decayRatio >= 998n && decayRatio <= 1000n, "Decay ~0.999");

// Day 365
await time.increase(364 * 24 * 60 * 60);
const day365Reward = await Mining.getDailyReward();
console.log("Day 365:", ethers.formatEther(day365Reward), "ZAI");

// After 1 year, should be significantly lower
console.assert(day365Reward < day0Reward / 2n, "Halved after ~1 year");
```

---

## Mainnet Deployment Checklist

### Pre-Launch
- [ ] All tests passing on testnet
- [ ] Contract verified on BSCScan
- [ ] 9M ZAI prepared for reward pool
- [ ] Marketing/operational wallets configured
- [ ] Gas price checked (deploy during low traffic)
- [ ] Announcement materials ready
- [ ] Community informed

### Launch Day
- [ ] Deploy Mining contract
- [ ] Verify on BSCScan immediately
- [ ] Fund reward pool (9M ZAI)
- [ ] Test buy miner with small amount
- [ ] Monitor first users
- [ ] Announce contract address

### Post-Launch (Week 1)
- [ ] Monitor global power growth
- [ ] Check reward distribution accuracy
- [ ] Verify fee allocation working
- [ ] Track burn pool accumulation
- [ ] Engage with community
- [ ] Address any issues quickly

### Ongoing Maintenance
- [ ] Execute annual burns (when pool >100K ZAI)
- [ ] Monitor difficulty adjustments (every 14 days)
- [ ] Track total released vs remaining
- [ ] Deactivate expired miners (community can help)
- [ ] Consider parameter adjustments if needed

---

## Parameter Adjustment Guide

### When to Adjust Decay Rate

**Scenario**: Rewards depleting too fast or too slow

```javascript
// Current: 0.999 daily decay
// Slower decay (longer distribution): 0.9995
// Faster decay (shorter distribution): 0.998

await Mining.setDecayParams(
    ethers.parseEther("9037"),   // Keep initial daily same
    ethers.parseEther("0.9995"), // New decay rate
    await Mining.startTimestamp() // Keep start time same
);
```

---

### When to Adjust Fee Allocation

**Scenario**: Need more burns vs marketing funds

```javascript
// Current: 50% burn, 30% marketing, 20% operational
// More burns: 70% burn, 20% marketing, 10% operational

await Mining.setFeeAllocation(
    7000, // 70% burn
    2000, // 20% marketing
    1000  // 10% operational
);
```

---

## Security Best Practices

### 1. Ownership Management
```javascript
// Transfer ownership to multisig wallet (recommended)
await Mining.transferOwnership(MULTISIG_ADDRESS);

// Or renounce ownership (ONLY if fully decentralized)
// await Mining.renounceOwnership(); // DANGEROUS - can't update params!
```

### 2. Regular Audits
- Monitor reward pool balance
- Check for unusual power spikes
- Review referral patterns for abuse
- Track burn pool accumulation

### 3. Emergency Response
- Have multisig ready for parameter adjustments
- Prepare communication channels
- Document incident response plan

---

## Troubleshooting

### Issue: Reward pool depleting faster than expected
**Solution:**
- Check `totalReleased` vs `getRemainingRewards()`
- Adjust decay rate to slow distribution
- Consider adding more ZAI to pool

### Issue: User can't claim rewards
**Possible Causes:**
1. No pending rewards: Check `getPendingRewards()`
2. Insufficient pool balance: Fund more ZAI
3. Gas issues: Increase gas limit

### Issue: Referral not receiving bonuses
**Check:**
- Referrer has active miner: `isMinerActive(referrer, 0)`
- Referrer not expired: Check `renewalTime`
- Referral relationship set: `referrer(downline) == referrerAddress`

### Issue: Miner renewal fails
**Check:**
- User has sufficient ZAI for 10% fee
- User approved Mining contract
- Renewal time window (30 days before expiry)

---

## Contract Addresses (Update After Deployment)

### BSC Testnet
- **ZAI Token**: `0x...`
- **Mining Contract**: `0x...`
- **Marketing Wallet**: `0x786849bB473d78CA06DbB8224D768E2900Ad3809`
- **Operational Wallet**: `0x...`

### BSC Mainnet
- **ZAI Token**: `0x...`
- **Mining Contract**: `0x...`
- **Marketing Wallet**: `0x786849bB473d78CA06DbB8224D768E2900Ad3809`
- **Operational Wallet**: `0x...`

---

## Resources

- **BSC Testnet Explorer**: https://testnet.bscscan.com/
- **BSC Mainnet Explorer**: https://bscscan.com/
- **Hardhat Docs**: https://hardhat.org/docs
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/

---

## Support

For technical issues or questions:
- GitHub Issues: https://github.com/Gaodafeiyan/ZAI/issues
- Community: [Telegram/Discord links]
- Email: dev@zenithus.io

---

**Good luck with your deployment! 🚀**

**Remember**: Test thoroughly on testnet before mainnet deployment!
