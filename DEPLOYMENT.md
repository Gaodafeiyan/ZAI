# ZUSD Deployment Guide

## Overview
ZUSD (Zenith USD) is a BEP-20 stablecoin pegged 1:1 to USDT via PancakeSwap liquidity pool. This guide covers deployment on BSC testnet and mainnet.

---

## Prerequisites

### 1. Development Environment
```bash
# Install dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv
```

### 2. Wallet Setup
- **Private Key**: Export from MetaMask (Settings → Security → Export Private Key)
- **BNB Balance**:
  - Testnet: Get from https://testnet.binance.org/faucet-smart
  - Mainnet: At least 0.1 BNB for deployment + verification

### 3. API Keys
- **BSCScan API Key**: Get from https://bscscan.com/myapikey
- Save in `.env` file (see `.env.example`)

---

## Deployment Steps

### Step 1: Configure Environment

Create `.env` file in project root:
```env
PRIVATE_KEY=your_wallet_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

⚠️ **Security Warning**: Never commit `.env` to Git! Add to `.gitignore`.

---

### Step 2: Deploy on BSC Testnet (Recommended First)

```bash
# Compile contracts
npx hardhat compile

# Run tests locally
npx hardhat test

# Deploy to BSC testnet
npx hardhat run scripts/deploy-zusd.js --network bscTestnet
```

**Expected Output:**
```
====================================
Deploying ZenithUSD (ZUSD) Token
====================================

Deployer: 0x...
Balance: 1.5 BNB

✅ ZUSD deployed at: 0x...
Transaction hash: 0x...
```

**Save the contract address!** You'll need it for verification and LP creation.

---

### Step 3: Verify Contract on BSCScan

```bash
# Verify on testnet
npx hardhat verify --network bscTestnet ZUSD_CONTRACT_ADDRESS

# Verify on mainnet (after mainnet deployment)
npx hardhat verify --network bsc ZUSD_CONTRACT_ADDRESS
```

**Verification Benefits:**
- ✅ Users can read contract code
- ✅ Interact via BSCScan UI
- ✅ Increased trust and transparency

---

### Step 4: Post-Deployment Configuration

#### 4.1 Mint Initial Supply for Liquidity Pool

**Recommended Initial Mint:**
- **Testnet**: 1,000,000 ZUSD (for testing)
- **Mainnet**: 10,000,000 - 50,000,000 ZUSD (depends on initial liquidity)

**Using Hardhat Console:**
```bash
npx hardhat console --network bscTestnet

# In console:
const ZUSD = await ethers.getContractFactory("ZenithUSD");
const zusd = await ZUSD.attach("ZUSD_CONTRACT_ADDRESS");

// Mint 1M ZUSD to owner
await zusd.mint("YOUR_WALLET_ADDRESS", ethers.parseEther("1000000"));
```

**Using BSCScan:**
1. Go to contract page → "Write Contract"
2. Connect wallet
3. Call `mint` function:
   - `to`: Your wallet address
   - `amount`: `1000000000000000000000000` (1M ZUSD with 18 decimals)

---

#### 4.2 Create PancakeSwap Liquidity Pool

**Manual LP Creation Steps:**

1. **Get USDT on BSC:**
   - Testnet: Use faucet or swap BNB → USDT on PancakeSwap testnet
   - Mainnet: Buy USDT on Binance, withdraw to BSC wallet

2. **Create ZUSD/USDT Pair:**
   - Go to https://pancakeswap.finance/add (mainnet) or testnet equivalent
   - Select ZUSD (paste contract address)
   - Select USDT (auto-detects)
   - Enter amounts in **1:1 ratio** (e.g., 10,000 ZUSD + 10,000 USDT)
   - Click "Supply" and confirm transactions

3. **Get LP Pair Address:**
   ```bash
   # On PancakeSwap Factory contract
   const factory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"; // BSC mainnet
   const factoryContract = await ethers.getContractAt("IPancakeFactory", factory);
   const pairAddress = await factoryContract.getPair(zusdAddress, usdtAddress);
   console.log("LP Pair:", pairAddress);
   ```

4. **Whitelist LP Pair (Important!):**
   ```javascript
   await zusd.setWhitelisted(pairAddress, true);
   ```

   **Why whitelist LP?**
   - LP needs to transfer large amounts (exceeds maxTx)
   - No burn fee on LP operations (maintains peg)
   - No cooldown for smooth trading

---

#### 4.3 Configure Anti-Bot Settings (Optional Adjustments)

**Initial Settings (Already Set):**
```javascript
// Default values in contract:
burnFee = 10;           // 0.1%
maxTxAmount = MAX_SUPPLY / 100; // 1% of max supply
cooldownTime = 30;      // 30 seconds
```

**Adjust if Needed:**
```javascript
// Reduce max tx limit during launch (anti-whale)
await zusd.setMaxTxAmount(ethers.parseEther("500000")); // 500K ZUSD max

