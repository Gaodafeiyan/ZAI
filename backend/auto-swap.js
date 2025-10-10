/**
 * Zenithus Auto Swap Script
 * 监控USDT转入，自动转出ZUSD给用户
 */

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  RPC_URL: process.env.RPC_URL || 'https://bsc-dataseed.binance.org/',
  MONITOR_WALLET: process.env.MONITOR_WALLET, // 监控钱包地址（接收USDT）
  PRIVATE_KEY: process.env.PRIVATE_KEY, // 监控钱包私钥（用于转出ZUSD）
  CONTRACTS: {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    ZUSD: '0xe6bE6A764CE488812E0C875107832656fEDE694F',
  },
  MIN_AMOUNT: parseFloat(process.env.MIN_SWAP_AMOUNT || '10'), // 最小兑换金额
  MAX_AMOUNT: parseFloat(process.env.MAX_SWAP_AMOUNT || '10000'), // 最大兑换金额
  LOG_FILE: path.join(__dirname, 'auto-swap-logs.json'),
  PROCESSED_FILE: path.join(__dirname, 'processed-txs.json') // 已处理的交易
};

// 验证必需配置
if (!CONFIG.MONITOR_WALLET) {
  console.error('❌ 错误: 未设置 MONITOR_WALLET 环境变量');
  process.exit(1);
}

if (!CONFIG.PRIVATE_KEY) {
  console.error('❌ 错误: 未设置 PRIVATE_KEY 环境变量');
  process.exit(1);
}

// ERC20 ABI
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// 初始化
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
const usdtContract = new ethers.Contract(CONFIG.CONTRACTS.USDT, ERC20_ABI, provider);
const zusdContract = new ethers.Contract(CONFIG.CONTRACTS.ZUSD, ERC20_ABI, wallet);

// 加载已处理的交易
let processedTxs = new Set();
function loadProcessedTxs() {
  try {
    if (fs.existsSync(CONFIG.PROCESSED_FILE)) {
      const data = fs.readFileSync(CONFIG.PROCESSED_FILE, 'utf8');
      processedTxs = new Set(JSON.parse(data));
      console.log(`✅ 已加载 ${processedTxs.size} 条已处理交易记录`);
    }
  } catch (error) {
    console.error('加载已处理交易失败:', error.message);
  }
}

function saveProcessedTx(txHash) {
  processedTxs.add(txHash);
  try {
    fs.writeFileSync(CONFIG.PROCESSED_FILE, JSON.stringify([...processedTxs], null, 2));
  } catch (error) {
    console.error('保存已处理交易失败:', error.message);
  }
}

// 记录日志
const logs = [];
function loadLogs() {
  try {
    if (fs.existsSync(CONFIG.LOG_FILE)) {
      const data = fs.readFileSync(CONFIG.LOG_FILE, 'utf8');
      logs.push(...JSON.parse(data));
    }
  } catch (error) {
    console.error('加载日志失败:', error.message);
  }
}

