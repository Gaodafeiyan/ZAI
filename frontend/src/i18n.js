import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      // Header
      home: '首页',
      dashboard: '仪表盘',
      mining: '挖矿',
      referral: '推荐',
      wallet: '钱包',
      swap: '兑换',
      connectWallet: '连接钱包',
      disconnect: '断开连接',

      // Hero Section
      heroTitle: 'Zenithus AI 挖矿协议',
      heroSubtitle: '基于 Zenith 事件量子 AI 算法的分布式虚拟矿机系统',
      heroDescription: '30 年长周期 DeFi 挖矿 · BSC 主网 · 透明经济模型',
      startMining: '开始挖矿',
      learnMore: '了解更多',

      // Stats
      totalPower: '全网总算力',
      dailyRewards: '每日奖励',
      totalUsers: '总用户数',
      totalReleased: '已释放总量',

      // Why Choose
      whyChoose: '为什么选择 Zenithus',
      longTerm: '30 年长周期',
      longTermDesc: '9M ZAI 分 30 年释放，衰减率 0.9999636，每年燃烧 12.55% 流通量',
      transparent: '透明经济',
      transparentDesc: '所有合约开源可验证，实时链上数据，无中心化控制',
      referralSystem: '三级推荐',
      referralSystemDesc: '5%/3%/1% 推荐奖励，需活跃 >30 天，单笔上限 10%',
      lowEntry: '低门槛入场',
      lowEntryDesc: '500 ZAI 购买虚拟矿机，算力 1:1，无需实体设备',

      // Mining
      buyMiner: '购买矿机',
      minerPrice: '矿机价格',
      yourPower: '您的算力',
      pendingRewards: '待领取奖励',
      lockedRewards: '锁定奖励',
      claimRewards: '领取奖励',
      amount: '数量',
      referrerAddress: '推荐人地址（可选）',
      purchase: '购买',

      // Rewards Distribution
      rewardsDistribution: '奖励分配',
      immediate: '立即可领',
      locked30Days: '锁定 30 天',

      // Dashboard
      myMiners: '我的矿机',
      powerLevel: '算力等级',
      active: '活跃',
      inactive: '未激活',
      purchaseTime: '购买时间',
      renewalTime: '续期时间',
      powerChart: '算力趋势',
      rewardsChart: '奖励趋势',

      // Referral
      myReferrals: '我的推荐',
      referralLink: '推荐链接',
      copyLink: '复制链接',
      level1: '一级 (5%)',
      level2: '二级 (3%)',
      level3: '三级 (1%)',
      referralRules: '推荐规则',
      rule1: '推荐人需活跃 >30 天才能获得奖励',
      rule2: '单笔奖励上限为购买金额的 10%',
      rule3: '三级推荐奖励分别为 5%/3%/1%',

      // Footer
      about: '关于',
      docs: '文档',
      community: '社区',
      contracts: '合约地址',
      allRightsReserved: '版权所有',

      // Tokenomics
      tokenomics: '代币经济',
      totalSupply: '总供应量',
      miningRewards: '挖矿奖励池',
      initialDaily: '初始每日奖励',
      decayRate: '衰减率',
      annualBurn: '年度燃烧',
      circulatingSupply: '流通供应',

      // Background Story
      backgroundTitle: 'Zenith 事件',
      backgroundDesc: '2024年，一次量子计算突破（Zenith事件）催生了革命性的AI算法。Zenithus协议将这一算法封装为虚拟矿机，通过分布式网络共享算力，创造价值。每个矿机代表一份算力贡献，获得ZAI代币奖励。',

      // Messages
      walletConnected: '钱包已连接',
      walletDisconnected: '钱包已断开',
      transactionSent: '交易已发送',
      transactionConfirmed: '交易已确认',
      error: '错误',
      loading: '加载中...',

      // Language Toggle
      language: '语言',
    }
  },
  en: {
    translation: {
      // Header
      home: 'Home',
      dashboard: 'Dashboard',
      mining: 'Mining',
      referral: 'Referral',
      wallet: 'Wallet',
      connectWallet: 'Connect Wallet',
      disconnect: 'Disconnect',

      // Hero Section
      heroTitle: 'Zenithus AI Mining Protocol',
      heroSubtitle: 'Distributed Virtual Mining System Based on Zenith Event Quantum AI Algorithm',
      heroDescription: '30-Year DeFi Mining · BSC Mainnet · Transparent Economics',
      startMining: 'Start Mining',
      learnMore: 'Learn More',

      // Stats
      totalPower: 'Total Network Power',
      dailyRewards: 'Daily Rewards',
      totalUsers: 'Total Users',
      totalReleased: 'Total Released',

      // Why Choose
      whyChoose: 'Why Zenithus',
      longTerm: '30-Year Cycle',
      longTermDesc: '9M ZAI released over 30 years, decay rate 0.9999636, annual burn 12.55% of circulation',
      transparent: 'Transparent Economy',
      transparentDesc: 'All contracts open source & verifiable, real-time on-chain data, no centralized control',
      referralSystem: '3-Level Referral',
      referralSystemDesc: '5%/3%/1% referral rewards, requires >30 days active, 10% cap per transaction',
      lowEntry: 'Low Entry Barrier',
      lowEntryDesc: '500 ZAI for virtual miner, 1:1 power ratio, no physical equipment needed',

      // Mining
      buyMiner: 'Buy Miner',
      minerPrice: 'Miner Price',
      yourPower: 'Your Power',
      pendingRewards: 'Pending Rewards',
      lockedRewards: 'Locked Rewards',
      claimRewards: 'Claim Rewards',
      amount: 'Amount',
      referrerAddress: 'Referrer Address (Optional)',
      purchase: 'Purchase',

      // Rewards Distribution
      rewardsDistribution: 'Rewards Distribution',
      immediate: 'Immediate',
      locked30Days: 'Locked 30 Days',

      // Dashboard
      myMiners: 'My Miners',
      powerLevel: 'Power Level',
      active: 'Active',
      inactive: 'Inactive',
      purchaseTime: 'Purchase Time',
      renewalTime: 'Renewal Time',
      powerChart: 'Power Trend',
      rewardsChart: 'Rewards Trend',

      // Referral
      myReferrals: 'My Referrals',
      referralLink: 'Referral Link',
      copyLink: 'Copy Link',
      level1: 'Level 1 (5%)',
      level2: 'Level 2 (3%)',
      level3: 'Level 3 (1%)',
      referralRules: 'Referral Rules',
      rule1: 'Referrer must be active >30 days to earn rewards',
      rule2: 'Single reward capped at 10% of purchase amount',
      rule3: '3-level rewards: 5%/3%/1%',

      // Footer
      about: 'About',
      docs: 'Docs',
      community: 'Community',
      contracts: 'Contracts',
      allRightsReserved: 'All Rights Reserved',

      // Tokenomics
      tokenomics: 'Tokenomics',
      totalSupply: 'Total Supply',
      miningRewards: 'Mining Rewards Pool',
      initialDaily: 'Initial Daily Reward',
      decayRate: 'Decay Rate',
      annualBurn: 'Annual Burn',
      circulatingSupply: 'Circulating Supply',

      // Background Story
      backgroundTitle: 'The Zenith Event',
      backgroundDesc: 'In 2024, a quantum computing breakthrough (Zenith Event) gave birth to a revolutionary AI algorithm. The Zenithus protocol encapsulates this algorithm into virtual miners, sharing computational power through a distributed network to create value. Each miner represents a share of computational contribution, earning ZAI token rewards.',

      // Messages
      walletConnected: 'Wallet Connected',
      walletDisconnected: 'Wallet Disconnected',
      transactionSent: 'Transaction Sent',
      transactionConfirmed: 'Transaction Confirmed',
      error: 'Error',
      loading: 'Loading...',

      // Language Toggle
      language: 'Language',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 默认中文
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