// Increase cooldown for stronger bot protection
await zusd.setCooldownTime(60); // 60 seconds

// Reduce burn fee if hurting liquidity
await zusd.setBurnFee(5); // 0.05%
```

**Recommended Timeline:**
- **Launch (Week 1)**: Strict limits (1% maxTx, 30s cooldown)
- **Mature (Month 1+)**: Relax limits (5% maxTx, 10s cooldown)

---

#### 4.4 Whitelist Important Addresses

```javascript
// Whitelist staking contract (when deployed)
await zusd.setWhitelisted(stakingContractAddress, true);

// Whitelist marketing/treasury wallet
await zusd.setWhitelisted("0x...", true);

// Batch whitelist multiple addresses
await zusd.setWhitelistedBatch([addr1, addr2, addr3], true);
```

---

### Step 5: Deploy on BSC Mainnet

⚠️ **Before Mainnet Deployment:**
- ✅ Test all functions on testnet
- ✅ Run full test suite (`npx hardhat test`)
- ✅ Have sufficient BNB (~0.1 BNB)
- ✅ Double-check contract code
- ✅ Prepare USDT for LP (enough to maintain peg)

```bash
# Deploy to mainnet
npx hardhat run scripts/deploy-zusd.js --network bsc

# Verify immediately
npx hardhat verify --network bsc ZUSD_CONTRACT_ADDRESS
```

---

## Testing Checklist

### Pre-Deployment Tests (Local)
```bash
npx hardhat test
```

**Test Coverage:**
- ✅ Minting with max supply cap
- ✅ Burn fee application (0.1%)
- ✅ Whitelist bypasses restrictions
- ✅ Blacklist prevents transfers
- ✅ Max transaction limit enforcement
- ✅ Cooldown period enforcement
- ✅ Owner-only function access control

---

### Post-Deployment Tests (Testnet)

#### Test 1: Mint Tokens
```javascript
await zusd.mint(ownerAddress, ethers.parseEther("1000000"));
// ✅ Owner balance increases
// ✅ Total supply updates
```

#### Test 2: Transfer with Burn Fee
```javascript
// Send ZUSD to non-whitelisted address
await zusd.transfer(user1Address, ethers.parseEther("1000"));

// User1 sends to user2 (should have 0.1% burn)
await zusd.connect(user1).transfer(user2Address, ethers.parseEther("1000"));

// Check user2 balance: should be 999 ZUSD (1000 - 0.1%)
// Check burned: should be 1 ZUSD
```

#### Test 3: Max Transaction Limit
```javascript
// Try to send more than maxTxAmount
const maxTx = await zusd.maxTxAmount();
await zusd.transfer(user1Address, maxTx + ethers.parseEther("1"));
// ❌ Should revert with "Transfer amount exceeds maximum"
```

#### Test 4: Cooldown Period
```javascript
await zusd.transfer(user1Address, ethers.parseEther("100"));
await zusd.connect(user1).transfer(user2Address, ethers.parseEther("50"));

// Try immediately again
await zusd.connect(user1).transfer(user2Address, ethers.parseEther("50"));
// ❌ Should revert with "Cooldown period not elapsed"

