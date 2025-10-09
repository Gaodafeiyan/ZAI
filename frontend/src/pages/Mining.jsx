import { useState, useEffect } from 'react'
import { Container, Typography, Box, Grid, Card, CardContent, Button, TextField } from '@mui/material'
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
    unlockable: '0'
  });

  useEffect(() => {
    if (account) {
      loadMiners();
      loadRewards();
    }
  }, [account]);

  const loadMiners = async () => {
    try {
      const { mining } = await getContracts();
      const userMiners = await mining.getUserMiners(account);
      setMiners(userMiners);
    } catch (error) {
      console.error('Load miners error:', error);
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

      console.log('📊 奖励数据:', {
        pending: pending.toString(),
        unlockable: unlockable.toString(),
        lockedCount: lockedRewards.length,
        lockedRewards: lockedRewards
      });

      setRewards({
        pending: formatToken(pending),
        locked: lockedRewards.length.toString(),
        unlockable: formatToken(unlockable)
      });
    } catch (error) {
      console.error('Load rewards error:', error);
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
      loadMiners();
      loadRewards();
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
      loadRewards();
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
      loadRewards();
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

      {/* Rewards Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" className="gold-text">
                {parseFloat(rewards.pending).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                待领取奖励 ZAI (70%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" className="gold-text">
                {rewards.locked}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                锁定奖励条目 (30天)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" className="gold-text">
                {parseFloat(rewards.unlockable).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                可解锁奖励 ZAI (已满30天)
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
            最低: 500 ZAI | 手续费: 10% (50% 销毁 + 30% 营销 + 20% 运营)
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
                  {t('powerLevel')}: {formatToken(miner.powerLevel)} ZAI
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
