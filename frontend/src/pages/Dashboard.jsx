import { useState, useEffect } from 'react'
import { Container, Typography, Box, Grid, Card, CardContent } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { getContracts, formatToken } from '../utils/web3'

function Dashboard({ account }) {
  const { t } = useTranslation();
  const [userStats, setUserStats] = useState({
    power: '0',
    pending: '0',
    locked: '0',
    unlockable: '0'
  });

  useEffect(() => {
    if (account) {
      loadUserStats();
    }
  }, [account]);

  const loadUserStats = async () => {
    try {
      const { mining } = await getContracts();

      const [power, pending, locked, unlockable] = await Promise.all([
        mining.getUserTotalPower(account),
        mining.getPendingRewards(account),
        mining.getLockedRewards(account),
        mining.getUnlockableRewards(account)
      ]);

      setUserStats({
        power: formatToken(power),
        pending: formatToken(pending),
        locked: locked.length.toString(),
        unlockable: formatToken(unlockable)
      });
    } catch (error) {
      console.error('Load user stats error:', error);
    }
  };

  if (!account) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#B0B8C4' }}>
          {t('connectWallet')}查看仪表盘
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ mb: 4, color: '#FFD700', fontWeight: 700 }}>
        {t('dashboard')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" className="gold-text">
                {parseFloat(userStats.power).toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                {t('yourPower')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" className="gold-text">
                {parseFloat(userStats.pending).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                {t('pendingRewards')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" className="gold-text">
                {userStats.locked}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                {t('lockedRewards')}条目
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card className="financial-card">
            <CardContent>
              <Typography variant="h5" className="gold-text">
                {parseFloat(userStats.unlockable).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                可解锁奖励
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard
