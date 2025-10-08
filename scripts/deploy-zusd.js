const hre = require("hardhat");

/**
 * ZUSD Stablecoin Deployment Script (BSC)
 *
 * Deployment Flow:
 * 1. Deploy ZUSD contract (no constructor args)
 * 2. Verify initial configuration
 * 3. Output contract address and next steps
 */
async function main() {
    console.log("====================================");
    console.log("Deploying ZenithUSD (ZUSD) Token");
    console.log("====================================\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "BNB\n");

    // Configuration summary
    console.log("Contract Configuration:");
    console.log("- Max Supply: 100,000,000,000 ZUSD");
    console.log("- Initial Supply: 0 (mint after deployment)");
    console.log("- Burn Fee: 0.1% on transfers");
    console.log("- Max Tx: 1% of max supply");
    console.log("- Cooldown: 30 seconds\n");

    // Deploy contract
    console.log("Deploying ZUSD contract...");
    const ZUSD = await hre.ethers.getContractFactory("ZenithUSD");
    const zusd = await ZUSD.deploy();

    await zusd.waitForDeployment();
    const zusdAddress = await zusd.getAddress();

    console.log("\n✅ ZUSD Contract Deployed!");
    console.log("Contract Address:", zusdAddress);
    console.log("Transaction Hash:", zusd.deploymentTransaction().hash);

    // Verify initial configuration
    console.log("\n====================================");
    console.log("Verifying Configuration");
    console.log("====================================");

    const name = await zusd.name();
    const symbol = await zusd.symbol();
    const decimals = await zusd.decimals();
    const totalSupply = await zusd.totalSupply();
    const maxSupply = await zusd.MAX_SUPPLY();
    const burnFee = await zusd.burnFee();
    const maxTxAmount = await zusd.maxTxAmount();
    const cooldownTime = await zusd.cooldownTime();

    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("Total Supply:", hre.ethers.formatEther(totalSupply), symbol);
    console.log("Max Supply:", hre.ethers.formatEther(maxSupply), symbol);
    console.log("Burn Fee:", burnFee, "basis points (0.1%)");
    console.log("Max Tx Amount:", hre.ethers.formatEther(maxTxAmount), symbol);
    console.log("Cooldown Time:", cooldownTime, "seconds");

    // Check whitelist
    const isOwnerWhitelisted = await zusd.isWhitelisted(deployer.address);
    const isContractWhitelisted = await zusd.isWhitelisted(zusdAddress);

    console.log("\nWhitelist Status:");
    console.log("- Owner:", isOwnerWhitelisted ? "✅" : "❌");
    console.log("- Contract:", isContractWhitelisted ? "✅" : "❌");

    // Output next steps
    console.log("\n====================================");
    console.log("Next Steps");
    console.log("====================================");

    console.log("\n1. Verify Contract on BSCScan:");
    console.log(`   npx hardhat verify --network ${hre.network.name} ${zusdAddress}`);

    console.log("\n2. Mint Initial Supply for LP:");
    console.log(`   const zusd = await ethers.getContractAt("ZenithUSD", "${zusdAddress}");`);
    console.log(`   await zusd.mint("${deployer.address}", ethers.parseEther("10000000"));`);
    console.log("   (Example: mint 10M ZUSD)");

    console.log("\n3. Get USDT for Liquidity Pool:");
    if (hre.network.name === "bscTestnet") {
        console.log("   - Testnet USDT: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd");
        console.log("   - Get from faucet or swap BNB → USDT on PancakeSwap testnet");
    } else {
        console.log("   - Mainnet USDT: 0x55d398326f99059fF775485246999027B3197955");
        console.log("   - Buy on Binance and withdraw to BSC");
    }

    console.log("\n4. Create ZUSD/USDT LP on PancakeSwap:");
    if (hre.network.name === "bscTestnet") {
        console.log("   - Go to: https://pancake.kiemtienonline360.com/#/add");
    } else {
        console.log("   - Go to: https://pancakeswap.finance/add");
    }
    console.log("   - Select ZUSD (paste contract address above)");
    console.log("   - Select USDT");
    console.log("   - Add liquidity in 1:1 ratio (e.g., 10K ZUSD : 10K USDT)");

    console.log("\n5. Whitelist LP Pair Address:");
    console.log("   - Get pair address from PancakeSwap or:");
    console.log(`   const factory = "0x..."; // PancakeFactory address`);
    console.log(`   const pair = await factory.getPair("${zusdAddress}", "USDT_ADDRESS");`);
    console.log(`   await zusd.setWhitelisted(pair, true);`);

    console.log("\n6. (Optional) Adjust Anti-Bot Settings:");
    console.log("   await zusd.setMaxTxAmount(ethers.parseEther('500000')); // 500K max");
    console.log("   await zusd.setCooldownTime(60); // 60 seconds");
    console.log("   await zusd.setBurnFee(5); // 0.05%");

    console.log("\n7. Test Buy/Sell on PancakeSwap:");
    console.log("   - Buy small amount of ZUSD with USDT");
    console.log("   - Verify price is ~1:1");
    console.log("   - Sell ZUSD back to USDT");
    console.log("   - Check burn fee applied correctly");

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: zusdAddress,
        deployerAddress: deployer.address,
        deploymentTime: new Date().toISOString(),
        transactionHash: zusd.deploymentTransaction().hash,
        configuration: {
            name,
            symbol,
            decimals: decimals.toString(),
            maxSupply: hre.ethers.formatEther(maxSupply),
            burnFee: burnFee.toString(),
            maxTxAmount: hre.ethers.formatEther(maxTxAmount),
            cooldownTime: cooldownTime.toString()
        }
    };

    const fs = require("fs");
    const filename = `deployment-zusd-${hre.network.name}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log(`\n✅ Deployment info saved to ${filename}`);
    console.log("\n====================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
