const hre = require("hardhat");

/**
 * Zenithus Mining Contract Deployment Script
 *
 * Prerequisites:
 * 1. ZAI token must be deployed first
 * 2. Marketing and operational wallets must be set up
 * 3. Owner must have 9M ZAI to fund reward pool
 *
 * Deployment Flow:
 * 1. Deploy Mining contract with ZAI address and wallets
 * 2. Verify configuration
 * 3. Fund reward pool (9M ZAI)
 * 4. Output contract address and next steps
 */
async function main() {
    console.log("====================================");
    console.log("Deploying Zenithus Mining Contract");
    console.log("====================================\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("BNB Balance:", hre.ethers.formatEther(balance), "BNB\n");

    // ============ Configuration (UPDATE THESE ADDRESSES) ============
    // TODO: Update with actual deployed contract addresses
    const ZAI_ADDRESS = "0x..."; // ZAI token contract address
    const MARKETING_WALLET = "0x786849bB473d78CA06DbB8224D768E2900Ad3809";
    const OPERATIONAL_WALLET = "0x..."; // Operational wallet address

    console.log("Configuration:");
    console.log("- ZAI Token:", ZAI_ADDRESS);
    console.log("- Marketing Wallet:", MARKETING_WALLET);
    console.log("- Operational Wallet:", OPERATIONAL_WALLET);
    console.log();

    // Validate addresses
    if (ZAI_ADDRESS === "0x...") {
        console.error("❌ Error: Please update ZAI_ADDRESS with deployed ZAI contract address");
        process.exit(1);
    }
    if (OPERATIONAL_WALLET === "0x...") {
        console.error("❌ Error: Please update OPERATIONAL_WALLET address");
        process.exit(1);
    }

    // ============ Deploy Mining Contract ============
    console.log("Deploying Mining contract...");
    const Mining = await hre.ethers.getContractFactory("ZenithMining");
    const mining = await Mining.deploy(ZAI_ADDRESS, MARKETING_WALLET, OPERATIONAL_WALLET);

    await mining.waitForDeployment();
    const miningAddress = await mining.getAddress();

    console.log("\n✅ Mining Contract Deployed!");
    console.log("Contract Address:", miningAddress);
    console.log("Transaction Hash:", mining.deploymentTransaction().hash);

    // ============ Verify Configuration ============
    console.log("\n====================================");
    console.log("Verifying Configuration");
    console.log("====================================");

    const zaiAddress = await mining.ZAI();
    const marketingWallet = await mining.marketingWallet();
    const operationalWallet = await mining.operationalWallet();
    const initialDailyReward = await mining.initialDailyReward();
    const decayRate = await mining.decayRate();
    const maxRewards = await mining.MAX_TOTAL_REWARDS();

    console.log("ZAI Token:", zaiAddress);
    console.log("Marketing Wallet:", marketingWallet);
    console.log("Operational Wallet:", operationalWallet);
    console.log("Initial Daily Reward:", hre.ethers.formatEther(initialDailyReward), "ZAI");
    console.log("Decay Rate:", hre.ethers.formatEther(decayRate), "(0.999)");
    console.log("Max Total Rewards:", hre.ethers.formatEther(maxRewards), "ZAI");

    // Fee allocation
    const burnFee = await mining.burnFeePercent();
    const marketingFee = await mining.marketingFeePercent();
    const operationalFee = await mining.operationalFeePercent();

    console.log("\nFee Allocation:");
    console.log("- Burn:", burnFee / 100, "%");
    console.log("- Marketing:", marketingFee / 100, "%");
    console.log("- Operational:", operationalFee / 100, "%");

    // ============ Fund Reward Pool ============
    console.log("\n====================================");
    console.log("Funding Reward Pool");
    console.log("====================================");

    const REWARD_POOL_AMOUNT = hre.ethers.parseEther("9000000"); // 9M ZAI

    console.log("Required: 9,000,000 ZAI");
    console.log("\nIMPORTANT: You must manually approve and fund the reward pool:");
    console.log(`1. Approve Mining contract to spend 9M ZAI:`);
    console.log(`   zai.approve("${miningAddress}", "${REWARD_POOL_AMOUNT}")`);
    console.log(`2. Fund reward pool:`);
    console.log(`   mining.fundRewardPool("${REWARD_POOL_AMOUNT}")`);

    // Check if deployer has ZAI and can fund
    try {
        const ZAI = await hre.ethers.getContractAt("IERC20", ZAI_ADDRESS);
        const deployerZAIBalance = await ZAI.balanceOf(deployer.address);

        console.log(`\nYour ZAI Balance: ${hre.ethers.formatEther(deployerZAIBalance)} ZAI`);

        if (deployerZAIBalance >= REWARD_POOL_AMOUNT) {
            console.log("✅ Sufficient ZAI balance to fund reward pool");
        } else {
            console.log("⚠️  Insufficient ZAI balance. You need to acquire more ZAI first.");
        }
    } catch (error) {
        console.log("⚠️  Could not check ZAI balance (contract might not be verified yet)");
    }

    // ============ Next Steps ============
    console.log("\n====================================");
    console.log("Next Steps");
    console.log("====================================");

    console.log("\n1. Verify Contract on BSCScan:");
    console.log(`   npx hardhat verify --network ${hre.network.name} ${miningAddress} \\`);
    console.log(`     "${ZAI_ADDRESS}" \\`);
    console.log(`     "${MARKETING_WALLET}" \\`);
    console.log(`     "${OPERATIONAL_WALLET}"`);

    console.log("\n2. Fund Reward Pool (9M ZAI):");
    console.log("   a. Approve Mining contract:");
    console.log(`      const zai = await ethers.getContractAt("IERC20", "${ZAI_ADDRESS}");`);
    console.log(`      await zai.approve("${miningAddress}", ethers.parseEther("9000000"));`);
    console.log("   b. Fund pool:");
    console.log(`      const mining = await ethers.getContractAt("ZenithMining", "${miningAddress}");`);
    console.log(`      await mining.fundRewardPool(ethers.parseEther("9000000"));`);

    console.log("\n3. Test Buy Miner (User Flow):");
    console.log("   a. User approves Mining contract to spend ZAI");
    console.log("   b. User calls: mining.buyMiner(ethers.parseEther('500'), referrerAddress)");
    console.log("   c. Verify miner created: mining.getUserMiners(userAddress)");

    console.log("\n4. Monitor After Launch:");
    console.log("   - Check global total power: mining.getGlobalTotalPower()");
    console.log("   - Check daily reward: mining.getDailyReward()");
    console.log("   - Check total released: mining.totalReleased()");
    console.log("   - Check burn pool: mining.burnPool()");

    console.log("\n5. Periodic Maintenance:");
    console.log("   - Execute annual burn: mining.executeAnnualBurn() (after accumulation)");
    console.log("   - Adjust difficulty: Happens automatically every 14 days");
    console.log("   - Monitor reward pool balance");

    console.log("\n6. (Optional) Update Parameters:");
    console.log("   - Decay params: mining.setDecayParams(newDaily, newRate, newStart)");
    console.log("   - Fee allocation: mining.setFeeAllocation(burn%, marketing%, operational%)");
    console.log("   - Wallets: mining.setMarketingWallet() / setOperationalWallet()");

    // ============ Save Deployment Info ============
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: miningAddress,
        deployerAddress: deployer.address,
        zaiAddress: ZAI_ADDRESS,
        marketingWallet: MARKETING_WALLET,
        operationalWallet: OPERATIONAL_WALLET,
        deploymentTime: new Date().toISOString(),
        transactionHash: mining.deploymentTransaction().hash,
        configuration: {
            initialDailyReward: hre.ethers.formatEther(initialDailyReward),
            decayRate: hre.ethers.formatEther(decayRate),
            maxTotalRewards: hre.ethers.formatEther(maxRewards),
            feeAllocation: {
                burn: burnFee.toString(),
                marketing: marketingFee.toString(),
                operational: operationalFee.toString()
            }
        },
        rewardPoolStatus: "PENDING - Must fund manually with 9M ZAI"
    };

    const fs = require("fs");
    const filename = `deployment-mining-${hre.network.name}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log(`\n✅ Deployment info saved to ${filename}`);

    // ============ Important Warnings ============
    console.log("\n====================================");
    console.log("⚠️  Important Reminders");
    console.log("====================================");
    console.log("1. DO NOT forget to fund the reward pool (9M ZAI)!");
    console.log("2. Verify contract on BSCScan for transparency");
    console.log("3. Test thoroughly on testnet before mainnet");
    console.log("4. Consider transferring ownership to multisig/DAO");
    console.log("5. Monitor contract regularly after launch");
    console.log("6. Set up automated annual burn execution");

    console.log("\n====================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
