const hre = require("hardhat");

/**
 * Mining合约主网部署脚本
 *
 * 部署到 BSC Mainnet
 *
 * ⚠️ 主网部署前检查清单：
 * - [ ] .env 中 PRIVATE_KEY 是主网钱包私钥
 * - [ ] 钱包有足够 BNB（建议 >0.05 BNB）
 * - [ ] ZAI 合约地址正确
 * - [ ] 已在测试网完整测试
 * - [ ] 准备 9M ZAI 注资奖励池
 */

async function main() {
    console.log("========================================");
    console.log("  Mining 主网部署 - BSC Mainnet");
    console.log("========================================\n");

    // 获取部署账户
    const [deployer] = await hre.ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // 检查余额
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("BNB 余额:", hre.ethers.formatEther(balance), "BNB");

    if (balance < hre.ethers.parseEther("0.02")) {
        console.error("\n❌ 错误: BNB余额不足！建议至少 0.05 BNB");
        console.error("   当前余额:", hre.ethers.formatEther(balance), "BNB");
        console.error("   预计部署成本: 0.02-0.04 BNB");
        process.exit(1);
    }

    console.log("✅ BNB余额充足（预计消耗 0.02-0.04 BNB）");

    // ============ 配置参数 ============
    const ZAI_ADDRESS = "0xA49c95d8B262c3BD8FDFD6A602cca9db21377605";
    const MARKETING_WALLET = "0x786849bB473d78CA06DbB8224D768E2900Ad3809";
    const OPERATIONAL_WALLET = "0x786849bB473d78CA06DbB8224D768E2900Ad3809"; // 与营销钱包相同

    console.log("\n配置参数:");
    console.log("- ZAI 地址:", ZAI_ADDRESS);
    console.log("- 营销钱包:", MARKETING_WALLET);
    console.log("- 运营钱包:", OPERATIONAL_WALLET);
    console.log("\n经济模型 (30年周期):");
    console.log("- 奖励池: 9,000,000 ZAI");
    console.log("- 初始日奖励: 328 ZAI/天");
    console.log("- 衰减率: 0.9999636/天 (优化为30年释放9M)");
    console.log("- 手续费: 10% (50%销毁 + 30%营销 + 20%运营)");
    console.log("- 年度燃烧: 12.55% 流通供应量");

    // 最后确认
    console.log("\n⚠️  警告: 即将部署到 BSC 主网！");
    console.log("确认上述配置无误后，5秒后开始部署...\n");

    await new Promise(resolve => setTimeout(resolve, 5000));

    // ============ 部署 Mining 合约 ============
    console.log("正在部署 Mining 合约...");

    const Mining = await hre.ethers.getContractFactory("ZenithMining");
    const mining = await Mining.deploy(ZAI_ADDRESS, MARKETING_WALLET, OPERATIONAL_WALLET);

    console.log("等待交易确认...");
    await mining.waitForDeployment();

    const miningAddress = await mining.getAddress();
    const txHash = mining.deploymentTransaction().hash;

    console.log("\n✅ Mining 合约部署成功!");
    console.log("========================================");
    console.log("合约地址:", miningAddress);
    console.log("交易哈希:", txHash);
    console.log("区块链浏览器:", `https://bscscan.com/address/${miningAddress}`);
    console.log("========================================");

    // ============ 验证初始配置 ============
    console.log("\n正在验证合约配置...");

    const zaiAddress = await mining.ZAI();
    const marketingWallet = await mining.marketingWallet();
    const operationalWallet = await mining.operationalWallet();
    const maxRewards = await mining.MAX_TOTAL_REWARDS();
    const initialDaily = await mining.initialDailyReward();
    const decayRate = await mining.decayRate();

    console.log("\n✅ 合约配置验证:");
    console.log("- ZAI 地址:", zaiAddress);
    console.log("- 营销钱包:", marketingWallet);
    console.log("- 运营钱包:", operationalWallet);
    console.log("- 最大奖励:", hre.ethers.formatEther(maxRewards), "ZAI");
    console.log("- 初始日奖励:", hre.ethers.formatEther(initialDaily), "ZAI");
    console.log("- 衰减率:", hre.ethers.formatUnits(decayRate, 18), "(0.9999636)");

    // 验证衰减率
    const expectedDecayRate = hre.ethers.parseUnits("0.9999636", 18);
    if (decayRate.toString() === expectedDecayRate.toString()) {
        console.log("✅ 衰减率验证通过 (30年周期优化)");
    } else {
        console.log("⚠️  衰减率不匹配！");
        console.log("   期望:", hre.ethers.formatUnits(expectedDecayRate, 18));
        console.log("   实际:", hre.ethers.formatUnits(decayRate, 18));
    }

    // ============ 后续步骤 ============
    console.log("\n========================================");
    console.log("📋 后续步骤");
    console.log("========================================");

    console.log("\n1️⃣  验证合约（BSCScan）:");
    console.log(`   npx hardhat verify --network bsc ${miningAddress} "${ZAI_ADDRESS}" "${MARKETING_WALLET}" "${OPERATIONAL_WALLET}"`);

    console.log("\n2️⃣  将 Mining 合约加入 ZAI 白名单:");
    console.log("   在 Hardhat 控制台执行:");
    console.log(`   const zai = await ethers.getContractAt("ZenithAI", "${ZAI_ADDRESS}");`);
    console.log(`   await zai.setWhitelisted("${miningAddress}", true);`);

    console.log("\n3️⃣  为 Mining 合约注资 9M ZAI:");
    console.log("   方式一: 直接 Mint 到 Mining 合约 (推荐)");
    console.log(`   await zai.mint("${miningAddress}", ethers.parseEther("9000000"));`);
    console.log("\n   方式二: 从 Owner 批准并转入");
    console.log(`   await zai.approve("${miningAddress}", ethers.parseEther("9000000"));`);
    console.log(`   await mining.fundRewardPool(ethers.parseEther("9000000"));`);

    console.log("\n4️⃣  验证奖励池余额:");
    console.log(`   const poolBalance = await zai.balanceOf("${miningAddress}");`);
    console.log(`   console.log("奖励池余额:", ethers.formatEther(poolBalance), "ZAI");`);

    console.log("\n5️⃣  测试核心功能:");
    console.log("   - 购买矿机测试 (最低500 ZAI)");
    console.log("   - 算力分配测试");
    console.log("   - 奖励领取测试 (70%立即 + 30%锁仓)");
    console.log("   - 推荐系统测试 (5%/3%/1%)");
    console.log("   - 衰减测试 (Day 1: 328 ZAI, Day 1000: ~119 ZAI)");

    console.log("\n6️⃣  安全建议:");
    console.log("   - 考虑将 owner 转移到多签钱包");
    console.log("   - 监控奖励池余额");
    console.log("   - 定期执行 adjustDifficulty (14天周期)");
    console.log("   - 每年执行 executeAnnualBurn (12.55% 流通量)");

    // ============ 保存部署信息 ============
    const deploymentInfo = {
        network: "BSC Mainnet",
        chainId: 56,
        contract: "Mining",
        address: miningAddress,
        transactionHash: txHash,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        configuration: {
            zaiAddress: ZAI_ADDRESS,
            marketingWallet: MARKETING_WALLET,
            operationalWallet: OPERATIONAL_WALLET,
            maxTotalRewards: hre.ethers.formatEther(maxRewards) + " ZAI",
            initialDailyReward: hre.ethers.formatEther(initialDaily) + " ZAI",
            decayRate: hre.ethers.formatUnits(decayRate, 18),
            decayRateDescription: "0.9999636 per day (30-year cycle for 9M total)",
            annualBurnPercent: "12.55%",
            fee: "10% (50% burn + 30% marketing + 20% operational)"
        },
        economicModel: {
            cycleDuration: "30 years (10,950 days)",
            totalPool: "9,000,000 ZAI",
            estimatedDay1Reward: "328 ZAI",
            estimatedDay1000Reward: "~119 ZAI",
            estimatedDay10950Reward: "~0.05 ZAI"
        },
        links: {
            bscscan: `https://bscscan.com/address/${miningAddress}`,
            transaction: `https://bscscan.com/tx/${txHash}`
        }
    };

    const fs = require("fs");
    const filename = `deployment-mining-mainnet-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log(`\n✅ 部署信息已保存: ${filename}`);
    console.log("\n⚠️  重要提醒:");
    console.log("   1. 立即备份部署信息文件");
    console.log("   2. 在 BSCScan 验证合约");
    console.log("   3. 将 Mining 加入 ZAI 白名单");
    console.log("   4. 注资 9M ZAI 奖励池");
    console.log("   5. 测试所有核心功能");

    console.log("\n========================================");
    console.log("🎉 Mining 主网部署完成！");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ 部署失败:");
        console.error(error);
        process.exit(1);
    });
