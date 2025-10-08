const hre = require("hardhat");

/**
 * 主网部署脚本 - 按顺序部署所有合约
 *
 * 部署顺序：
 * 1. ZAI (治理代币)
 * 2. ZUSD (稳定币)
 * 3. Mining (挖矿合约) - 需要ZAI地址
 *
 * ⚠️ 主网部署前检查清单：
 * - [ ] 已在测试网完整测试
 * - [ ] .env中PRIVATE_KEY正确（主网钱包）
 * - [ ] 钱包有足够BNB（建议>0.5 BNB）
 * - [ ] 营销钱包地址正确
 * - [ ] 运营钱包地址正确
 * - [ ] 准备9M ZAI用于Mining奖励池
 */

async function main() {
    console.log("========================================");
    console.log("   Zenithus 主网部署 - BSC Mainnet");
    console.log("========================================\n");

    // 获取部署账户
    const [deployer] = await hre.ethers.getSigners();
    console.log("部署账户:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("BNB余额:", hre.ethers.formatEther(balance), "BNB");

    if (balance < hre.ethers.parseEther("0.1")) {
        console.error("\n❌ 错误：BNB余额不足！建议至少0.5 BNB");
        process.exit(1);
    }

    console.log("\n⚠️  警告：这将在BSC主网部署合约！");
    console.log("请确保已完成测试网测试。\n");

    // 等待5秒让用户确认
    console.log("5秒后开始部署...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ============ 配置钱包地址 ============
    const MARKETING_WALLET = "0x786849bB473d78CA06DbB8224D768E2900Ad3809";
    const OPERATIONAL_WALLET = "0x786849bB473d78CA06DbB8224D768E2900Ad3809"; // 修改为实际运营钱包

    console.log("\n配置信息:");
    console.log("- 营销钱包:", MARKETING_WALLET);
    console.log("- 运营钱包:", OPERATIONAL_WALLET);

    // ============ 1. 部署 ZAI ============
    console.log("\n\n========================================");
    console.log("1/3 部署 ZAI (治理代币)");
    console.log("========================================");

    const ZAI = await hre.ethers.getContractFactory("ZenithAI");
    console.log("正在部署 ZAI...");
    const zai = await ZAI.deploy(MARKETING_WALLET);
    await zai.waitForDeployment();
    const zaiAddress = await zai.getAddress();

    console.log("✅ ZAI部署成功!");
    console.log("   地址:", zaiAddress);
    console.log("   交易:", zai.deploymentTransaction().hash);

    // 验证ZAI配置
    const zaiSupply = await zai.totalSupply();
    console.log("   初始供应:", hre.ethers.formatEther(zaiSupply), "ZAI");

    // ============ 2. 部署 ZUSD ============
    console.log("\n\n========================================");
    console.log("2/3 部署 ZUSD (稳定币)");
    console.log("========================================");

    const ZUSD = await hre.ethers.getContractFactory("ZenithUSD");
    console.log("正在部署 ZUSD...");
    const zusd = await ZUSD.deploy();
    await zusd.waitForDeployment();
    const zusdAddress = await zusd.getAddress();

    console.log("✅ ZUSD部署成功!");
    console.log("   地址:", zusdAddress);
    console.log("   交易:", zusd.deploymentTransaction().hash);

    // ============ 3. 部署 Mining ============
    console.log("\n\n========================================");
    console.log("3/3 部署 Mining (虚拟挖矿)");
    console.log("========================================");

    const Mining = await hre.ethers.getContractFactory("ZenithMining");
    console.log("正在部署 Mining...");
    console.log("   使用 ZAI 地址:", zaiAddress);
    const mining = await Mining.deploy(zaiAddress, MARKETING_WALLET, OPERATIONAL_WALLET);
    await mining.waitForDeployment();
    const miningAddress = await mining.getAddress();

    console.log("✅ Mining部署成功!");
    console.log("   地址:", miningAddress);
    console.log("   交易:", mining.deploymentTransaction().hash);

    // ============ 部署摘要 ============
    console.log("\n\n========================================");
    console.log("   部署完成摘要");
    console.log("========================================");
    console.log("\n📋 合约地址:");
    console.log("   ZAI:    ", zaiAddress);
    console.log("   ZUSD:   ", zusdAddress);
    console.log("   Mining: ", miningAddress);

    console.log("\n📝 下一步操作:");
    console.log("\n1. 验证合约 (BSCScan):");
    console.log(`   npx hardhat verify --network bsc ${zaiAddress} "${MARKETING_WALLET}"`);
    console.log(`   npx hardhat verify --network bsc ${zusdAddress}`);
    console.log(`   npx hardhat verify --network bsc ${miningAddress} "${zaiAddress}" "${MARKETING_WALLET}" "${OPERATIONAL_WALLET}"`);

    console.log("\n2. 为Mining合约注资 (9M ZAI):");
    console.log(`   - 批准Mining合约: zai.approve("${miningAddress}", ethers.parseEther("9000000"))`);
    console.log(`   - 注资奖励池: mining.fundRewardPool(ethers.parseEther("9000000"))`);

    console.log("\n3. 创建 PancakeSwap 交易对:");
    console.log("   - ZAI/WBNB: https://pancakeswap.finance/add");
    console.log("   - ZUSD/USDT: https://pancakeswap.finance/add");
    console.log(`   - 设置ZAI交易对: zai.setPancakePair("pair地址")`);

    console.log("\n4. 将Mining合约加入ZAI白名单:");
    console.log(`   zai.setWhitelisted("${miningAddress}", true)`);

    // ============ 保存部署信息 ============
    const deploymentInfo = {
        network: "BSC Mainnet",
        chainId: 56,
        deploymentTime: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            ZAI: {
                address: zaiAddress,
                txHash: zai.deploymentTransaction().hash
            },
            ZUSD: {
                address: zusdAddress,
                txHash: zusd.deploymentTransaction().hash
            },
            Mining: {
                address: miningAddress,
                txHash: mining.deploymentTransaction().hash
            }
        },
        wallets: {
            marketing: MARKETING_WALLET,
            operational: OPERATIONAL_WALLET
        }
    };

    const fs = require("fs");
    const filename = `deployment-mainnet-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log(`\n✅ 部署信息已保存到: ${filename}`);
    console.log("\n⚠️  重要提醒:");
    console.log("   - 立即备份此部署信息文件");
    console.log("   - 验证所有合约");
    console.log("   - 测试核心功能");
    console.log("   - 考虑转移owner到多签钱包");
    console.log("\n========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ 部署失败:", error);
        process.exit(1);
    });