function saveLogs() {
  try {
    fs.writeFileSync(CONFIG.LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('保存日志失败:', error.message);
  }
}

// 格式化金额
function formatAmount(amount, decimals = 18) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// 检查ZUSD余额
async function checkZusdBalance() {
  try {
    const balance = await zusdContract.balanceOf(CONFIG.MONITOR_WALLET);
    const formatted = formatAmount(balance, 18);
    console.log(`💰 监控钱包ZUSD余额: ${formatted} ZUSD`);
    return balance;
  } catch (error) {
    console.error('检查ZUSD余额失败:', error.message);
    return 0n;
  }
}

// 自动转账ZUSD
async function autoTransferZusd(userAddress, usdtAmount, originalTxHash) {
  try {
    const zusdAmount = ethers.parseUnits(usdtAmount.toString(), 18);

    console.log(`\n🔄 准备转账 ${usdtAmount} ZUSD 给 ${userAddress}`);

    // 检查余额
    const balance = await zusdContract.balanceOf(CONFIG.MONITOR_WALLET);
    if (balance < zusdAmount) {
      const error = `⚠️ ZUSD余额不足: 需要 ${usdtAmount}, 当前 ${formatAmount(balance)}`;
      console.error(error);

      // 记录失败日志
      logs.push({
        timestamp: new Date().toISOString(),
        status: 'failed',
        reason: 'insufficient_zusd_balance',
        originalTx: originalTxHash,
        userAddress,
        usdtAmount: usdtAmount.toString(),
        zusdBalance: formatAmount(balance)
      });
      saveLogs();
      return false;
    }

    // 执行转账
    console.log(`📤 正在转账 ${usdtAmount} ZUSD...`);
    const tx = await zusdContract.transfer(userAddress, zusdAmount);
    console.log(`⏳ 交易已提交: ${tx.hash}`);
    console.log(`   等待确认...`);

    const receipt = await tx.wait();
    console.log(`✅ 转账成功！`);
    console.log(`   交易哈希: ${receipt.hash}`);
    console.log(`   区块: ${receipt.blockNumber}`);
    console.log(`   Gas使用: ${receipt.gasUsed.toString()}`);

    // 记录成功日志
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: 'success',
      originalTx: originalTxHash,
      zusdTx: receipt.hash,
      blockNumber: receipt.blockNumber,
      userAddress,
      usdtAmount: usdtAmount.toString(),
      zusdAmount: usdtAmount.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
    logs.push(logEntry);
    saveLogs();

    return true;

  } catch (error) {
    console.error(`❌ 转账失败:`, error.message);

    // 记录错误日志
    logs.push({
      timestamp: new Date().toISOString(),
      status: 'error',
      originalTx: originalTxHash,
      userAddress,
      usdtAmount: usdtAmount.toString(),
      error: error.message
    });
    saveLogs();

    return false;
  }
}

// 处理USDT转账事件
async function handleUsdtTransfer(from, to, amount, event) {
  try {
    const txHash = event.log.transactionHash;

    // 检查是否已处理
    if (processedTxs.has(txHash)) {
      return;
    }

    // 只处理转给监控钱包的交易
    if (to.toLowerCase() !== CONFIG.MONITOR_WALLET.toLowerCase()) {
      return;
    }

    const blockNumber = event.log.blockNumber;
    const timestamp = (await provider.getBlock(blockNumber)).timestamp;
    const usdtAmount = parseFloat(formatAmount(amount, 18));

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💸 检测到USDT转入!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   时间: ${new Date(timestamp * 1000).toISOString()}`);
    console.log(`   交易: ${txHash}`);
    console.log(`   区块: ${blockNumber}`);
    console.log(`   来自: ${from}`);
    console.log(`   金额: ${usdtAmount} USDT`);

    // 验证金额范围
    if (usdtAmount < CONFIG.MIN_AMOUNT) {
      console.log(`⚠️ 金额低于最小限制 (${CONFIG.MIN_AMOUNT} USDT)，跳过`);
      saveProcessedTx(txHash);
      return;
    }

    if (usdtAmount > CONFIG.MAX_AMOUNT) {
      console.log(`⚠️ 金额超过最大限制 (${CONFIG.MAX_AMOUNT} USDT)，需要人工审核`);
      logs.push({
        timestamp: new Date().toISOString(),
        status: 'pending_review',
        originalTx: txHash,
        userAddress: from,
        usdtAmount: usdtAmount.toString(),
        reason: 'amount_exceeds_max'
      });
      saveLogs();
      saveProcessedTx(txHash);
      return;
    }

    // 自动转账ZUSD (1:1)
    const success = await autoTransferZusd(from, usdtAmount, txHash);

    if (success) {
      console.log(`✅ 自动兑换完成: ${usdtAmount} USDT → ${usdtAmount} ZUSD`);
    } else {
      console.log(`❌ 自动兑换失败`);
    }

    // 标记为已处理
    saveProcessedTx(txHash);

  } catch (error) {
    console.error('处理USDT转账失败:', error.message);
  }
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('🤖 Zenithus 自动兑换系统启动');
  console.log('========================================');
  console.log(`RPC: ${CONFIG.RPC_URL}`);
  console.log(`监控钱包: ${CONFIG.MONITOR_WALLET}`);
  console.log(`钱包地址: ${wallet.address}`);
  console.log(`USDT合约: ${CONFIG.CONTRACTS.USDT}`);
  console.log(`ZUSD合约: ${CONFIG.CONTRACTS.ZUSD}`);
  console.log(`兑换限额: ${CONFIG.MIN_AMOUNT} - ${CONFIG.MAX_AMOUNT} USDT`);
  console.log(`日志文件: ${CONFIG.LOG_FILE}`);

  // 验证钱包地址匹配
  if (wallet.address.toLowerCase() !== CONFIG.MONITOR_WALLET.toLowerCase()) {
    console.error(`\n❌ 错误: 私钥对应地址 ${wallet.address} 与监控钱包 ${CONFIG.MONITOR_WALLET} 不匹配`);
    process.exit(1);
  }

  try {
    // 测试连接
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ BSC 连接成功，当前区块: ${blockNumber}`);

    // 加载数据
    loadProcessedTxs();
    loadLogs();

    // 检查ZUSD余额
    await checkZusdBalance();

    // 监听USDT转账到监控钱包
    console.log(`\n🔍 开始监听USDT转入 ${CONFIG.MONITOR_WALLET}...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    usdtContract.on('Transfer', handleUsdtTransfer);

    // 定期检查余额（每小时）
    setInterval(async () => {
      await checkZusdBalance();
    }, 3600000);

    // 保持脚本运行
    process.on('SIGINT', () => {
      console.log('\n\n🛑 停止监控...');
      saveLogs();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

// 启动
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
