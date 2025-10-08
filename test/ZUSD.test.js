const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * ZUSD Stablecoin Contract Test Suite
 *
 * Test Coverage:
 * 1. Deployment and initialization
 * 2. Minting functionality and max supply cap
 * 3. Burn fee mechanism (0.1%)
 * 4. Whitelist functionality
 * 5. Blacklist functionality
 * 6. Anti-bot: Max transaction limit
 * 7. Anti-bot: Cooldown period
 * 8. Owner-only functions access control
 */
describe("ZUSD Token Contract", function () {
    let zusd;
    let owner;
    let user1;
    let user2;
    let lpPair;
    let blacklistedUser;

    const MAX_SUPPLY = ethers.parseEther("100000000000"); // 100 billion
    const INITIAL_MINT = ethers.parseEther("1000000"); // 1 million for testing

    beforeEach(async function () {
        // Get test accounts
        [owner, user1, user2, lpPair, blacklistedUser] = await ethers.getSigners();

        // Deploy ZUSD contract
        const ZUSD = await ethers.getContractFactory("ZenithUSD");
        zusd = await ZUSD.deploy();
        await zusd.waitForDeployment();

        // Mint initial supply to owner for testing
        await zusd.mint(owner.address, INITIAL_MINT);
    });

    // ============ 1. Deployment Tests ============
    describe("Deployment", function () {
        it("Should set correct name and symbol", async function () {
            expect(await zusd.name()).to.equal("Zenith USD");
            expect(await zusd.symbol()).to.equal("ZUSD");
        });

        it("Should have 18 decimals", async function () {
            expect(await zusd.decimals()).to.equal(18);
        });

        it("Should start with zero initial supply in constructor", async function () {
            // Deploy fresh contract to test constructor
            const ZUSD = await ethers.getContractFactory("ZenithUSD");
            const freshZusd = await ZUSD.deploy();
            expect(await freshZusd.totalSupply()).to.equal(0);
        });

        it("Should whitelist owner and contract initially", async function () {
            expect(await zusd.isWhitelisted(owner.address)).to.be.true;
            expect(await zusd.isWhitelisted(await zusd.getAddress())).to.be.true;
        });

        it("Should set correct initial parameters", async function () {
            expect(await zusd.burnFee()).to.equal(10); // 0.1%
            expect(await zusd.maxTxAmount()).to.equal(MAX_SUPPLY / 100n); // 1%
            expect(await zusd.cooldownTime()).to.equal(30); // 30 seconds
        });
    });

    // ============ 2. Minting Tests ============
    describe("Minting", function () {
        it("Owner can mint tokens", async function () {
            const mintAmount = ethers.parseEther("1000");
            await zusd.mint(user1.address, mintAmount);
            expect(await zusd.balanceOf(user1.address)).to.equal(mintAmount);
        });

        it("Cannot mint beyond max supply", async function () {
            const excessAmount = MAX_SUPPLY; // Would exceed cap
            await expect(
                zusd.mint(owner.address, excessAmount)
            ).to.be.revertedWith("ZUSD: Exceeds maximum supply");
        });

        it("Cannot mint to zero address", async function () {
            await expect(
                zusd.mint(ethers.ZeroAddress, ethers.parseEther("1000"))
            ).to.be.revertedWith("ZUSD: Cannot mint to zero address");
        });

        it("Non-owner cannot mint", async function () {
            await expect(
                zusd.connect(user1).mint(user2.address, ethers.parseEther("1000"))
            ).to.be.revertedWithCustomError(zusd, "OwnableUnauthorizedAccount");
        });

        it("getRemainingMintable returns correct value", async function () {
            const remaining = await zusd.getRemainingMintable();
            expect(remaining).to.equal(MAX_SUPPLY - INITIAL_MINT);
        });

        it("Should emit TokensMinted event", async function () {
            const mintAmount = ethers.parseEther("1000");
            await expect(zusd.mint(user1.address, mintAmount))
                .to.emit(zusd, "TokensMinted")
                .withArgs(user1.address, mintAmount);
        });
    });

    // ============ 3. Burn Fee Tests (0.1%) ============
    describe("Burn Fee Mechanism", function () {
        it("Should apply 0.1% burn fee on regular transfers", async function () {
            const transferAmount = ethers.parseEther("1000");
            await zusd.transfer(user1.address, transferAmount);

            // Remove user1 from whitelist to test burn fee
            await zusd.setWhitelisted(user1.address, false);

            // User1 transfers to user2
            await zusd.connect(user1).transfer(user2.address, transferAmount);

            // Calculate expected amounts
            const burnFee = (transferAmount * 10n) / 10000n; // 0.1%
            const expectedReceived = transferAmount - burnFee;

            expect(await zusd.balanceOf(user2.address)).to.equal(expectedReceived);
            expect(await zusd.getTotalBurned()).to.equal(burnFee);
        });

        it("Should not apply burn fee to whitelisted addresses", async function () {
            const transferAmount = ethers.parseEther("1000");

            // Owner (whitelisted) transfers to user1
            await zusd.transfer(user1.address, transferAmount);

            // User1 should receive full amount (no burn)
            expect(await zusd.balanceOf(user1.address)).to.equal(transferAmount);
            expect(await zusd.getTotalBurned()).to.equal(0);
        });

        it("Owner can update burn fee", async function () {
            await zusd.setBurnFee(50); // Change to 0.5%
            expect(await zusd.burnFee()).to.equal(50);
        });

        it("Burn fee cannot exceed 1%", async function () {
            await expect(
                zusd.setBurnFee(101) // 1.01%
            ).to.be.revertedWith("ZUSD: Burn fee too high (max 1%)");
        });

        it("Should emit TokensBurned event", async function () {
            const transferAmount = ethers.parseEther("1000");
            await zusd.transfer(user1.address, transferAmount);
            await zusd.setWhitelisted(user1.address, false);

            const burnAmount = (transferAmount * 10n) / 10000n;

            await expect(zusd.connect(user1).transfer(user2.address, transferAmount))
                .to.emit(zusd, "TokensBurned")
                .withArgs(user1.address, burnAmount);
        });
    });

    // ============ 4. Whitelist Tests ============
    describe("Whitelist", function () {
        it("Owner can add address to whitelist", async function () {
            await zusd.setWhitelisted(user1.address, true);
            expect(await zusd.isWhitelisted(user1.address)).to.be.true;
        });

        it("Owner can remove address from whitelist", async function () {
            await zusd.setWhitelisted(user1.address, true);
            await zusd.setWhitelisted(user1.address, false);
            expect(await zusd.isWhitelisted(user1.address)).to.be.false;
        });

        it("Can batch whitelist addresses", async function () {
            await zusd.setWhitelistedBatch([user1.address, user2.address], true);
            expect(await zusd.isWhitelisted(user1.address)).to.be.true;
            expect(await zusd.isWhitelisted(user2.address)).to.be.true;
        });

        it("Whitelisted addresses bypass all restrictions", async function () {
            // Whitelist user1
            await zusd.setWhitelisted(user1.address, true);

            // Transfer large amount (exceeds maxTx)
            const largeAmount = (await zusd.maxTxAmount()) + ethers.parseEther("1000");
            await zusd.mint(user1.address, largeAmount);

            // Should succeed despite exceeding maxTx
            await zusd.connect(user1).transfer(user2.address, largeAmount);
            expect(await zusd.balanceOf(user2.address)).to.equal(largeAmount);
        });

        it("Non-owner cannot modify whitelist", async function () {
            await expect(
                zusd.connect(user1).setWhitelisted(user2.address, true)
            ).to.be.revertedWithCustomError(zusd, "OwnableUnauthorizedAccount");
        });

        it("Should emit WhitelistUpdated event", async function () {
            await expect(zusd.setWhitelisted(user1.address, true))
                .to.emit(zusd, "WhitelistUpdated")
                .withArgs(user1.address, true);
        });
    });

    // ============ 5. Blacklist Tests ============
    describe("Blacklist", function () {
        it("Owner can blacklist address", async function () {
            await zusd.setBlacklisted(user1.address, true);
            expect(await zusd.isBlacklisted(user1.address)).to.be.true;
        });

        it("Blacklisted addresses cannot send tokens", async function () {
            await zusd.transfer(user1.address, ethers.parseEther("1000"));
            await zusd.setBlacklisted(user1.address, true);

            await expect(
                zusd.connect(user1).transfer(user2.address, ethers.parseEther("100"))
            ).to.be.revertedWith("ZUSD: Sender is blacklisted");
        });

        it("Blacklisted addresses cannot receive tokens", async function () {
            await zusd.setBlacklisted(user2.address, true);

            await expect(
                zusd.transfer(user2.address, ethers.parseEther("100"))
            ).to.be.revertedWith("ZUSD: Recipient is blacklisted");
        });

        it("Cannot blacklist whitelisted address", async function () {
            await zusd.setWhitelisted(user1.address, true);

            await expect(
                zusd.setBlacklisted(user1.address, true)
            ).to.be.revertedWith("ZUSD: Cannot blacklist whitelisted address");
        });

        it("Owner can remove from blacklist", async function () {
            await zusd.setBlacklisted(user1.address, true);
            await zusd.setBlacklisted(user1.address, false);
            expect(await zusd.isBlacklisted(user1.address)).to.be.false;
        });

        it("Should emit Blacklisted event", async function () {
            await expect(zusd.setBlacklisted(user1.address, true))
                .to.emit(zusd, "Blacklisted")
                .withArgs(user1.address, true);
        });
    });

    // ============ 6. Max Transaction Limit Tests ============
    describe("Max Transaction Limit", function () {
        it("Cannot exceed max transaction amount", async function () {
            const maxTx = await zusd.maxTxAmount();
            const excessAmount = maxTx + ethers.parseEther("1");

            await zusd.mint(user1.address, excessAmount);
            await zusd.setWhitelisted(user1.address, false);

            await expect(
                zusd.connect(user1).transfer(user2.address, excessAmount)
            ).to.be.revertedWith("ZUSD: Transfer amount exceeds maximum");
        });

        it("Can transfer exactly max transaction amount", async function () {
            const maxTx = await zusd.maxTxAmount();

            await zusd.mint(user1.address, maxTx);
            await zusd.setWhitelisted(user1.address, false);

            await zusd.connect(user1).transfer(user2.address, maxTx);
            // Should succeed
        });

        it("Owner can update max transaction amount", async function () {
            const newMaxTx = ethers.parseEther("5000000");
            await zusd.setMaxTxAmount(newMaxTx);
            expect(await zusd.maxTxAmount()).to.equal(newMaxTx);
        });

        it("Max tx amount cannot exceed max supply", async function () {
            await expect(
                zusd.setMaxTxAmount(MAX_SUPPLY + 1n)
            ).to.be.revertedWith("ZUSD: Max tx cannot exceed supply");
        });

        it("Should emit MaxTxUpdated event", async function () {
            const newMaxTx = ethers.parseEther("5000000");
            await expect(zusd.setMaxTxAmount(newMaxTx))
                .to.emit(zusd, "MaxTxUpdated")
                .withArgs(newMaxTx);
        });
    });

    // ============ 7. Cooldown Period Tests ============
    describe("Cooldown Period", function () {
        it("Cannot transfer within cooldown period", async function () {
            const amount = ethers.parseEther("100");

            await zusd.transfer(user1.address, amount * 2n);
            await zusd.setWhitelisted(user1.address, false);

            // First transfer succeeds
            await zusd.connect(user1).transfer(user2.address, amount);

            // Second transfer immediately fails
            await expect(
                zusd.connect(user1).transfer(user2.address, amount)
            ).to.be.revertedWith("ZUSD: Cooldown period not elapsed");
        });

        it("Can transfer after cooldown period", async function () {
            const amount = ethers.parseEther("100");

            await zusd.transfer(user1.address, amount * 2n);
            await zusd.setWhitelisted(user1.address, false);

            // First transfer
            await zusd.connect(user1).transfer(user2.address, amount);

            // Advance time by 30 seconds
            await time.increase(30);

            // Second transfer should succeed
            await zusd.connect(user1).transfer(user2.address, amount);
            expect(await zusd.balanceOf(user2.address)).to.be.gt(amount);
        });

        it("Owner can update cooldown time", async function () {
            await zusd.setCooldownTime(60);
            expect(await zusd.cooldownTime()).to.equal(60);
        });

        it("Cooldown cannot exceed 5 minutes", async function () {
            await expect(
                zusd.setCooldownTime(301) // 5 minutes 1 second
            ).to.be.revertedWith("ZUSD: Cooldown too long (max 5 min)");
        });

        it("getCooldownRemaining returns correct value", async function () {
            const amount = ethers.parseEther("100");

            await zusd.transfer(user1.address, amount);
            await zusd.setWhitelisted(user1.address, false);

            await zusd.connect(user1).transfer(user2.address, amount);

            const remaining = await zusd.getCooldownRemaining(user1.address);
            expect(remaining).to.be.lte(30);
            expect(remaining).to.be.gt(0);
        });

        it("Whitelisted addresses have no cooldown", async function () {
            const remaining = await zusd.getCooldownRemaining(owner.address);
            expect(remaining).to.equal(0);
        });

        it("Should emit CooldownUpdated event", async function () {
            await expect(zusd.setCooldownTime(60))
                .to.emit(zusd, "CooldownUpdated")
                .withArgs(60);
        });
    });

    // ============ 8. View Functions Tests ============
    describe("View Functions", function () {
        it("getLastTransferTime returns correct timestamp", async function () {
            const amount = ethers.parseEther("100");

            await zusd.transfer(user1.address, amount);
            await zusd.setWhitelisted(user1.address, false);

            const tx = await zusd.connect(user1).transfer(user2.address, amount);
            const block = await ethers.provider.getBlock(tx.blockNumber);

            const lastTime = await zusd.getLastTransferTime(user1.address);
            expect(lastTime).to.equal(block.timestamp);
        });

        it("getTotalBurned returns correct amount", async function () {
            const amount = ethers.parseEther("10000");
            await zusd.transfer(user1.address, amount);
            await zusd.setWhitelisted(user1.address, false);

            await zusd.connect(user1).transfer(user2.address, amount);

            const burned = await zusd.getTotalBurned();
            const expectedBurn = (amount * 10n) / 10000n;
            expect(burned).to.equal(expectedBurn);
        });
    });

    // ============ 9. Access Control Tests ============
    describe("Access Control", function () {
        it("Only owner can call owner-only functions", async function () {
            await expect(
                zusd.connect(user1).mint(user2.address, ethers.parseEther("1000"))
            ).to.be.revertedWithCustomError(zusd, "OwnableUnauthorizedAccount");

            await expect(
                zusd.connect(user1).setBurnFee(20)
            ).to.be.revertedWithCustomError(zusd, "OwnableUnauthorizedAccount");

            await expect(
                zusd.connect(user1).setMaxTxAmount(ethers.parseEther("5000000"))
            ).to.be.revertedWithCustomError(zusd, "OwnableUnauthorizedAccount");

            await expect(
                zusd.connect(user1).setCooldownTime(60)
            ).to.be.revertedWithCustomError(zusd, "OwnableUnauthorizedAccount");
        });
    });

    // ============ 10. Integration Tests ============
    describe("Integration Scenarios", function () {
        it("Full lifecycle: mint -> transfer with burn -> check balances", async function () {
            // Mint to user1
            const mintAmount = ethers.parseEther("10000");
            await zusd.mint(user1.address, mintAmount);

            // Remove from whitelist
            await zusd.setWhitelisted(user1.address, false);

            // Transfer to user2 (with burn fee)
            const transferAmount = ethers.parseEther("5000");
            await zusd.connect(user1).transfer(user2.address, transferAmount);

            // Calculate expected balances
            const burnFee = (transferAmount * 10n) / 10000n;
            const expectedUser2Balance = transferAmount - burnFee;

            expect(await zusd.balanceOf(user2.address)).to.equal(expectedUser2Balance);
            expect(await zusd.getTotalBurned()).to.equal(burnFee);
        });

        it("Simulate LP pair scenario: whitelist pair and transfer large amounts", async function () {
            // Whitelist LP pair
            await zusd.setWhitelisted(lpPair.address, true);

            // Mint large amount to LP
            const lpAmount = ethers.parseEther("50000000"); // 50M
            await zusd.mint(lpPair.address, lpAmount);

            // LP transfers to users (no fees, no limits)
            await zusd.connect(lpPair).transfer(user1.address, ethers.parseEther("10000000"));

            expect(await zusd.balanceOf(user1.address)).to.equal(ethers.parseEther("10000000"));
        });
    });
});
