const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Zenithus Mining Contract Test Suite
 *
 * Test Coverage:
 * 1. Deployment and initialization
 * 2. Buy miner functionality
 * 3. Upgrade miner functionality
 * 4. Renew miner functionality
 * 5. Reward calculation and exponential decay
 * 6. Reward claiming (unlocked + locked)
 * 7. 3-level referral system
 * 8. Difficulty adjustment
 * 9. Annual burn mechanism
 * 10. Admin functions
 */
describe("ZenithMining Contract", function () {
    let zai;
    let mining;
    let owner;
    let marketingWallet;
    let operationalWallet;
    let user1;
    let user2;
    let user3;
    let user4;

    const INITIAL_SUPPLY = ethers.parseEther("15000000"); // 15M ZAI
    const MIN_MINER_COST = ethers.parseEther("500");      // 500 ZAI minimum
    const REWARD_POOL = ethers.parseEther("9000000");     // 9M ZAI for rewards

    beforeEach(async function () {
        // Get test accounts
        [owner, marketingWallet, operationalWallet, user1, user2, user3, user4] = await ethers.getSigners();

        // Deploy ZAI token (simplified for testing)
        const ZAI = await ethers.getContractFactory("ZenithAI");
        zai = await ZAI.deploy(marketingWallet.address);
        await zai.waitForDeployment();

        // Mint ZAI to owner and users for testing
        await zai.mint(owner.address, INITIAL_SUPPLY);
        await zai.transfer(user1.address, ethers.parseEther("100000"));
        await zai.transfer(user2.address, ethers.parseEther("100000"));
        await zai.transfer(user3.address, ethers.parseEther("100000"));
        await zai.transfer(user4.address, ethers.parseEther("100000"));

        // Deploy Mining contract
        const Mining = await ethers.getContractFactory("ZenithMining");
        mining = await Mining.deploy(
            await zai.getAddress(),
            marketingWallet.address,
            operationalWallet.address
        );
        await mining.waitForDeployment();

        // Fund mining contract with reward pool
        await zai.approve(await mining.getAddress(), REWARD_POOL);
        await mining.fundRewardPool(REWARD_POOL);

        // Approve mining contract for users
        await zai.connect(user1).approve(await mining.getAddress(), ethers.MaxUint256);
        await zai.connect(user2).approve(await mining.getAddress(), ethers.MaxUint256);
        await zai.connect(user3).approve(await mining.getAddress(), ethers.MaxUint256);
        await zai.connect(user4).approve(await mining.getAddress(), ethers.MaxUint256);
    });

    // ============ 1. Deployment Tests ============
    describe("Deployment", function () {
        it("Should set correct ZAI token address", async function () {
            expect(await mining.ZAI()).to.equal(await zai.getAddress());
        });

        it("Should set correct wallet addresses", async function () {
            expect(await mining.marketingWallet()).to.equal(marketingWallet.address);
            expect(await mining.operationalWallet()).to.equal(operationalWallet.address);
        });

        it("Should initialize with correct parameters", async function () {
            expect(await mining.initialDailyReward()).to.equal(ethers.parseEther("9037"));
            expect(await mining.decayRate()).to.equal(ethers.parseEther("0.999"));
            expect(await mining.globalTotalPower()).to.equal(0);
            expect(await mining.totalReleased()).to.equal(0);
        });

        it("Should have correct fee allocation", async function () {
            expect(await mining.burnFeePercent()).to.equal(5000);      // 50%
            expect(await mining.marketingFeePercent()).to.equal(3000); // 30%
            expect(await mining.operationalFeePercent()).to.equal(2000); // 20%
        });
    });

    // ============ 2. Buy Miner Tests ============
    describe("Buy Miner", function () {
        it("Should allow user to buy a miner with minimum 500 ZAI", async function () {
            const buyAmount = MIN_MINER_COST;

            await expect(mining.connect(user1).buyMiner(buyAmount, ethers.ZeroAddress))
                .to.emit(mining, "MinerBought");

            const miners = await mining.getUserMiners(user1.address);
            expect(miners.length).to.equal(1);
            expect(miners[0].owner).to.equal(user1.address);
            expect(miners[0].active).to.be.true;
        });

        it("Should reject miner purchase below 500 ZAI", async function () {
            await expect(
                mining.connect(user1).buyMiner(ethers.parseEther("499"), ethers.ZeroAddress)
            ).to.be.revertedWith("Mining: Minimum 500 ZAI required");
        });

        it("Should calculate power correctly (1:1 after fees)", async function () {
            const buyAmount = ethers.parseEther("1000");

            await mining.connect(user1).buyMiner(buyAmount, ethers.ZeroAddress);

            const miners = await mining.getUserMiners(user1.address);
            const fee = buyAmount / 10n; // 10% fee
            const expectedPower = buyAmount - fee; // 900 ZAI power

            expect(miners[0].powerLevel).to.equal(expectedPower);
        });

        it("Should distribute fees correctly (50% burn, 30% marketing, 20% operational)", async function () {
            const buyAmount = ethers.parseEther("1000");
            const totalFee = buyAmount / 10n; // 100 ZAI

            const marketingBalanceBefore = await zai.balanceOf(marketingWallet.address);
            const operationalBalanceBefore = await zai.balanceOf(operationalWallet.address);

            await mining.connect(user1).buyMiner(buyAmount, ethers.ZeroAddress);

            const marketingBalanceAfter = await zai.balanceOf(marketingWallet.address);
            const operationalBalanceAfter = await zai.balanceOf(operationalWallet.address);
            const burnPoolAfter = await mining.burnPool();

            expect(burnPoolAfter).to.equal(totalFee * 50n / 100n);       // 50 ZAI
            expect(marketingBalanceAfter - marketingBalanceBefore).to.equal(totalFee * 30n / 100n); // 30 ZAI
            expect(operationalBalanceAfter - operationalBalanceBefore).to.equal(totalFee * 20n / 100n); // 20 ZAI
        });

        it("Should update global power correctly", async function () {
            const buyAmount = ethers.parseEther("1000");
            const expectedPower = buyAmount - (buyAmount / 10n);

            await mining.connect(user1).buyMiner(buyAmount, ethers.ZeroAddress);

            expect(await mining.globalTotalPower()).to.equal(expectedPower);
            expect(await mining.getUserTotalPower(user1.address)).to.equal(expectedPower);
        });

        it("Should register referrer on first purchase", async function () {
            await mining.connect(user1).buyMiner(MIN_MINER_COST, user2.address);

            expect(await mining.referrer(user1.address)).to.equal(user2.address);

            const downlines = await mining.getDownlines(user2.address);
            expect(downlines.length).to.equal(1);
            expect(downlines[0]).to.equal(user1.address);
        });

        it("Should not allow self-referral", async function () {
            await expect(
                mining.connect(user1).buyMiner(MIN_MINER_COST, user1.address)
            ).to.be.revertedWith("Mining: Cannot refer yourself");
        });

        it("Should allow multiple miners per user", async function () {
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);

            const miners = await mining.getUserMiners(user1.address);
            expect(miners.length).to.equal(2);
        });
    });

    // ============ 3. Upgrade Miner Tests ============
    describe("Upgrade Miner", function () {
        beforeEach(async function () {
            // User1 buys a miner first
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);
        });

        it("Should allow upgrading existing miner", async function () {
            const upgradeAmount = ethers.parseEther("500");
            const minersBefore = await mining.getUserMiners(user1.address);
            const powerBefore = minersBefore[0].powerLevel;

            await mining.connect(user1).upgradeMiner(0, upgradeAmount);

            const minersAfter = await mining.getUserMiners(user1.address);
            const powerAfter = minersAfter[0].powerLevel;

            const additionalPower = upgradeAmount - (upgradeAmount / 10n);
            expect(powerAfter - powerBefore).to.equal(additionalPower);
        });

        it("Should reject upgrade of invalid miner ID", async function () {
            await expect(
                mining.connect(user1).upgradeMiner(999, ethers.parseEther("500"))
            ).to.be.revertedWith("Mining: Invalid miner ID");
        });

        it("Should update purchase price for renewal calculation", async function () {
            const initialPrice = MIN_MINER_COST;
            const upgradeAmount = ethers.parseEther("500");

            await mining.connect(user1).upgradeMiner(0, upgradeAmount);

            const miners = await mining.getUserMiners(user1.address);
            expect(miners[0].purchasePrice).to.equal(initialPrice + upgradeAmount);
        });

        it("Should update global power correctly", async function () {
            const upgradeAmount = ethers.parseEther("500");
            const globalPowerBefore = await mining.globalTotalPower();

            await mining.connect(user1).upgradeMiner(0, upgradeAmount);

            const globalPowerAfter = await mining.globalTotalPower();
            const additionalPower = upgradeAmount - (upgradeAmount / 10n);

            expect(globalPowerAfter - globalPowerBefore).to.equal(additionalPower);
        });
    });

    // ============ 4. Renew Miner Tests ============
    describe("Renew Miner", function () {
        beforeEach(async function () {
            await mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);
        });

        it("Should allow renewal 30 days before expiry", async function () {
            // Fast forward to 335 days (30 days before expiry)
            await time.increase(335 * 24 * 60 * 60);

            const minersBefore = await mining.getUserMiners(user1.address);
            const renewalTimeBefore = minersBefore[0].renewalTime;

            await mining.connect(user1).renewMiner(0);

            const minersAfter = await mining.getUserMiners(user1.address);
            const renewalTimeAfter = minersAfter[0].renewalTime;

            // Renewal time should extend by 1 year from current time
            expect(renewalTimeAfter).to.be.gt(renewalTimeBefore);
        });

        it("Should calculate renewal fee as 10% of purchase price", async function () {
            await time.increase(335 * 24 * 60 * 60);

            const purchasePrice = ethers.parseEther("1000");
            const expectedFee = purchasePrice / 10n;

            const balanceBefore = await zai.balanceOf(user1.address);
            await mining.connect(user1).renewMiner(0);
            const balanceAfter = await zai.balanceOf(user1.address);

            expect(balanceBefore - balanceAfter).to.equal(expectedFee);
        });

        it("Should reject renewal too early", async function () {
            await expect(
                mining.connect(user1).renewMiner(0)
            ).to.be.revertedWith("Mining: Too early to renew");
        });

        it("Should reactivate expired miner", async function () {
            // Fast forward past expiry
            await time.increase(366 * 24 * 60 * 60);

            // Deactivate miner
            await mining.deactivateExpiredMiner(user1.address, 0);

            let miners = await mining.getUserMiners(user1.address);
            expect(miners[0].active).to.be.false;

            // Renew
            await mining.connect(user1).renewMiner(0);

            miners = await mining.getUserMiners(user1.address);
            expect(miners[0].active).to.be.true;
        });
    });

    // ============ 5. Reward Calculation Tests ============
    describe("Reward Calculation", function () {
        it("Should calculate daily reward with exponential decay", async function () {
            const initialDaily = await mining.getDailyReward();
            expect(initialDaily).to.equal(ethers.parseEther("9037"));

            // After 1 day, reward should be initial * 0.999
            await time.increase(1 * 24 * 60 * 60);
            const dailyAfter1Day = await mining.getDailyReward();

            // Should be approximately initial * 0.999
            const expected = (initialDaily * 999n) / 1000n;
            expect(dailyAfter1Day).to.be.closeTo(expected, ethers.parseEther("10"));
        });

        it("Should accrue rewards based on power share", async function () {
            // User1 buys miner with 50% of total power
            await mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

            // User2 buys miner with 50% of total power
            await mining.connect(user2).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

            // Fast forward 1 day
            await time.increase(1 * 24 * 60 * 60);

            const pending1 = await mining.getPendingRewards(user1.address);
            const pending2 = await mining.getPendingRewards(user2.address);

            // Both should have roughly equal rewards (50% each)
            expect(pending1).to.be.gt(0);
            expect(pending2).to.be.gt(0);
            expect(pending1).to.be.closeTo(pending2, ethers.parseEther("10"));
        });

        it("Should respect max reward cap (9M ZAI)", async function () {
            expect(await mining.getRemainingRewards()).to.equal(ethers.parseEther("9000000"));
        });
    });

    // ============ 6. Reward Claiming Tests ============
    describe("Reward Claiming", function () {
        beforeEach(async function () {
            // User1 buys miner and waits for rewards
            await mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);
            await time.increase(7 * 24 * 60 * 60); // 7 days
        });

        it("Should split rewards: 70% unlocked, 30% locked", async function () {
            const pendingBefore = await mining.getPendingRewards(user1.address);

            await mining.connect(user1).claimRewards();

            const lockedRewards = await mining.getLockedRewards(user1.address);
            expect(lockedRewards.length).to.equal(1);

            // Approximate 70/30 split
            const locked = lockedRewards[0].amount;
            const expectedLocked = (pendingBefore * 30n) / 100n;

            expect(locked).to.be.closeTo(expectedLocked, ethers.parseEther("10"));
        });

        it("Should lock rewards for 30 days", async function () {
            await mining.connect(user1).claimRewards();

            const lockedRewards = await mining.getLockedRewards(user1.address);
            const releaseTime = lockedRewards[0].releaseTime;

            expect(releaseTime).to.be.gt(await time.latest());
            expect(releaseTime).to.be.closeTo(
                (await time.latest()) + 30 * 24 * 60 * 60,
                100
            );
        });

        it("Should transfer unlocked amount immediately", async function () {
            const balanceBefore = await zai.balanceOf(user1.address);
            const pending = await mining.getPendingRewards(user1.address);

            await mining.connect(user1).claimRewards();

            const balanceAfter = await zai.balanceOf(user1.address);
            const expectedUnlocked = (pending * 70n) / 100n;

            expect(balanceAfter - balanceBefore).to.be.closeTo(expectedUnlocked, ethers.parseEther("10"));
        });

        it("Should allow claiming locked rewards after 30 days", async function () {
            await mining.connect(user1).claimRewards();

            // Fast forward 31 days
            await time.increase(31 * 24 * 60 * 60);

            const unlockable = await mining.getUnlockableRewards(user1.address);
            expect(unlockable).to.be.gt(0);

            const balanceBefore = await zai.balanceOf(user1.address);
            await mining.connect(user1).claimLockedRewards();
            const balanceAfter = await zai.balanceOf(user1.address);

            expect(balanceAfter - balanceBefore).to.equal(unlockable);
        });

        it("Should reject claim if no locked rewards unlocked", async function () {
            await mining.connect(user1).claimRewards();

            // Try to claim immediately (not 30 days yet)
            await expect(
                mining.connect(user1).claimLockedRewards()
            ).to.be.revertedWith("Mining: No rewards unlocked yet");
        });
    });

    // ============ 7. Referral System Tests ============
    describe("3-Level Referral System", function () {
        it("Should pay 5% to level 1 referrer", async function () {
            // user2 refers user1
            await mining.connect(user1).buyMiner(ethers.parseEther("1000"), user2.address);

            // user2 also buys miner (must be active to receive rewards)
            await mining.connect(user2).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

            // Wait for rewards
            await time.increase(7 * 24 * 60 * 60);

            const user1PendingBefore = await mining.getPendingRewards(user1.address);
            const user2PendingBefore = await mining.getPendingRewards(user2.address);

            // user1 claims (user2 gets 5% referral)
            await mining.connect(user1).claimRewards();

            const user2PendingAfter = await mining.getPendingRewards(user2.address);
            const referralReward = user2PendingAfter - user2PendingBefore;

            // user2 should receive ~5% of user1's rewards
            const expectedReferral = (user1PendingBefore * 5n) / 100n;
            expect(referralReward).to.be.closeTo(expectedReferral, ethers.parseEther("1"));
        });

        it("Should build 3-level referral tree", async function () {
            // Build tree: user2 -> user1 -> user3
            await mining.connect(user1).buyMiner(MIN_MINER_COST, user2.address);
            await mining.connect(user3).buyMiner(MIN_MINER_COST, user1.address);

            expect(await mining.referrer(user1.address)).to.equal(user2.address);
            expect(await mining.referrer(user3.address)).to.equal(user1.address);

            const user2Downlines = await mining.getDownlines(user2.address);
            const user1Downlines = await mining.getDownlines(user1.address);

            expect(user2Downlines.length).to.equal(1);
            expect(user2Downlines[0]).to.equal(user1.address);
            expect(user1Downlines.length).to.equal(1);
            expect(user1Downlines[0]).to.equal(user3.address);
        });

        it("Should not pay referral if referrer has no active miner", async function () {
            // user2 refers user1 but user2 has no miner
            await mining.connect(user1).buyMiner(MIN_MINER_COST, user2.address);

            await time.increase(7 * 24 * 60 * 60);

            const user2PendingBefore = await mining.getPendingRewards(user2.address);
            await mining.connect(user1).claimRewards();
            const user2PendingAfter = await mining.getPendingRewards(user2.address);

            // user2 should not receive referral (no active miner)
            expect(user2PendingAfter).to.equal(user2PendingBefore);
        });
    });

    // ============ 8. Difficulty Adjustment Tests ============
    describe("Difficulty Adjustment", function () {
        it("Should allow adjustment after 14 days", async function () {
            await time.increase(14 * 24 * 60 * 60);

            await expect(mining.adjustDifficulty())
                .to.emit(mining, "DifficultyAdjusted");
        });

        it("Should reject early adjustment (non-owner)", async function () {
            await expect(
                mining.connect(user1).adjustDifficulty()
            ).to.be.revertedWith("Mining: Too early for difficulty adjustment");
        });

        it("Should allow owner to adjust anytime", async function () {
            await expect(mining.connect(owner).adjustDifficulty())
                .to.emit(mining, "DifficultyAdjusted");
        });
    });

    // ============ 9. Deactivate Expired Miner Tests ============
    describe("Deactivate Expired Miner", function () {
        it("Should deactivate miner after 365 days", async function () {
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);

            const powerBefore = await mining.globalTotalPower();

            // Fast forward past expiry
            await time.increase(366 * 24 * 60 * 60);

            await mining.deactivateExpiredMiner(user1.address, 0);

            const miners = await mining.getUserMiners(user1.address);
            expect(miners[0].active).to.be.false;

            const powerAfter = await mining.globalTotalPower();
            expect(powerAfter).to.be.lt(powerBefore);
        });

        it("Should reject deactivation of non-expired miner", async function () {
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);

            await expect(
                mining.deactivateExpiredMiner(user1.address, 0)
            ).to.be.revertedWith("Mining: Miner not expired yet");
        });
    });

    // ============ 10. Annual Burn Tests ============
    describe("Annual Burn", function () {
        it("Should accumulate fees in burn pool", async function () {
            await mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

            const burnPool = await mining.burnPool();
            const expectedBurn = (ethers.parseEther("1000") * 10n / 100n) * 50n / 100n; // 10% fee * 50%

            expect(burnPool).to.equal(expectedBurn);
        });

        it("Owner can execute annual burn", async function () {
            await mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

            const burnPoolBefore = await mining.burnPool();

            await expect(mining.executeAnnualBurn())
                .to.emit(mining, "BurnExecuted")
                .withArgs(burnPoolBefore, await time.latest() + 1);

            expect(await mining.burnPool()).to.equal(0);
        });

        it("Should reject burn with empty pool", async function () {
            await expect(
                mining.executeAnnualBurn()
            ).to.be.revertedWith("Mining: Burn pool is empty");
        });
    });

    // ============ 11. Admin Function Tests ============
    describe("Admin Functions", function () {
        it("Owner can update marketing wallet", async function () {
            await mining.setMarketingWallet(user1.address);
            expect(await mining.marketingWallet()).to.equal(user1.address);
        });

        it("Owner can update operational wallet", async function () {
            await mining.setOperationalWallet(user1.address);
            expect(await mining.operationalWallet()).to.equal(user1.address);
        });

        it("Owner can update decay parameters", async function () {
            const newDaily = ethers.parseEther("10000");
            const newDecay = ethers.parseEther("0.998");
            const newStart = await time.latest();

            await mining.setDecayParams(newDaily, newDecay, newStart);

            expect(await mining.initialDailyReward()).to.equal(newDaily);
            expect(await mining.decayRate()).to.equal(newDecay);
            expect(await mining.startTimestamp()).to.equal(newStart);
        });

        it("Owner can adjust fee allocation", async function () {
            await mining.setFeeAllocation(6000, 2000, 2000); // 60/20/20

            expect(await mining.burnFeePercent()).to.equal(6000);
            expect(await mining.marketingFeePercent()).to.equal(2000);
            expect(await mining.operationalFeePercent()).to.equal(2000);
        });

        it("Should reject invalid fee allocation (not 100%)", async function () {
            await expect(
                mining.setFeeAllocation(5000, 3000, 3000) // 110%
            ).to.be.revertedWith("Mining: Percentages must sum to 100%");
        });

        it("Non-owner cannot call admin functions", async function () {
            await expect(
                mining.connect(user1).setMarketingWallet(user2.address)
            ).to.be.revertedWithCustomError(mining, "OwnableUnauthorizedAccount");
        });
    });

    // ============ 12. View Function Tests ============
    describe("View Functions", function () {
        it("Should return user's miners", async function () {
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);

            const miners = await mining.getUserMiners(user1.address);
            expect(miners.length).to.equal(2);
        });

        it("Should return miner count", async function () {
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);

            expect(await mining.getMinerCount(user1.address)).to.equal(1);
        });

        it("Should check miner active status", async function () {
            await mining.connect(user1).buyMiner(MIN_MINER_COST, ethers.ZeroAddress);

            expect(await mining.isMinerActive(user1.address, 0)).to.be.true;
        });

        it("Should return user total power", async function () {
            await mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

            const expectedPower = ethers.parseEther("1000") - (ethers.parseEther("1000") / 10n);
            expect(await mining.getUserTotalPower(user1.address)).to.equal(expectedPower);
        });

        it("Should return global total power", async function () {
            await mining.connect(user1).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);
            await mining.connect(user2).buyMiner(ethers.parseEther("1000"), ethers.ZeroAddress);

            const totalPower = await mining.getGlobalTotalPower();
            expect(totalPower).to.be.gt(0);
        });
    });
});
