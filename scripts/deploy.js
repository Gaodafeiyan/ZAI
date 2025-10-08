const hre = require("hardhat");

/**
 * ZAI代币部署脚本（BSC主网/测试网）
 *
 * 部署流程：
 * 1. 部署ZAI合约
 * 2. 验证初始配置
 * 3. 输出合约地址和验证命令
 */
async function main() {
    console.log("====================================");
    console.log("开始部署 ZenithAI (ZAI) 代币合约");
    console.log("====================================\n");

    // 获取部署账户
    const [deployer] = await hre.ethers.getSigners();
    console.log("部署账户:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("账户余额:", hre.ethers.formatEther(balance), "BNB\n");

    // 配置营销钱包地址（根据实际情况修改）
    const MARKETING_WALLET = "0x786849bB473d78CA06DbB8224D768E2900Ad3809";

    console.log("配置参数:");
    console.log("- 营销钱包:", MARKETING_WALLET);
    console.log("- 初始供应量: 10,000,000 ZAI");
    console.log("- 最大供应量: 15,000,000 ZAI");
    console.log("- 买入税: 3%营销 + 2%燃烧");
    console.log("- 卖出税: 2%营销 + 3%燃烧\n");

    // 部署合约
    console.log("正在部署合约...");
    const ZAI = await hre.ethers.getContractFactory("ZenithAI");
    const zai = await ZAI.deploy(MARKETING_WALLET);

    await zai.waitForDeployment();
    const zaiAddress = await zai.getAddress();

    console.log("\n✅ ZAI合约部署成功!");
    console.log("合约地址:", zaiAddress);
    console.log("交易哈希:", zai.deploymentTransaction().hash);

    // 验证初始配置
    console.log("\n====================================");
    console.log("验证初始配置");
    console.log("====================================");

    const name = await zai.name();
    const symbol = await zai.symbol();
    const totalSupply = await zai.totalSupply();
    const marketingWallet = await zai.marketingWallet();
    const ownerBalance = await zai.balanceOf(deployer.address);

    console.log("代币名称:", name);
    console.log("代币符号:", symbol);
    console.log("总供应量:", hre.ethers.formatEther(totalSupply), symbol);
    console.log("营销钱包:", marketingWallet);
    console.log("部署者余额:", hre.ethers.formatEther(ownerBalance), symbol);

    // 检查白名单
    const isOwnerWhitelisted = await zai.isWhitelisted(deployer.address);
    const isContractWhitelisted = await zai.isWhitelisted(zaiAddress);
    const isMarketingWhitelisted = await zai.isWhitelisted(MARKETING_WALLET);

    console.log("\n白名单状态:");
    console.log("- Owner:", isOwnerWhitelisted ? "✅" : "❌");
    console.log("- 合约:", isContractWhitelisted ? "✅" : "❌");
    console.log("- 营销钱包:", isMarketingWhitelisted ? "✅" : "❌");

    // 输出后续步骤
    console.log("\n====================================");
    console.log("后续部署步骤");
    console.log("====================================");
    console.log("\n1. 在BSCScan验证合约:");
    console.log(`   npx hardhat verify --network bsc ${zaiAddress} "${MARKETING_WALLET}"`);

    console.log("\n2. 在PancakeSwap创建交易对:");
    console.log("   - 访问 https://pancakeswap.finance/add");
    console.log("   - 选择 ZAI + WBNB");
    console.log("   - 添加初始流动性");

    console.log("\n3. 设置交易对地址:");
    console.log(`   await zai.setPancakePair("交易对地址");`);

    console.log("\n4. 可选：添加更多白名单地址");
    console.log(`   await zai.setWhitelisted("地址", true);`);

    console.log("\n5. 准备质押合约并mint奖励代币:");
    console.log(`   await zai.mint("质押合约地址", ethers.parseEther("5000000"));`);

    // 保存部署信息
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: zaiAddress,
        deployerAddress: deployer.address,
        marketingWallet: MARKETING_WALLET,
        deploymentTime: new Date().toISOString(),
        transactionHash: zai.deploymentTransaction().hash,
        constructorArgs: [MARKETING_WALLET]
    };

    const fs = require("fs");
    fs.writeFileSync(
        "deployment-info.json",
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✅ 部署信息已保存到 deployment-info.json");
    console.log("\n====================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
