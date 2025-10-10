// Contract addresses - 硬编码版本（无需环境变量）
export const CONTRACTS = {
  ZAI: '0xE6BE6A764cE488812E0c875107832656FedE694f', // ZAI Token
  ZUSD: '0xa49c95d8b262c3bd8fdfd6a602cca9db21377605', // ZUSD Token
  MINING: import.meta.env.VITE_MINING_ADDRESS || '0x0000000000000000000000000000000000000000',
  ZAI_ZUSD_PAIR: '0x479dbc12bc07b824ffc0df59bc90e3c9ee72ee6a', // ZAI/ZUSD PancakeSwap LP
  ZUSD_USDT_PAIR: import.meta.env.VITE_ZUSD_USDT_PAIR || '0x0000000000000000000000000000000000000000',
  USDT: '0x55d398326f99059fF775485246999027B3197955', // BSC USDT
  PANCAKE_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2 Router
  MONITOR_WALLET: '0x9f23A8F64dae73385A3764dC050585dBe27834E0' // 监控钱包地址（OTC兑换）
};

// Chain configuration
export const CHAIN_CONFIG = {
  chainId: `0x${Number(import.meta.env.VITE_CHAIN_ID).toString(16)}`,
  chainName: import.meta.env.VITE_CHAIN_NAME,
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: [import.meta.env.VITE_RPC_URL],
  blockExplorerUrls: ['https://bscscan.com']
};

// Mining parameters (30-year cycle)
export const MINING_PARAMS = {
  INITIAL_DAILY_REWARD: '328', // ZAI per day
  DECAY_RATE: '0.9999636', // Daily decay
  TOTAL_POOL: '9000000', // 9M ZAI
  CYCLE_DAYS: 10950, // 30 years
  MIN_PURCHASE: '500', // Minimum ZAI to buy miner
  FEE_PERCENT: 10, // 10% fee on purchases
  RENEWAL_PERIOD_DAYS: 365,
  LOCK_PERIOD_DAYS: 30,
  UNLOCK_PERCENT: 70, // 70% immediate, 30% locked
  REFERRAL_L1: 5, // 5%
  REFERRAL_L2: 3, // 3%
  REFERRAL_L3: 1  // 1%
};

// UI Theme colors (Euro-American Financial)
export const THEME_COLORS = {
  primary: '#001F3F', // Navy Blue
  secondary: '#FFD700', // Gold
  background: '#0A0E17',
  surface: '#1a1f2e',
  text: '#FFFFFF',
  textSecondary: '#B0B8C4',
  success: '#00E676',
  error: '#FF5252',
  warning: '#FFB74D'
};

// Utility functions
export const formatToken = (value, decimals = 18) => {
  if (!value) return '0';
  const num = Number(value) / Math.pow(10, decimals);
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};
