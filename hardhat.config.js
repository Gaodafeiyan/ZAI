require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Hardhat配置文件
 *
 * 环境变量（在.env文件中配置）：
 * - PRIVATE_KEY: 部署账户的私钥
 * - BSCSCAN_API_KEY: BSCScan API密钥（用于合约验证）
 */

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200, // 优化gas消耗
            },
        },
    },
    networks: {
        // BSC主网
        bsc: {
            url: "https://bsc-dataseed1.binance.org",
            chainId: 56,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            gasPrice: 3000000000, // 3 Gwei
        },
        // BSC测试网
        bscTestnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            gasPrice: 10000000000, // 10 Gwei
        },
        // 本地测试网络
        hardhat: {
            chainId: 1337,
        },
    },
    etherscan: {
        apiKey: {
            bsc: process.env.BSCSCAN_API_KEY || "",
            bscTestnet: process.env.BSCSCAN_API_KEY || "",
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
