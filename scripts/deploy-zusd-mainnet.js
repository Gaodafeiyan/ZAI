const hre = require("hardhat");

/**
 * ZUSD稳定币主网部署脚本
 *
 * 部署到 BSC Mainnet
 *
 * ⚠️ 主网部署前检查清单：
 * - [ ] .env 中 PRIVATE_KEY 是主网钱包私钥
 * - [ ] 钱包有足够 BNB（建议 >0.05 BNB）
 * - [ ] 已在测试网完整测试
 */

async function main() {
    console.log("========================================");
    console.log("  ZUSD 主网部署 - BSC Mainnet");
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
    console.log("\n配置参数:");
    console.log("- 最大供应: 100,000,000,000 ZUSD (100B)");
    console.log("- 初始供应: 0 (通过mint创建)");
    console.log("- 转账燃烧费: 0.1%");
    console.log("- 最大交易: 1% (初始)");
    console.log("- 冷却期: 30秒");
    console.log("- 价格锚定: ZUSD/USDT 1:1 (通过LP)");

    // 最后确认
    console.log("\n⚠️  警告: 即将部署到 BSC 主网！");
    console.log("确认上述配置无误后，5秒后开始部署...\n");

    await new Promise(resolve => setTimeout(resolve, 5000));

    // ============ 部署 ZUSD 合约 ============
    console.log("正在部署 ZUSD 合约...");

    const ZUSD = await hre.ethers.getContractFactory("ZenithUSD");
    const zusd = await ZUSD.deploy();

    console.log("等待交易确认...");
    await zusd.waitForDeployment();

    const zusdAddress = await zusd.getAddress();
    const txHash = zusd.deploymentTransaction().hash;

    console.log("\n✅ ZUSD 合约部署成功!");
    console.log("========================================");
    console.log("合约地址:", zusdAddress);
    console.log("交易哈希:", txHash);
    console.log("区块链浏览器:", `https://bscscan.com/address/${zusdAddress}`);
    console.log("========================================");

    // ============ 验证初始配置 ============
    console.log("\n正在验证合约配置...");

    const name = await zusd.name();
    const symbol = await zusd.symbol();
    const decimals = await zusd.decimals();
    const totalSupply = await zusd.totalSupply();
    const maxSupply = await zusd.MAX_SUPPLY();
    const burnFee = await zusd.burnFee();
    const maxTxAmount = await zusd.maxTxAmount();
    const cooldownTime = await zusd.cooldownTime();

    console.log("\n✅ 合约配置验证:");
    console.log("- 代币名称:", name);
    console.log("- 代币符号:", symbol);
    console.log("- 精度:", decimals);
    console.log("- 当前供应:", hre.ethers.formatEther(totalSupply), symbol);
    console.log("- 最大供应:", hre.ethers.formatEther(maxSupply), symbol);
    console.log("- 燃烧费率:", burnFee, "basis points (0.1%)");
    console.log("- 最大交易:", hre.ethers.formatEther(maxTxAmount), symbol);
    console.log("- 冷却时间:", cooldownTime, "秒");

    // 检查白名单
    const ownerWhitelisted = await zusd.isWhitelisted(deployer.address);
    const contractWhitelisted = await zusd.isWhitelisted(zusdAddress);

    console.log("\n✅ 白名单验证:");
    console.log("- Owner:", ownerWhitelisted ? "✅ 已加入" : "❌ 未加入");
    console.log("- 合约:", contractWhitelisted ? "✅ 已加入" : "❌ 未加入");

    // ============ 后续步骤 ============
    console.log("\n========================================");
    console.log("📋 后续步骤");
    console.log("========================================");

    console.log("\n1️⃣  验证合约（BSCScan）:");
    console.log(`   npx hardhat verify --network bsc ${zusdAddress}`);

    console.log("\n2️⃣  Mint初始供应（用于LP）:");
    console.log("   建议mint: 10,000,000 - 50,000,000 ZUSD");
    console.log(`   await zusd.mint("${deployer.address}", ethers.parseEther("10000000"))`);

    console.log("\n3️⃣  创建 PancakeSwap ZUSD/USDT 交易对:");
    console.log("   访问: https://pancakeswap.finance/add");
    console.log("   - Token A: ZUSD (粘贴合约地址)");
    console.log("   - Token B: USDT (BSC USDT: 0x55d398326f99059fF775485246999027B3197955)");
    console.log("   - 比例: 1:1 (例如: 10000 ZUSD : 10000 USDT)");

    console.log("\n4️⃣  将LP Pair加入白名单:");
    console.log("   - 获取 ZUSD/USDT Pair 地址");
    console.log(`   - 调用: zusd.setWhitelisted("pair地址", true)`);

    console.log("\n5️⃣  测试核心功能:");
    console.log("   - Mint测试");
    console.log("   - 转账测试（0.1%燃烧）");
    console.log("   - 买入/卖出测试（价格稳定性）");
    console.log("   - 冷却期测试");

    console.log("\n6️⃣  可选配置:");
    console.log("   - 调整maxTx: zusd.setMaxTxAmount(amount)");
    console.log("   - 调整冷却: zusd.setCooldownTime(seconds)");
    console.log("   - 添加白名单: zusd.setWhitelisted(address, true)");

    // ============ 保存部署信息 ============
    const deploymentInfo = {
        network: "BSC Mainnet",
        chainId: 56,
        contract: "ZUSD",
        address: zusdAddress,
        transactionHash: txHash,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        configuration: {
            name,
            symbol,
            decimals: decimals.toString(),
            initialSupply: hre.ethers.formatEther(totalSupply),
            maxSupply: hre.ethers.formatEther(maxSupply),
            burnFee: burnFee.toString() + " bp (0.1%)",
            maxTxAmount: hre.ethers.formatEther(maxTxAmount),
            cooldownTime: cooldownTime.toString() + " seconds"
        },
        links: {
            bscscan: `https://bscscan.com/address/${zusdAddress}`,
            transaction: `https://bscscan.com/tx/${txHash}`
        }
    };

    const fs = require("fs");
    const filename = `deployment-zusd-mainnet-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log(`\n✅ 部署信息已保存: ${filename}`);
    console.log("\n⚠️  重要提醒:");
    console.log("   1. 立即备份部署信息文件");
    console.log("   2. 在 BSCScan 验证合约");
    console.log("   3. Mint初始供应用于LP");
    console.log("   4. 测试所有核心功能");

    console.log("\n========================================");
    console.log("🎉 ZUSD 主网部署完成！");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ 部署失败:");
        console.error(error);
        process.exit(1);
    });
