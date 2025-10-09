import { useState, useEffect } from 'react'
import { Container, Typography, Box, Grid, Card, CardContent, Button, TextField, Divider } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { getContracts, formatToken, parseToken } from '../utils/web3'

function Mining({ account }) {
  const { t } = useTranslation();
  const [miners, setMiners] = useState([]);
  const [buyAmount, setBuyAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [rewards, setRewards] = useState({
    pending: '0',
    locked: '0',
    unlockable: '0',
    totalLocked: '0'
  });
  const [miningStats, setMiningStats] = useState({
    userPower: '0',
    totalPower: '0',
    rewardsPerSecond: '0',
    dailyReward: '0',
    totalSupply: '0',
    burnedAmount: '0'
  });
  const [realtimeRewards, setRealtimeRewards] = useState(0);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account]);

  const loadData = async () => {
    const userMiners = await loadMiners(); // 先加载矿机，获取矿机列表
    await loadRewards();
    await loadMiningStats(userMiners); // 传入矿机列表
  };

  // 定期从合约同步真实数据（每3秒）
  useEffect(() => {
    if (!account) return;

    console.log('✅ 启动合约实时同步，每3秒从合约读取真实数据');

    const syncInterval = setInterval(async () => {
      const timestamp = new Date().toLocaleTimeString();
      try {
        const { mining } = await getContracts();
        const currentMiners = await mining.getUserMiners(account);

        // 同步所有数据
        await loadRewards(); // 真实的待领取奖励
        await loadMiningStats(currentMiners); // 挖矿统计

        console.log('🔄 合约数据已同步', timestamp);
      } catch (error) {
        console.error('同步失败:', error);
      }
    }, 3000); // 每3秒同步一次（BSC 平均出块时间）

    return () => {
      console.log('❌ 停止合约同步');
      clearInterval(syncInterval);
    };
  }, [account]);

  const loadMiners = async () => {
    try {
      const { mining } = await getContracts();
      const userMiners = await mining.getUserMiners(account);
      setMiners(userMiners);
      console.log('✅ 加载矿机成功，数量:', userMiners.length);
      return userMiners; // 返回矿机列表供后续使用
    } catch (error) {
      console.error('Load miners error:', error);
      return [];
    }
  };

  const loadRewards = async () => {
    try {
      const { mining } = await getContracts();
      const [pending, unlockable] = await Promise.all([
        mining.getPendingRewards(account),
        mining.getUnlockableRewards(account)
      ]);
      const lockedRewards = await mining.getLockedRewards(account);

      // 计算所有锁定奖励的总金额
      let totalLockedAmount = 0n;
      for (let i = 0; i < lockedRewards.length; i++) {
        totalLockedAmount += lockedRewards[i].amount;
      }

      console.log('📊 奖励数据:', {
        pending: pending.toString(),
        unlockable: unlockable.toString(),
        lockedCount: lockedRewards.length,
        totalLockedAmount: totalLockedAmount.toString(),
        lockedRewards: lockedRewards
      });

      setRewards({
        pending: formatToken(pending),
        locked: lockedRewards.length.toString(),
        unlockable: formatToken(unlockable),
        totalLocked: formatToken(totalLockedAmount)
      });

      // 初始化实时奖励为当前待领取奖励
      setRealtimeRewards(parseFloat(formatToken(pending)));
    } catch (error) {
      console.error('Load rewards error:', error);
    }
  };

  const loadMiningStats = async (userMiners = []) => {
    try {
      console.log('🔍 loadMiningStats 被调用，传入矿机数量:', userMiners.length);
      const { mining, zai } = await getContracts();

      // 方法1: 从合约读取
      let userPower = 0n;
      try {
        userPower = await mining.getUserTotalPower(account);
        console.log('✅ 从合约读取用户算力:', userPower.toString());
      } catch (e) {
        console.warn('⚠️ 无法从合约读取算力:', e.message);
      }

      // 方法2: 如果合约返回0，从矿机列表手动计算
      if (userPower === 0n && userMiners.length > 0) {
        console.log('📊 从矿机列表计算算力，矿机数量:', userMiners.length);
        for (let i = 0; i < userMiners.length; i++) {
          const miner = userMiners[i];
          console.log(`矿机 #${i+1}:`, {
            powerLevel: miner.powerLevel.toString(),
            active: miner.active,
            type: typeof miner.powerLevel
          });
          if (miner.active) {
            userPower += miner.powerLevel;
            console.log(`  累加后算力: ${userPower.toString()}`);
          }
        }
        console.log('✅ 计算得到用户算力:', userPower.toString());
      } else if (userPower === 0n) {
        console.warn('⚠️ 无法计算算力：userPower=0, userMiners.length=', userMiners.length);
      }

      // 读取全网算力、每日奖励、总量、销毁量
      const [totalPower, dailyReward, totalSupply, burnedAmount] = await Promise.all([
        mining.getGlobalTotalPower(),
        mining.getDailyReward(),
        zai.totalSupply(),
        zai.balanceOf('0x000000000000000000000000000000000000dEaD') // 死亡地址余额 = 销毁量
      ]);

      console.log('⛏️ 挖矿统计:', {
        userPower: userPower.toString(),
        totalPower: totalPower.toString(),
        dailyReward: dailyReward.toString(),
        totalSupply: totalSupply.toString(),
        burnedAmount: burnedAmount.toString()
      });

      // 计算每秒产出：(用户算力 / 全网算力) * 每日奖励 / 86400秒
      let rewardsPerSecond = '0';
      if (totalPower > 0n && userPower > 0n) {
        // 每秒产出 = (用户算力 / 全网算力) * (每日奖励 / 86400)
        const userShare = (userPower * 1000000n) / totalPower; // 放大100万倍避免精度丢失
        const secondlyReward = dailyReward / 86400n; // 每日奖励除以86400秒
        const userRewardPerSecond = (secondlyReward * userShare) / 1000000n;
        rewardsPerSecond = formatToken(userRewardPerSecond);
      }

      setMiningStats({
        userPower: formatToken(userPower),
        totalPower: formatToken(totalPower),
        rewardsPerSecond: rewardsPerSecond,
        dailyReward: formatToken(dailyReward),
        totalSupply: formatToken(totalSupply),
        burnedAmount: formatToken(burnedAmount)
      });

      console.log('✅ 挖矿统计加载成功:', {
        userPower: formatToken(userPower),
        totalPower: formatToken(totalPower),
        rewardsPerSecond: rewardsPerSecond,
        dailyReward: formatToken(dailyReward),
        totalSupply: formatToken(totalSupply),
        burnedAmount: formatToken(burnedAmount),
        circulatingSupply: (parseFloat(formatToken(totalSupply)) - parseFloat(formatToken(burnedAmount))).toFixed(2)
      });
    } catch (error) {
      console.error('❌ Load mining stats error:', error);
      console.error('错误详情:', error.message);
    }
  };

  const handleBuyMiner = async () => {
    if (!account) {
      toast.error('Please connect wallet');
      return;
    }

    if (parseFloat(buyAmount) < 500) {
      toast.error('Minimum 500 ZAI required');
      return;
    }

    setLoading(true);
    try {
      const { zai, mining } = await getContracts();
      const amount = parseToken(buyAmount);

      // Approve ZAI
      toast.info('Approving ZAI...');
      const approveTx = await zai.approve(await mining.getAddress(), amount);
      await approveTx.wait();

      // Buy miner
      toast.info('Buying miner...');
      const buyTx = await mining.buyMiner(amount, '0x0000000000000000000000000000000000000000');
      await buyTx.wait();

      toast.success('算力节点购买成功！');
      await loadData(); // 重新加载所有数据
      setBuyAmount('500');
    } catch (error) {
      console.error('Buy miner error:', error);
      toast.error(error.message || '交易失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!account) {
      toast.error('请先连接钱包');
      return;
    }

    if (parseFloat(rewards.pending) <= 0) {
      toast.error('没有可领取的奖励');
      return;
    }

    setClaimLoading(true);
    try {
      const { mining } = await getContracts();
      toast.info('领取奖励中...');
      const claimTx = await mining.claimRewards();
      await claimTx.wait();

      toast.success('奖励领取成功！');

      // 刷新所有数据
      await loadData();
    } catch (error) {
      console.error('Claim rewards error:', error);
      toast.error(error.message || '领取失败');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleUnlockRewards = async () => {
    if (!account) {
      toast.error('请先连接钱包');
      return;
    }

    if (parseFloat(rewards.unlockable) <= 0) {
      toast.error('没有可解锁的奖励');
      return;
    }

    setUnlockLoading(true);
    try {
      const { mining } = await getContracts();
      toast.info('解锁奖励中...');
      const unlockTx = await mining.unlockRewards();
      await unlockTx.wait();

      toast.success('奖励解锁成功！');

      // 刷新所有数据
      await loadData();
    } catch (error) {
      console.error('Unlock rewards error:', error);
      toast.error(error.message || '解锁失败');
    } finally {
      setUnlockLoading(false);
    }
  };

  if (!account) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#B0B8C4' }}>
          {t('connectWallet')}开始挖矿
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ mb: 4, color: '#FFD700', fontWeight: 700 }}>
        {t('mining')}中心
      </Typography>

      {/* Real-time Mining Display */}
      {parseFloat(miningStats.userPower) > 0 ? (
        <Card
          className="financial-card"
          sx={{
            mb: 4,
            background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 100%)',
            border: '2px solid rgba(255, 215, 0, 0.3)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#B0C4DE', mb: 0.5 }}>
                    ⚡ 您的算力
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700 }}>
                    {parseFloat(miningStats.userPower).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#90A4AE' }}>
                    占全网 {miningStats.totalPower > 0 ? ((parseFloat(miningStats.userPower) / parseFloat(miningStats.totalPower)) * 100).toFixed(2) : '0'}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#B0C4DE', mb: 0.5 }}>
                    ⛏️ 待领取奖励
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#00E676', fontWeight: 700 }}>
                    {parseFloat(rewards.pending).toFixed(4)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#90A4AE' }}>
                    ZAI (每3秒同步)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#B0C4DE', mb: 0.5 }}>
                    🚀 挖矿速度
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#00BFFF', fontWeight: 700 }}>
                    {parseFloat(miningStats.rewardsPerSecond).toFixed(8)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#90A4AE' }}>
                    ZAI / 秒
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#B0C4DE', mb: 0.5 }}>
                    📅 今日产出
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#FFA500', fontWeight: 700 }}>
                    {parseFloat(miningStats.dailyReward).toFixed(2)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#90A4AE' }}>
                    ZAI (全网)
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2, borderColor: 'rgba(255, 215, 0, 0.2)' }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#B0C4DE' }}>
                    💎 总供应量
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 600 }}>
                    {parseFloat(miningStats.totalSupply).toLocaleString(undefined, {maximumFractionDigits: 0})} ZAI
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#B0C4DE' }}>
                    🔥 已销毁
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#FF6B6B', fontWeight: 600 }}>
                    {parseFloat(miningStats.burnedAmount).toLocaleString(undefined, {maximumFractionDigits: 0})} ZAI
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#B0C4DE' }}>
                    💰 流通量
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#00E676', fontWeight: 600 }}>
                    {(parseFloat(miningStats.totalSupply) - parseFloat(miningStats.burnedAmount)).toLocaleString(undefined, {maximumFractionDigits: 0})} ZAI
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ mb: 4, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: '#90A4AE', textAlign: 'center' }}>
            💡 购买算力节点后将显示实时挖矿数据
            {miningStats.userPower !== '0' && ` (当前算力: ${miningStats.userPower})`}
          </Typography>
        </Box>
      )}

      {/* Rewards Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700, fontSize: '1.8rem' }}>
                {parseFloat(rewards.pending).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                待领取奖励 ZAI (70%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700, fontSize: '1.8rem' }}>
                {parseFloat(rewards.totalLocked).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                锁定中奖励 ZAI (30%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700, fontSize: '1.8rem' }}>
                {parseFloat(rewards.unlockable).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                可解锁奖励 ZAI
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700, fontSize: '1.8rem' }}>
                {rewards.locked}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                锁定条目数量
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Claim Rewards */}
      <Card className="financial-card" sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#FFD700' }}>
            {t('claimRewards')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleClaimRewards}
              disabled={claimLoading || parseFloat(rewards.pending) <= 0}
              sx={{
                flex: 1,
                background: 'linear-gradient(135deg, #00E676, #00C853)',
                color: '#001F3F',
                fontWeight: 700,
                py: 1.5
              }}
            >
              {claimLoading ? t('loading') : `领取待领取奖励 (${parseFloat(rewards.pending).toFixed(2)} ZAI)`}
            </Button>
            <Button
              variant="contained"
              onClick={handleUnlockRewards}
              disabled={unlockLoading || parseFloat(rewards.unlockable) <= 0}
              sx={{
                flex: 1,
                background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                color: '#001F3F',
                fontWeight: 700,
                py: 1.5
              }}
            >
              {unlockLoading ? t('loading') : `解锁奖励 (${parseFloat(rewards.unlockable).toFixed(2)} ZAI)`}
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: '#B0B8C4', display: 'block', mt: 2 }}>
            💡 奖励分配：70% 立即可领取，30% 锁定 30 天后可解锁
          </Typography>
        </CardContent>
      </Card>

      {/* Buy Miner */}
      <Card className="financial-card" sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#FFD700' }}>
            {t('buyMiner')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label={t('amount') + ' (ZAI)'}
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              fullWidth
              InputProps={{
                inputProps: { min: 500 }
              }}
            />
            <Button
              variant="contained"
              onClick={handleBuyMiner}
              disabled={loading}
              sx={{
                minWidth: '150px',
                background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                color: '#001F3F',
                fontWeight: 700
              }}
            >
              {loading ? t('loading') : t('purchase')}
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: '#B0B8C4', display: 'block', mt: 1 }}>
            最低: 500 ZAI
          </Typography>
        </CardContent>
      </Card>

      {/* Miners List */}
      <Typography variant="h5" sx={{ mb: 3, color: '#FFD700' }}>
        {t('myMiners')} ({miners.length})
      </Typography>

      <Grid container spacing={3}>
        {miners.map((miner, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card className="financial-card">
              <CardContent>
                <Typography variant="h6" className="gold-text">
                  算力节点 #{index + 1}
                </Typography>
                <Typography variant="body2" sx={{ color: '#B0B8C4', mt: 1 }}>
                  能量: {parseFloat(formatToken(miner.powerLevel)).toFixed(0)}
                </Typography>
                <Typography variant="body2" sx={{ color: '#B0B8C4' }}>
                  状态: {miner.active ? '✅ ' + t('active') : '❌ ' + t('inactive')}
                </Typography>
                <Typography variant="caption" sx={{ color: '#8A92A0' }}>
                  {t('purchaseTime')}: {new Date(Number(miner.purchaseTime) * 1000).toLocaleDateString('zh-CN')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {miners.length === 0 && (
          <Grid item xs={12}>
            <Typography sx={{ textAlign: 'center', color: '#B0B8C4', py: 4 }}>
              暂无算力节点。购买您的第一个算力节点开始赚取收益！
            </Typography>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default Mining
