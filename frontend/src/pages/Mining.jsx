import { useState, useEffect } from 'react'
import { Container, Typography, Box, Grid, Card, CardContent, Button, TextField } from '@mui/material'
import { toast } from 'react-toastify'
import { getContracts, formatToken, parseToken } from '../utils/web3'

function Mining({ account }) {
  const [miners, setMiners] = useState([]);
  const [buyAmount, setBuyAmount] = useState('500');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      loadMiners();
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

      toast.success('Miner purchased successfully!');
      loadMiners();
      setBuyAmount('500');
    } catch (error) {
      console.error('Buy miner error:', error);
      toast.error(error.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#B0B8C4' }}>
          Connect wallet to start mining
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ mb: 4, color: '#FFD700', fontWeight: 700 }}>
        Mining Center
      </Typography>

      {/* Buy Miner */}
      <Card className="financial-card" sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#FFD700' }}>
            Purchase Miner
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label="Amount (ZAI)"
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
              {loading ? 'Processing...' : 'Buy Miner'}
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: '#B0B8C4', display: 'block', mt: 1 }}>
            Min: 500 ZAI | Fee: 10% (50% burn + 30% marketing + 20% operational)
          </Typography>
        </CardContent>
      </Card>

      {/* Miners List */}
      <Typography variant="h5" sx={{ mb: 3, color: '#FFD700' }}>
        My Miners ({miners.length})
      </Typography>

      <Grid container spacing={3}>
        {miners.map((miner, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card className="financial-card">
              <CardContent>
                <Typography variant="h6" className="gold-text">
                  Miner #{index + 1}
                </Typography>
                <Typography variant="body2" sx={{ color: '#B0B8C4', mt: 1 }}>
                  Power: {formatToken(miner.powerLevel)} ZAI
                </Typography>
                <Typography variant="body2" sx={{ color: '#B0B8C4' }}>
                  Status: {miner.active ? '✅ Active' : '❌ Inactive'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#8A92A0' }}>
                  Purchased: {new Date(Number(miner.purchaseTime) * 1000).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {miners.length === 0 && (
          <Grid item xs={12}>
            <Typography sx={{ textAlign: 'center', color: '#B0B8C4', py: 4 }}>
              No miners yet. Purchase your first miner to start earning!
            </Typography>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default Mining
