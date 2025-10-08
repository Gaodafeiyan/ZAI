const hre = require("hardhat");

/**
 * ZAI代币主网部署脚本
 *
 * 部署到 BSC Mainnet
 *
 * ⚠️ 主网部署前检查清单：
 * - [ ] .env 中 PRIVATE_KEY 是主网钱包私钥
 * - [ ] 钱包有足够 BNB（建议 >0.2 BNB）
 * - [ ] 营销钱包地址正确
 * - [ ] 已在测试网完整测试
 */

async function main() {
    console.log("========================================");
    console.log("  ZAI 主网部署 - BSC Mainnet");
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
        console.error("   预计部署成本: 0.01-0.03 BNB");
        process.exit(1);
    }

    console.log("✅ BNB余额充足（预计消耗 0.01-0.03 BNB）");

    // ============ 配置参数 ============
    const MARKETING_WALLET = "0x786849bB473d78CA06DbB8224D768E2900Ad3809";

    console.log("\n配置参数:");
    console.log("- 营销钱包:", MARKETING_WALLET);
    console.log("- 初始供应: 10,000,000 ZAI");
    console.log("- 最大供应: 15,000,000 ZAI");
    console.log("- 买入税: 3% 营销 + 2% 燃烧 = 5%");
    console.log("- 卖出税: 2% 营销 + 3% 燃烧 = 5%");

    // 最后确认
    console.log("\n⚠️  警告: 即将部署到 BSC 主网！");
    console.log("确认上述配置无误后，5秒后开始部署...\n");

    await new Promise(resolve => setTimeout(resolve, 5000));

    // ============ 部署 ZAI 合约 ============
    console.log("正在部署 ZAI 合约...");

    const ZAI = await hre.ethers.getContractFactory("ZenithAI");
    const zai = await ZAI.deploy(MARKETING_WALLET);

    console.log("等待交易确认...");
    await zai.waitForDeployment();

    const zaiAddress = await zai.getAddress();
    const txHash = zai.deploymentTransaction().hash;

    console.log("\n✅ ZAI 合约部署成功!");
    console.log("========================================");
    console.log("合约地址:", zaiAddress);
    console.log("交易哈希:", txHash);
    console.log("区块链浏览器:", `https://bscscan.com/address/${zaiAddress}`);
    console.log("========================================");

    // ============ 验证初始配置 ============
    console.log("\n正在验证合约配置...");

    const name = await zai.name();
    const symbol = await zai.symbol();
    const decimals = await zai.decimals();
    const totalSupply = await zai.totalSupply();
    const maxSupply = await zai.MAX_SUPPLY();
    const marketingWallet = await zai.marketingWallet();

    console.log("\n✅ 合约配置验证:");
    console.log("- 代币名称:", name);
    console.log("- 代币符号:", symbol);
    console.log("- 精度:", decimals);
    console.log("- 初始供应:", hre.ethers.formatEther(totalSupply), symbol);
    console.log("- 最大供应:", hre.ethers.formatEther(maxSupply), symbol);
    console.log("- 营销钱包:", marketingWallet);

    // 检查白名单
    const ownerWhitelisted = await zai.isWhitelisted(deployer.address);
    const contractWhitelisted = await zai.isWhitelisted(zaiAddress);
    const marketingWhitelisted = await zai.isWhitelisted(MARKETING_WALLET);

    console.log("\n✅ 白名单验证:");
    console.log("- Owner:", ownerWhitelisted ? "✅ 已加入" : "❌ 未加入");
    console.log("- 合约:", contractWhitelisted ? "✅ 已加入" : "❌ 未加入");
    console.log("- 营销钱包:", marketingWhitelisted ? "✅ 已加入" : "❌ 未加入");

    // ============ 后续步骤 ============
    console.log("\n========================================");
    console.log("📋 后续步骤");
    console.log("========================================");

    console.log("\n1️⃣  验证合约（BSCScan）:");
    console.log(`   npx hardhat verify --network bsc ${zaiAddress} "${MARKETING_WALLET}"`);

    console.log("\n2️⃣  创建 PancakeSwap 交易对:");
    console.log("   访问: https://pancakeswap.finance/add");
    console.log("   - Token A: ZAI (粘贴合约地址)");
    console.log("   - Token B: WBNB");
    console.log("   - 添加初始流动性");

    console.log("\n3️⃣  设置交易对地址（添加流动性后）:");
    console.log("   - 获取 Pair 地址");
    console.log(`   - 调用: zai.setPancakePair("pair地址")`);

    console.log("\n4️⃣  为 Mining 合约预留 ZAI:");
    console.log("   - 部署 Mining 合约后");
    console.log("   - 将 Mining 地址加入白名单");
    console.log(`   - Mint 9M ZAI: zai.mint("mining地址", ethers.parseEther("9000000"))`);

    console.log("\n5️⃣  测试核心功能:");
    console.log("   - 转账测试（白名单免税）");
    console.log("   - 买入测试（5%税）");
    console.log("   - 卖出测试（5%税）");

    console.log("\n6️⃣  安全建议:");
    console.log("   - 考虑将 owner 转移到多签钱包");
    console.log("   - 备份部署信息");
    console.log("   - 监控合约活动");

    // ============ 保存部署信息 ============
    const deploymentInfo = {
        network: "BSC Mainnet",
        chainId: 56,
        contract: "ZAI",
        address: zaiAddress,
        transactionHash: txHash,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        configuration: {
            name,
            symbol,
            decimals: decimals.toString(),
            initialSupply: hre.ethers.formatEther(totalSupply),
            maxSupply: hre.ethers.formatEther(maxSupply),
            marketingWallet: MARKETING_WALLET
        },
        fees: {
            buyMarketing: "3%",
            buyBurn: "2%",
            sellMarketing: "2%",
            sellBurn: "3%"
        },
        links: {
            bscscan: `https://bscscan.com/address/${zaiAddress}`,
            transaction: `https://bscscan.com/tx/${txHash}`
        }
    };

    const fs = require("fs");
    const filename = `deployment-zai-mainnet-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log(`\n✅ 部署信息已保存: ${filename}`);
    console.log("\n⚠️  重要提醒:");
    console.log("   1. 立即备份部署信息文件");
    console.log("   2. 在 BSCScan 验证合约");
    console.log("   3. 测试所有核心功能");
    console.log("   4. 准备公告材料");

    console.log("\n========================================");
    console.log("🎉 ZAI 主网部署完成！");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ 部署失败:");
        console.error(error);
        process.exit(1);
    });