// Wait 30 seconds, retry
await sleep(30000);
await zusd.connect(user1).transfer(user2Address, ethers.parseEther("50"));
// ✅ Should succeed
```

#### Test 5: Blacklist Functionality
```javascript
await zusd.setBlacklisted(badActorAddress, true);
await zusd.transfer(badActorAddress, ethers.parseEther("100"));
// ❌ Should revert with "Recipient is blacklisted"
```

#### Test 6: Whitelist Bypass
```javascript
await zusd.setWhitelisted(lpPairAddress, true);

// LP transfers large amount (exceeds maxTx)
await zusd.transfer(lpPairAddress, ethers.parseEther("50000000"));
// ✅ Should succeed (whitelist bypasses limit)

// No burn fee applied
const lpBalance = await zusd.balanceOf(lpPairAddress);
// ✅ Should equal full transfer amount (no burn)
```

---

## Mainnet Deployment Checklist

### Pre-Launch
- [ ] Contract code audited (optional but recommended)
- [ ] All tests passing
- [ ] Testnet deployment successful
- [ ] Gas price checked (deploy during low traffic)
- [ ] USDT ready for LP (minimum 10K USDT recommended)
- [ ] Marketing materials prepared
- [ ] Community announcements ready

### Launch Day
- [ ] Deploy ZUSD contract
- [ ] Verify on BSCScan
- [ ] Mint initial supply
- [ ] Create ZUSD/USDT LP on PancakeSwap
- [ ] Whitelist LP pair address
- [ ] Test buy/sell on PancakeSwap
- [ ] Monitor price stability
- [ ] Announce contract address

### Post-Launch (24 hours)
- [ ] Monitor trading volume
- [ ] Check for bot activity (blacklist if needed)
- [ ] Verify burn fee working
- [ ] Adjust maxTx/cooldown if needed
- [ ] Engage with community
- [ ] Provide liquidity support if peg deviates

---

## Security Best Practices

### 1. Private Key Management
- ❌ Never share private key
- ❌ Never commit `.env` to Git
- ✅ Use hardware wallet for mainnet
- ✅ Store backup securely offline

### 2. Contract Ownership
- ✅ Transfer ownership to multisig wallet (post-launch)
- ✅ Eventually transfer to DAO governance
- ❌ Don't use personal wallet as permanent owner

### 3. Whitelist Management
- ✅ Whitelist only trusted contracts
- ✅ Review whitelist regularly
- ❌ Don't whitelist unknown addresses

### 4. Blacklist Usage
- ✅ Blacklist confirmed scammers/bots
- ✅ Document reasons for blacklisting
- ❌ Don't abuse for censorship

---

## Troubleshooting

### Issue: Deployment fails with "insufficient funds"
**Solution:** Add more BNB to deployer wallet (~0.1 BNB minimum)

### Issue: Verification fails on BSCScan
**Solution:**
```bash
# Use flatten tool
npx hardhat flatten contracts/ZUSD.sol > ZUSD-flat.sol

# Verify manually on BSCScan with flattened code
```

### Issue: LP pair creation fails
**Solution:**
- Ensure ZUSD approval for PancakeSwap router
- Check USDT balance sufficient
- Try increasing gas limit

### Issue: Transfer reverts with "Cooldown period not elapsed"
**Solution:**
- Wait for cooldown period to pass
- Whitelist address if legitimate user
- Reduce cooldown time: `setCooldownTime(10)`

---

## Contract Addresses (Update After Deployment)

### BSC Testnet
- **ZUSD Contract**: `0x...` (to be filled)
- **ZUSD/USDT LP**: `0x...` (to be filled)

### BSC Mainnet
- **ZUSD Contract**: `0x...` (to be filled)
- **ZUSD/USDT LP**: `0x...` (to be filled)

---

## Support & Resources

- **BSC Testnet Explorer**: https://testnet.bscscan.com/
- **BSC Mainnet Explorer**: https://bscscan.com/
- **PancakeSwap**: https://pancakeswap.finance/
- **Hardhat Docs**: https://hardhat.org/docs
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/

---

## Next Steps

After successful ZUSD deployment:
1. Deploy staking contract (accepts ZUSD deposits)
2. Integrate ZUSD with ZAI ecosystem
3. Create ZUSD/ZAI trading pair
4. Launch liquidity mining programs
5. Implement DAO governance

---

**Good luck with your deployment! 🚀**
