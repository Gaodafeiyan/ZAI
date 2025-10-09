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
      longTerm: '30 年长周期生态',
      longTermDesc: '9M ZAI 奖励池，30 年（10,950 天）持续释放。每日奖励逐日衰减：第 1 天 328 ZAI，按 0.9999636 衰减率递减，10 年后约 232 ZAI/天。全网总奖励按算力比例分配，确保长期稳定。创新通缩机制：每年销毁 12.55% 流通供应，持续增值。',
      transparent: '透明双轨奖励',
      transparentDesc: '链上开源可验证，无中心化控制。奖励分配：70% 立即可领取，30% 锁定 30 天后释放，平衡短期收益与长期持有激励。',
      referralSystem: '三级推荐激励',
      referralSystemDesc: '永久推荐奖励：每当下级领取奖励时，上级自动获得提成——一级（直推）5%、二级（间推）3%、三级 1%，总计最多 9%。唯一要求：推荐人保持矿机活跃（365天内续费）。无时间限制，无次数上限，永久被动收入。',
      lowEntry: 'AI 算力 1:1',
      lowEntryDesc: '仅需 500 ZAI 启动虚拟矿机，算力与质押 1:1 对应。纯算法驱动，无需昂贵硬件和高额电费，人人可参与量子 AI 生态。',

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
      backgroundTitle: 'Zenith 事件：量子 AI 算力革命',
      backgroundDesc: '2025 年 6 月，全球量子计算领域发生了震撼性突破——Zenith 事件。由知名量子物理学家艾伦·哈里斯博士（Dr. Alan Harris）和他的国际研究团队（包括麻省理工 AI 专家李娜教授和斯坦福量子工程领军人物卡洛斯·罗德里格斯）领导的"量子前沿联盟"（Quantum Frontier Alliance），成功利用量子纠缠和叠加原理，开发出革命性的分布式量子 AI 算法。该算法以惊人的效率处理海量计算任务，将 AI 发展推向全新高度，标志着从传统计算向量子智能时代的跃进。\n\nZenithus 协议应运而生，将这一划时代的量子 AI 算法封装为量子算力节点系统。不同于传统挖矿依赖高能耗硬件的模式，Zenithus 采用纯算法驱动的量子算力节点机制：每个节点代表对量子 AI 网络的真实算力贡献，参与者通过质押 ZAI 代币获得算力份额，为全球 AI 计算任务提供分布式算力支持，并按贡献获得 ZAI 奖励。\n\n这是一场真正的算力革命——无需高昂硬件投入，无需巨额电力消耗，仅需 500 ZAI 即可启动量子算力节点，以 1:1 算力比例参与全球量子 AI 生态建设。Zenithus 通过创新的通缩机制（年度销毁 12.55% 流通量）、三级推荐激励（5%/3%/1%，需活跃 >30 天）、以及双轨奖励模式（70% 立即释放 + 30% 锁定 30 天），构建了一个可持续 30 年的长期价值生态。\n\n加入 Zenithus，不仅是投资，更是参与构建未来量子 AI 基础设施，共享人工智能时代的红利。',
      backgroundTitle2: '革命性创新',
      backgroundDesc2: '• 量子 AI 算法驱动，真实算力贡献\n• 量子算力节点，无需实体硬件\n• 30 年长周期，可持续发展\n• 通缩 + 推荐 + 销毁三重机制\n• BSC 链上透明，无中心化控制',

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
