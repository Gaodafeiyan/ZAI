# Zenithus DeFi Protocol - Smart Contracts

## 项目简介 / Project Overview

Zenithus是一个部署在Binance Smart Chain (BSC)上的去中心化金融(DeFi)协议，包含两个核心代币和完整的生态系统。

**核心代币：**
- **ZAI (ZenithAI)** - 治理代币，带交易税机制
- **ZUSD (Zenith USD)** - 稳定币，通过PancakeSwap LP锚定USDT 1:1

---

## 合约文件 / Contracts

### 1. ZAI.sol - 治理代币
**特性：**
- ✅ BEP-20标准代币
- ✅ 总供应量：10,000,000 ZAI（初始），最大15,000,000 ZAI
- ✅ 买入税：3%营销 + 2%燃烧 = 5%
- ✅ 卖出税：2%营销 + 3%燃烧 = 5%
- ✅ 白名单机制（免税地址）
- ✅ Mint功能（为质押合约增发）
- ✅ 营销钱包：`0x786849bB473d78CA06DbB8224D768E2900Ad3809`

**文件位置：** `contracts/ZAI.sol`

---

### 2. ZUSD.sol - 稳定币
**特性：**
- ✅ BEP-20标准代币
- ✅ 最大供应量：100,000,000,000 ZUSD（1000亿）
- ✅ 初始供应：0（通过mint创建）
- ✅ 转账燃烧费：0.1%
- ✅ 无买卖税（保持价格稳定）
- ✅ 白名单机制
- ✅ 黑名单机制
- ✅ 反机器人保护：
  - 最大交易限制（初始1%）
  - 交易冷却期（30秒）
- ✅ 通过ZUSD/USDT LP锚定1:1价格

**文件位置：** `contracts/ZUSD.sol`

---

## 项目结构 / Project Structure

```
ZAI/
├── contracts/           # 智能合约
│   ├── ZAI.sol         # ZAI治理代币
│   └── ZUSD.sol        # ZUSD稳定币
├── test/               # 测试文件
│   ├── ZAI.test.js     # ZAI合约测试
│   └── ZUSD.test.js    # ZUSD合约测试
├── scripts/            # 部署脚本
│   ├── deploy.js       # ZAI部署脚本
│   └── deploy-zusd.js  # ZUSD部署脚本
├── hardhat.config.js   # Hardhat配置
├── package.json        # 项目依赖
├── .env.example        # 环境变量示例
├── DEPLOYMENT.md       # 详细部署指南
└── README.md           # 项目文档
```

---

## 快速开始 / Quick Start

### 1. 安装依赖 / Install Dependencies
```bash
npm install
```

### 2. 配置环境变量 / Configure Environment
```bash
# 复制示例文件
cp .env.example .env

# 编辑.env文件，填入：
# - PRIVATE_KEY: 你的钱包私钥
# - BSCSCAN_API_KEY: BSCScan API密钥
```

### 3. 编译合约 / Compile Contracts
```bash
npx hardhat compile
```

### 4. 运行测试 / Run Tests
```bash
# 测试所有合约
npx hardhat test

# 测试单个合约
npx hardhat test test/ZAI.test.js
npx hardhat test test/ZUSD.test.js
```

### 5. 部署到测试网 / Deploy to Testnet
```bash
# 部署ZAI
npx hardhat run scripts/deploy.js --network bscTestnet

# 部署ZUSD
npx hardhat run scripts/deploy-zusd.js --network bscTestnet
```

### 6. 验证合约 / Verify Contracts
```bash
# 验证ZAI（需要构造函数参数）
npx hardhat verify --network bscTestnet ZAI_ADDRESS "0x786849bB473d78CA06DbB8224D768E2900Ad3809"

# 验证ZUSD（无构造函数参数）
npx hardhat verify --network bscTestnet ZUSD_ADDRESS
```

---

## 测试覆盖 / Test Coverage

### ZAI.sol 测试
- ✅ 部署和初始化
- ✅ 白名单机制
- ✅ 买入税（3%营销 + 2%燃烧）
- ✅ 卖出税（2%营销 + 3%燃烧）
- ✅ 普通转账（不收税）
- ✅ Mint功能和供应量限制
- ✅ 费率调整
- ✅ 营销钱包更新
- ✅ 查询函数

