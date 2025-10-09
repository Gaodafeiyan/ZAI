/**
 * Zenithus Swap Monitor
 * 监控 USDT → ZUSD → ZAI 的 Swap 交易并记录到数据库
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  RPC_URL: 'https://bsc-dataseed.binance.org/',
  CONTRACTS: {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    ZUSD: '0xe6bE6A764CE488812E0C875107832656fEDE694F',
    ZAI: '0xA49c95d8B262c3BD8FDFD6A602cca9db21377605',
    PANCAKE_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    ZAI_ZUSD_PAIR: '0x479dbc12bc07b824ffc0df59bc90e3c9ee72ee6a',
    ZUSD_USDT_PAIR: '0xe84c0783cea2214fa747a6bc974322d45aeaabba'
  },
  LOG_FILE: path.join(__dirname, 'swap-transactions.json')
};

// ABIs
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'function decimals() view returns (uint8)'
];

const PAIR_ABI = [
  'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
];

// 初始化
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const transactions = loadTransactions();

// 加载已保存的交易记录
function loadTransactions() {
  try {
    if (fs.existsSync(CONFIG.LOG_FILE)) {
      const data = fs.readFileSync(CONFIG.LOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载交易记录失败:', error.message);
  }
  return [];
}

// 保存交易记录
function saveTransactions() {
  try {
    fs.writeFileSync(CONFIG.LOG_FILE, JSON.stringify(transactions, null, 2));
    console.log(`✅ 已保存 ${transactions.length} 条交易记录到 ${CONFIG.LOG_FILE}`);
  } catch (error) {
    console.error('保存交易记录失败:', error.message);
  }
}

// 格式化金额
function formatAmount(amount, decimals = 18) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// 监控 Pair Swap 事件
async function monitorPairSwaps(pairAddress, pairName) {
  const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);

  console.log(`\n🔍 开始监控 ${pairName} Pair: ${pairAddress}`);

  // 获取 token0 和 token1
  const token0 = await pairContract.token0();
  const token1 = await pairContract.token1();
  console.log(`   Token0: ${token0}`);
  console.log(`   Token1: ${token1}`);

  pairContract.on('Swap', async (sender, amount0In, amount1In, amount0Out, amount1Out, to, event) => {
    try {
      const txHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;
      const timestamp = (await provider.getBlock(blockNumber)).timestamp;

      const record = {
        timestamp: new Date(timestamp * 1000).toISOString(),
        blockNumber,
        txHash,
        pair: pairName,
        pairAddress,
        sender,
        to,
        amount0In: formatAmount(amount0In),
        amount1In: formatAmount(amount1In),
        amount0Out: formatAmount(amount0Out),
        amount1Out: formatAmount(amount1Out)
      };

      console.log(`\n📊 ${pairName} Swap 检测:`)
      console.log(`   交易哈希: ${txHash}`);
      console.log(`   区块: ${blockNumber}`);
      console.log(`   时间: ${record.timestamp}`);
      console.log(`   发送者: ${sender}`);
      console.log(`   接收者: ${to}`);
      console.log(`   输入: ${record.amount0In} (token0) / ${record.amount1In} (token1)`);
      console.log(`   输出: ${record.amount0Out} (token0) / ${record.amount1Out} (token1)`);

      // 保存记录
      transactions.push(record);
      saveTransactions();

    } catch (error) {
      console.error('处理 Swap 事件失败:', error.message);
    }
  });
}

// 监控 Token Transfer 事件
async function monitorTokenTransfers(tokenAddress, tokenName) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  console.log(`\n🔍 开始监控 ${tokenName} Transfer: ${tokenAddress}`);

  // 获取 decimals
  const decimals = await tokenContract.decimals();
  console.log(`   Decimals: ${decimals}`);

  // 只监控大额转账（> 100 代币）
  const THRESHOLD = ethers.parseUnits('100', decimals);

  tokenContract.on('Transfer', async (from, to, amount, event) => {
    try {
      if (amount < THRESHOLD) return; // 忽略小额转账

      const txHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;
      const timestamp = (await provider.getBlock(blockNumber)).timestamp;

      const record = {
        timestamp: new Date(timestamp * 1000).toISOString(),
        blockNumber,
        txHash,
        token: tokenName,
        tokenAddress,
        from,
        to,
        amount: formatAmount(amount, decimals)
      };

      console.log(`\n💸 ${tokenName} Transfer 检测:`)
      console.log(`   交易哈希: ${txHash}`);
      console.log(`   区块: ${blockNumber}`);
      console.log(`   时间: ${record.timestamp}`);
      console.log(`   从: ${from}`);
      console.log(`   到: ${to}`);
      console.log(`   金额: ${record.amount} ${tokenName}`);

      // 保存记录
      transactions.push(record);
      saveTransactions();

    } catch (error) {
      console.error('处理 Transfer 事件失败:', error.message);
    }
  });
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('🚀 Zenithus Swap 监控启动');
  console.log('========================================');
  console.log(`RPC: ${CONFIG.RPC_URL}`);
  console.log(`日志文件: ${CONFIG.LOG_FILE}`);
  console.log(`已加载 ${transactions.length} 条历史记录`);

  try {
    // 测试连接
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ BSC 连接成功，当前区块: ${blockNumber}`);

    // 监控 Pair Swap 事件
    await monitorPairSwaps(CONFIG.CONTRACTS.ZUSD_USDT_PAIR, 'ZUSD/USDT');
    await monitorPairSwaps(CONFIG.CONTRACTS.ZAI_ZUSD_PAIR, 'ZAI/ZUSD');

    // 监控 Token Transfer 事件
    await monitorTokenTransfers(CONFIG.CONTRACTS.USDT, 'USDT');
    await monitorTokenTransfers(CONFIG.CONTRACTS.ZUSD, 'ZUSD');
    await monitorTokenTransfers(CONFIG.CONTRACTS.ZAI, 'ZAI');

    console.log('\n✅ 所有监控器已启动，实时监控中...');
    console.log('按 Ctrl+C 退出\n');

    // 保持脚本运行
    process.on('SIGINT', () => {
      console.log('\n\n🛑 停止监控...');
      saveTransactions();
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
