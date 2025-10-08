import { useState, useEffect } from 'react'
import { Container, Typography, Button, Box, Grid, Card, CardContent } from '@mui/material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getContracts } from '../utils/web3'
import { formatToken } from '../utils/web3'

function Home({ account, onConnect }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPower: '0',
    dailyReward: '0',
    totalUsers: '0',
    totalReleased: '0'
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { mining } = await getContracts();

      const [totalPower, dailyReward, totalUsers, totalReleased] = await Promise.all([
        mining.getGlobalTotalPower(),
        mining.getDailyReward(),
        mining.getTotalUsers(),
        mining.totalReleased()
      ]);

      setStats({
        totalPower: formatToken(totalPower),
        dailyReward: formatToken(dailyReward),
        totalUsers: totalUsers.toString(),
        totalReleased: formatToken(totalReleased)
      });
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  return (
    <Box sx={{ minHeight: '80vh', background: 'linear-gradient(135deg, #0A0E17 0%, #1a1f2e 100%)' }}>
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: 10, pb: 8 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                textShadow: '0 0 40px rgba(255,215,0,0.3)'
              }}
            >
              ZENITHUS AI MINING
            </Typography>
            <Typography
              variant="h5"
              sx={{ color: '#B0B8C4', mb: 4, fontWeight: 300 }}
            >
              30-Year Decentralized Mining Protocol
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: '#8A92A0', maxWidth: '600px', mx: 'auto', mb: 4 }}
            >
              Stake ZAI tokens to purchase virtual miners. Earn daily rewards from a 9M ZAI pool
              over 30 years with exponential decay. Powered by BSC.
            </Typography>

            {account ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/mining')}
                sx={{
                  background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                  color: '#001F3F',
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  boxShadow: '0 8px 24px rgba(255,215,0,0.4)',
                  '&:hover': {
                    boxShadow: '0 12px 32px rgba(255,215,0,0.6)',
                  }
                }}
              >
                Start Mining
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                onClick={onConnect}
                sx={{
                  background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                  color: '#001F3F',
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  boxShadow: '0 8px 24px rgba(255,215,0,0.4)',
                  '&:hover': {
                    boxShadow: '0 12px 32px rgba(255,215,0,0.6)',
                  }
                }}
              >
                Connect Wallet
              </Button>
            )}
          </Box>
        </motion.div>

        {/* Stats Cards */}
        <Grid container spacing={3}>
          {[
            { label: 'Total Power', value: parseFloat(stats.totalPower).toLocaleString(), suffix: 'ZAI' },
            { label: 'Daily Rewards', value: parseFloat(stats.dailyReward).toFixed(2), suffix: 'ZAI' },
            { label: 'Total Miners', value: stats.totalUsers, suffix: 'Users' },
            { label: 'Released', value: parseFloat(stats.totalReleased).toLocaleString(), suffix: 'ZAI' },
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="financial-card">
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" className="gold-text" sx={{ fontWeight: 700, mb: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {stat.suffix}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#8A92A0', mt: 1 }}>
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Features */}
        <Box sx={{ mt: 10 }}>
          <Typography variant="h3" sx={{ textAlign: 'center', mb: 6, color: '#FFD700', fontWeight: 700 }}>
            Why Zenithus?
          </Typography>
          <Grid container spacing={4}>
            {[
              { title: '30-Year Sustainability', desc: '9M ZAI pool with 0.9999636 daily decay for long-term stability' },
              { title: 'Transparent Rewards', desc: 'On-chain verification. 70% immediate, 30% locked for 30 days' },
              { title: '3-Level Referral', desc: 'Earn 5%/3%/1% from your downlines. Build your network' },
              { title: 'Low Entry', desc: 'Start mining with just 500 ZAI. Upgrade anytime' },
            ].map((feature, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card className="financial-card" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" className="gold-text" sx={{ mb: 2, fontWeight: 700 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#B0B8C4', lineHeight: 1.8 }}>
                      {feature.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}

export default Home
