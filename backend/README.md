# Zenithus Swap Monitor

实时监控 USDT → ZUSD → ZAI 的 Swap 交易并记录到 JSON 文件。

## 功能

- 监控 PancakeSwap Pair Swap 事件 (ZUSD/USDT, ZAI/ZUSD)
- 监控代币 Transfer 事件 (USDT, ZUSD, ZAI)
- 自动保存交易记录到 `swap-transactions.json`
- 实时显示交易详情（交易哈希、区块、金额、地址）

## 安装

```bash
cd backend
npm install
```

## 运行

```bash
# 方式1
npm run monitor

# 方式2
npm start

# 方式3
node monitor-swap.js
```

## 输出示例

```
========================================
🚀 Zenithus Swap 监控启动
========================================
RPC: https://bsc-dataseed.binance.org/
日志文件: /root/ZAI/backend/swap-transactions.json
已加载 0 条历史记录
✅ BSC 连接成功，当前区块: 12345678

🔍 开始监控 ZUSD/USDT Pair: 0xe84c0783...
   Token0: 0x55d39832...
   Token1: 0xe6bE6A76...

🔍 开始监控 ZAI/ZUSD Pair: 0x479dbc12...
   Token0: 0xA49c95d8...
   Token1: 0xe6bE6A76...

✅ 所有监控器已启动，实时监控中...
按 Ctrl+C 退出

📊 ZUSD/USDT Swap 检测:
   交易哈希: 0xabc123...
   区块: 12345679
   时间: 2025-10-08T21:30:00.000Z
   发送者: 0x9F23...
   接收者: 0x9F23...
   输入: 0.0000 (token0) / 500.0000 (token1)
   输出: 499.5000 (token0) / 0.0000 (token1)
```

## 数据格式

交易记录保存在 `swap-transactions.json`：

```json
[
  {
    "timestamp": "2025-10-08T21:30:00.000Z",
    "blockNumber": 12345679,
    "txHash": "0xabc123...",
    "pair": "ZUSD/USDT",
    "pairAddress": "0xe84c0783...",
    "sender": "0x9F23...",
    "to": "0x9F23...",
    "amount0In": "0.0000",
    "amount1In": "500.0000",
    "amount0Out": "499.5000",
    "amount1Out": "0.0000"
  }
]
```

## 部署到服务器

```bash
# 1. 上传到服务器
scp -r backend root@38.175.196.119:~/ZAI/

# 2. SSH 登录
ssh root@38.175.196.119

# 3. 安装依赖
cd ~/ZAI/backend
npm install

# 4. 使用 PM2 后台运行
npm install -g pm2
pm2 start monitor-swap.js --name zenithus-monitor
pm2 save
pm2 startup

# 5. 查看日志
pm2 logs zenithus-monitor

# 6. 查看交易记录
cat swap-transactions.json | jq
```

## 停止监控

```bash
# 本地运行: Ctrl+C

# PM2 后台运行:
pm2 stop zenithus-monitor
pm2 delete zenithus-monitor
```

## 配置

修改 `monitor-swap.js` 中的 `CONFIG` 对象：

```javascript
const CONFIG = {
  RPC_URL: 'https://bsc-dataseed.binance.org/',  // RPC 节点
  CONTRACTS: {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    ZUSD: '0xe6bE6A764CE488812E0C875107832656fEDE694F',
    ZAI: '0xA49c95d8B262c3BD8FDFD6A602cca9db21377605',
    // ...
  },
  LOG_FILE: path.join(__dirname, 'swap-transactions.json')
};
```

## 注意事项

- 需要稳定的网络连接到 BSC 节点
- Transfer 事件只记录 > 100 代币的交易（避免噪音）
- 交易记录自动保存，程序崩溃后重启可恢复
- 建议使用 PM2 保持程序持续运行