### ZUSD.sol 测试
- ✅ 部署和初始化
- ✅ Mint功能和最大供应量
- ✅ 燃烧费机制（0.1%）
- ✅ 白名单功能
- ✅ 黑名单功能
- ✅ 最大交易限制
- ✅ 冷却期机制
- ✅ 访问控制
- ✅ 集成场景测试

---

## 部署指南 / Deployment Guide

完整部署步骤请参考：**[DEPLOYMENT.md](./DEPLOYMENT.md)**

**关键步骤：**
1. 在BSC测试网部署合约
2. 在BSCScan验证合约代码
3. Mint初始供应量
4. 在PancakeSwap创建流动性池
5. 配置白名单和反机器人参数
6. 部署到主网
7. 监控价格稳定性

---

## 安全考虑 / Security Considerations

### 已实施的安全措施：
- ✅ 使用OpenZeppelin审计过的合约（ERC20, Ownable）
- ✅ Solidity 0.8.20 内置SafeMath（溢出保护）
- ✅ 无重入攻击风险（无外部调用）
- ✅ Owner权限功能（后期转DAO治理）
- ✅ 事件日志记录（透明度）
- ✅ 最大供应量限制（防止无限增发）
- ✅ 白名单/黑名单机制
- ✅ 反机器人保护

### 建议的额外审计：
- 🔍 第三方智能合约审计（推荐CertiK、PeckShield）
- 🔍 Bug赏金计划
- 🔍 时间锁合约（延迟执行关键操作）
- 🔍 多签钱包管理Owner权限

---

## 技术栈 / Tech Stack

- **Solidity**: ^0.8.20
- **Hardhat**: 智能合约开发框架
- **OpenZeppelin**: 安全合约库
- **Ethers.js**: 区块链交互库
- **Chai**: 测试断言库
- **BSC**: Binance Smart Chain

---

## 网络配置 / Network Configuration

### BSC主网 / BSC Mainnet
- **Chain ID**: 56
- **RPC URL**: https://bsc-dataseed1.binance.org
- **区块浏览器**: https://bscscan.com

### BSC测试网 / BSC Testnet
- **Chain ID**: 97
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545
- **区块浏览器**: https://testnet.bscscan.com
- **水龙头**: https://testnet.binance.org/faucet-smart

---

## 常见问题 / FAQ

### Q1: 为什么ZAI有交易税而ZUSD没有？
**A:** ZAI是治理代币，交易税用于生态建设（营销）和通缩（燃烧）。ZUSD是稳定币，需要保持价格稳定，因此无买卖税，只有微小的转账燃烧费（0.1%）。

### Q2: ZUSD如何保持1:1锚定USDT？
**A:** 通过PancakeSwap的ZUSD/USDT流动性池，利用套利机制维持价格平衡。不是真实的法币锚定（无储备金）。

### Q3: 如何获取测试网BNB？
**A:** 访问 https://testnet.binance.org/faucet-smart 使用水龙头获取测试BNB。

### Q4: 合约Owner权限什么时候转移？
**A:** 初期由团队管理，待DAO治理合约部署后，将通过时间锁合约转移至DAO多签。

### Q5: 如何报告安全漏洞？
**A:** 请发送邮件至 security@zenithus.io（待配置），或在GitHub私密提交issue。

---

## 路线图 / Roadmap

### Phase 1: 基础代币 ✅
- [x] ZAI治理代币合约
- [x] ZUSD稳定币合约
- [x] 完整测试套件
- [x] 部署文档

### Phase 2: 生态扩展 🚧
- [ ] 质押合约（Staking）
- [ ] 流动性挖矿（Liquidity Mining）
- [ ] DAO治理合约
- [ ] 时间锁合约

### Phase 3: 集成与优化 📋
- [ ] 跨链桥接
- [ ] NFT市场集成
- [ ] 移动端DApp
- [ ] 审计报告

---

## 贡献指南 / Contributing

欢迎提交问题和拉取请求！

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

---

## 许可证 / License

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 联系方式 / Contact

- **Website**: https://zenithus.io (待上线)
- **Twitter**: @ZenithusDAO (待创建)
- **Telegram**: t.me/zenithus (待创建)
- **GitHub**: https://github.com/Gaodafeiyan/ZAI

---

## 免责声明 / Disclaimer

本项目仅供学习和研究目的。投资加密货币有风险，请自行研究并承担风险。合约未经第三方审计前，请勿在主网部署大量资金。

---

**Built with ❤️ by Zenithus Team**
