# Zenithus 自动兑换系统

监控USDT转入，自动转出ZUSD的脚本。

## 🎯 功能

- ✅ 监听用户转USDT到监控钱包
- ✅ 自动按1:1转出ZUSD给用户
- ✅ 金额限制保护（最小/最大）
- ✅ 余额不足检测
- ✅ 交易去重（避免重复处理）
- ✅ 完整日志记录
- ✅ 自动保存已处理交易

## 📋 工作流程

```
用户: 500 USDT → 监控钱包
  ↓
脚本检测到转账
  ↓
验证金额范围 (10-10000 USDT)
  ↓
检查监控钱包ZUSD余额 >= 500
  ↓
自动转账: 500 ZUSD → 用户钱包
  ↓
记录日志 ✅
```

## ⚙️ 配置

### 1. 创建 `.env` 文件

```bash
cd ~/ZAI/backend
cp .env.example .env
nano .env
```

### 2. 填写配置（⚠️ 重要）

```env
# BSC RPC节点
RPC_URL=https://bsc-dataseed.binance.org/

# 监控钱包地址（接收用户的USDT）
MONITOR_WALLET=0xYourMonitorWalletAddress

# 监控钱包私钥（用于自动转出ZUSD）⚠️ 请妥善保管
PRIVATE_KEY=0xYourPrivateKeyHere

# 兑换限额
MIN_SWAP_AMOUNT=10
MAX_SWAP_AMOUNT=10000
```

## 🚀 部署

### 1. 安装依赖

```bash
cd ~/ZAI/backend
npm install
```

### 2. 测试运行

```bash
node auto-swap.js
```

**应该看到：**
```
========================================
🤖 Zenithus 自动兑换系统启动
========================================
RPC: https://bsc-dataseed.binance.org/
监控钱包: 0x...
✅ BSC 连接成功，当前区块: 64154XXX
💰 监控钱包ZUSD余额: 50000.0000 ZUSD

🔍 开始监听USDT转入...
```

### 3. 使用PM2后台运行

```bash
pm2 start auto-swap.js --name zenithus-auto-swap
pm2 save
pm2 logs zenithus-auto-swap
```

## 📊 日志文件

### `auto-swap-logs.json`
记录所有兑换操作：
```json
[
  {
    "timestamp": "2025-10-10T17:30:00.000Z",
    "status": "success",
    "originalTx": "0xabc123...",
    "zusdTx": "0xdef456...",
    "blockNumber": 64154500,
    "userAddress": "0x9F23...",
    "usdtAmount": "500",
    "zusdAmount": "500",
    "gasUsed": "51234"
  }
]
```

### `processed-txs.json`
已处理的交易哈希（避免重复）：
```json
[
  "0xabc123...",
  "0xdef456..."
]
```

## ⚠️ 安全注意事项

1. **私钥保护**
   - ❌ 不要把 `.env` 提交到git
   - ✅ 使用 `.gitignore` 排除 `.env`
   - ✅ 只在服务器上配置真实私钥

2. **余额监控**
   - 定期检查监控钱包ZUSD余额
   - 余额不足时会记录日志但不会转账

3. **限额保护**
   - 超过最大限额的交易会标记为待审核
   - 低于最小限额的交易会跳过

## 🔧 常用命令

```bash
# 查看运行状态
pm2 list

# 查看实时日志
pm2 logs zenithus-auto-swap

# 查看兑换记录
cat auto-swap-logs.json | jq .

# 查看已处理交易
cat processed-txs.json | jq .

# 重启脚本
pm2 restart zenithus-auto-swap

# 停止脚本
pm2 stop zenithus-auto-swap
```

## 🐛 故障排除

### 问题1: 私钥错误
```
❌ 错误: 私钥对应地址与监控钱包不匹配
```
**解决**: 检查 `.env` 中的 `PRIVATE_KEY` 和 `MONITOR_WALLET` 是否匹配

### 问题2: ZUSD余额不足
```
⚠️ ZUSD余额不足: 需要 500, 当前 100
```
**解决**: 向监控钱包转入更多ZUSD

### 问题3: RPC连接失败
```
❌ 启动失败: could not detect network
```
**解决**: 检查RPC_URL或更换BSC节点

## 📈 监控指标

脚本会自动记录：
- ✅ 成功兑换次数
- ❌ 失败兑换（余额不足、金额超限）
- ⏸️ 待审核（超过最大限额）
- 📊 总USDT流入
- 📊 总ZUSD流出
- ⛽ Gas消耗统计
