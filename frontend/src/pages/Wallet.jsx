import { useState, useEffect } from 'react'
import { Container, Typography, Grid, Card, CardContent, Button, Box } from '@mui/material'
import { toast } from 'react-toastify'
import { getContracts, formatToken } from '../utils/web3'

function Wallet({ account }) {
  const [balances, setBalances] = useState({
    zai: '0',
    zusd: '0'
  });
  const [pending, setPending] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      loadBalances();
    }
  }, [account]);

  const loadBalances = async () => {
    try {
      const { zai, zusd, mining } = await getContracts();

      const [zaiBalance, zusdBalance, pendingRewards] = await Promise.all([
        zai.balanceOf(account),
        zusd.balanceOf(account),
        mining.getPendingRewards(account)
      ]);

      setBalances({
        zai: formatToken(zaiBalance),
        zusd: formatToken(zusdBalance)
      });
      setPending(formatToken(pendingRewards));
    } catch (error) {
      console.error('Load balances error:', error);
    }
  };

  const handleClaimRewards = async () => {
    setLoading(true);
    try {
      const { mining } = await getContracts();
      const tx = await mining.claimRewards();
      await tx.wait();
      toast.success('Rewards claimed successfully!');
      loadBalances();
    } catch (error) {
      console.error('Claim error:', error);
      toast.error(error.message || 'Claim failed');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#B0B8C4' }}>
          Connect wallet to view balances
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ mb: 4, color: '#FFD700', fontWeight: 700 }}>
        Wallet
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card className="financial-card">
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h4" className="gold-text">
                {parseFloat(balances.zai).toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                ZAI Balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="financial-card">
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h4" className="gold-text">
                {parseFloat(balances.zusd).toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                ZUSD Balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="financial-card">
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h4" className="gold-text">
                {parseFloat(pending).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B8C4' }}>
                Pending Rewards
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleClaimRewards}
                  disabled={loading || parseFloat(pending) === 0}
                  sx={{
                    background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                    color: '#001F3F',
                    fontWeight: 700
                  }}
                >
                  {loading ? 'Claiming...' : 'Claim'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Card className="financial-card">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#FFD700' }}>
              Contract Addresses
            </Typography>
            <Typography variant="body2" sx={{ color: '#B0B8C4', mb: 1 }}>
              ZAI: 0xA49c95d8B262c3BD8FDFD6A602cca9db21377605
            </Typography>
            <Typography variant="body2" sx={{ color: '#B0B8C4', mb: 1 }}>
              ZUSD: 0xe6bE6A764CE488812E0C875107832656fEDE694F
            </Typography>
            <Typography variant="body2" sx={{ color: '#B0B8C4' }}>
              Mining: 0xb3300A66b1D098eDE8482f9Ff40ec0456eb5b83B
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default Wallet
