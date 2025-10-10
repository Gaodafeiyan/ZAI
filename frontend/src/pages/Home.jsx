import { Box, Container, Typography, Button, Grid, Card, CardContent, Chip, useMediaQuery, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedIcon from '@mui/icons-material/Verified';
import MinerModel3D from '../components/MinerModel3D';
import { getContracts } from '../utils/web3';
import { formatToken } from '../utils/constants';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

export default function Home() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
      console.error('Failed to load stats:', error);
    }
  };

  const features = [
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      title: t('longTerm'),
      desc: t('longTermDesc'),
      color: '#FFD700'
    },
    {
      icon: <VerifiedIcon sx={{ fontSize: 40 }} />,
      title: t('transparent'),
      desc: t('transparentDesc'),
      color: '#00BFFF'
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      title: t('referralSystem'),
      desc: t('referralSystemDesc'),
      color: '#32CD32'
    },
    {
      icon: <RocketLaunchIcon sx={{ fontSize: 40 }} />,
      title: t('lowEntry'),
      desc: t('lowEntryDesc'),
      color: '#FF6B6B'
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0A0E17 0%, #001529 50%, #0A0E17 100%)' }}>
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, md: 3 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <MotionBox
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Chip
                label="BSC Mainnet"
                sx={{
                  bgcolor: 'rgba(255, 215, 0, 0.1)',
                  color: '#FFD700',
                  fontWeight: 'bold',
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid rgba(255, 215, 0, 0.3)'
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2,
                  fontSize: { xs: '2rem', md: '3.5rem' }
                }}
              >
                {t('heroTitle')}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#B0C4DE',
                  mb: 2,
                  fontWeight: 500,
                  fontSize: { xs: '1rem', md: '1.25rem' }
                }}
              >
                {t('heroSubtitle')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#90A4AE',
                  mb: 4,
                  lineHeight: 1.8
                }}
              >
                {t('heroDescription')}
              </Typography>

              {/* CTA Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <MotionBox
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    component={Link}
                    to="/mining"
                    variant="contained"
                    size="large"
                    startIcon={<RocketLaunchIcon />}
                    fullWidth
                    sx={{
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      color: '#000',
                      fontWeight: 700,
                      px: 4,
                      py: 1.5,
                      boxShadow: '0 8px 30px rgba(255, 215, 0, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                        boxShadow: '0 12px 40px rgba(255, 215, 0, 0.6)',
                      }
                    }}
                  >
                    {t('startMining')}
                  </Button>
                </MotionBox>
                <MotionBox
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    sx={{
                      borderColor: '#FFD700',
                      color: '#FFD700',
                      fontWeight: 700,
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        borderColor: '#FFA500',
                        bgcolor: 'rgba(255, 215, 0, 0.1)',
                      }
                    }}
                  >
                    {t('learnMore')}
                  </Button>
                </MotionBox>
              </Box>
            </MotionBox>
          </Grid>

          {/* 3D Miner Model - Instant on Mobile */}
          <Grid item xs={12} md={6}>
            <MotionBox
              initial={isMobile ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={isMobile ? { duration: 0 } : { duration: 0.8 }}
            >
              <Box sx={{ height: { xs: '300px', md: '500px' } }}>
                <MinerModel3D active={true} disableAnimation={isMobile} />
              </Box>
            </MotionBox>
          </Grid>
        </Grid>
      </Container>

      {/* Stats Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, md: 3 } }}>
        <Grid container spacing={3}>
          {[
            { label: t('totalPower'), value: stats.totalPower, icon: <SecurityIcon />, color: '#00BFFF' },
            { label: t('dailyRewards'), value: stats.dailyReward + ' ZAI', icon: <LocalFireDepartmentIcon />, color: '#FFD700' },
            { label: t('totalUsers'), value: stats.totalUsers, icon: <PeopleIcon />, color: '#32CD32' },
            { label: t('totalReleased'), value: stats.totalReleased + ' ZAI', icon: <TrendingUpIcon />, color: '#FF6B6B' }
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <MotionCard
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, boxShadow: `0 20px 40px ${stat.color}30` }}
                sx={{
                  background: 'linear-gradient(135deg, rgba(0,31,63,0.6) 0%, rgba(0,15,30,0.8) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${stat.color}40`,
                  borderRadius: 3,
                  overflow: 'visible'
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ color: stat.color, mb: 2 }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" sx={{ color: stat.color, fontWeight: 900, mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#B0C4DE' }}>
                    {stat.label}
                  </Typography>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Background Story - Extended */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, md: 3 } }}>
        <MotionBox
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          sx={{
            background: 'linear-gradient(135deg, rgba(0,31,63,0.8) 0%, rgba(0,15,30,0.9) 100%)',
            backdropFilter: 'blur(30px)',
            borderRadius: 5,
            p: { xs: 3, md: 6 },
            border: '2px solid rgba(255, 215, 0, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 191, 255, 0.3), inset 0 0 50px rgba(255, 215, 0, 0.05)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #FFD700, #00BFFF, #FFD700)',
              animation: 'shimmer 3s infinite'
            },
            '@keyframes shimmer': {
              '0%': { backgroundPosition: '-200% 0' },
              '100%': { backgroundPosition: '200% 0' }
            }
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: '#FFD700',
              fontWeight: 900,
              mb: 4,
              textAlign: 'center',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              fontSize: { xs: '1.5rem', md: '2.5rem' }
            }}
          >
            {t('backgroundTitle')}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: '#E0E6ED',
              lineHeight: 2.2,
              textAlign: 'justify',
              fontSize: { xs: '0.9rem', md: '1.1rem' },
              mb: 4,
              textIndent: '2em',
              whiteSpace: 'pre-line'
            }}
          >
            {t('backgroundDesc')}
          </Typography>

          {/* Innovation Highlights */}
          <Box sx={{ mt: 5 }}>
            <Typography
              variant="h5"
              sx={{
                color: '#00BFFF',
                fontWeight: 700,
                mb: 3,
                textAlign: 'center',
                textShadow: '0 0 15px rgba(0, 191, 255, 0.5)',
                fontSize: { xs: '1.2rem', md: '1.5rem' }
              }}
            >
              {t('backgroundTitle2')}
            </Typography>
            <Grid container spacing={2}>
              {t('backgroundDesc2').split('\n').map((item, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <MotionBox
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    sx={{
                      background: 'linear-gradient(90deg, rgba(0,191,255,0.1) 0%, transparent 100%)',
                      p: 2,
                      borderRadius: 2,
                      borderLeft: '3px solid #00BFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      transition: 'all 0.3s',
                      '&:hover': {
                        background: 'linear-gradient(90deg, rgba(0,191,255,0.2) 0%, rgba(255,215,0,0.1) 100%)',
                        transform: 'translateX(10px)'
                      }
                    }}
                  >
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#FFD700',
                      boxShadow: '0 0 10px #FFD700'
                    }} />
                    <Typography variant="body2" sx={{ color: '#B0C4DE', fontWeight: 500, fontSize: { xs: '0.85rem', md: '0.9rem' } }}>
                      {item}
                    </Typography>
                  </MotionBox>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* CTA Buttons */}
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 5, flexDirection: { xs: 'column', sm: 'row' } }}>
            <MotionBox whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                component={Link}
                to="/mining"
                variant="contained"
                size="large"
                fullWidth
                sx={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#000',
                  fontWeight: 700,
                  px: 5,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow: '0 10px 30px rgba(255, 215, 0, 0.5)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                    boxShadow: '0 15px 40px rgba(255, 215, 0, 0.7)',
                  }
                }}
              >
                开启算力挖矿
              </Button>
            </MotionBox>
            <MotionBox whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                sx={{
                  borderColor: '#00BFFF',
                  color: '#00BFFF',
                  fontWeight: 700,
                  px: 5,
                  py: 1.5,
                  borderRadius: 3,
                  borderWidth: 2,
                  '&:hover': {
                    borderColor: '#FFD700',
                    color: '#FFD700',
                    bgcolor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                  }
                }}
              >
                下载白皮书
              </Button>
            </MotionBox>
          </Box>
        </MotionBox>
      </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, md: 3 } }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            textAlign: 'center',
            mb: 6,
            background: 'linear-gradient(135deg, #FFD700 0%, #00BFFF 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: { xs: '1.8rem', md: '3rem' }
          }}
        >
          {t('whyChoose')}
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <MotionCard
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: `0 20px 50px ${feature.color}40`,
                  border: `2px solid ${feature.color}`
                }}
                sx={{
                  background: 'linear-gradient(135deg, rgba(0,31,63,0.5) 0%, rgba(0,15,30,0.7) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${feature.color}30`,
                  borderRadius: 3,
                  height: '100%',
                  transition: 'all 0.3s ease'
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                  <Box sx={{ color: feature.color, mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" sx={{ color: feature.color, fontWeight: 700, mb: 2, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#90A4AE', lineHeight: 1.8, fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                    {feature.desc}
                  </Typography>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Tokenomics Section */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, md: 3 } }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            textAlign: 'center',
            mb: 6,
            color: '#FFD700',
            fontSize: { xs: '1.8rem', md: '3rem' }
          }}
        >
          {t('tokenomics')}
        </Typography>
        <Grid container spacing={3}>
          {[
            { label: t('totalSupply'), value: '15,000,000 ZAI' },
            { label: t('miningRewards'), value: '9,000,000 ZAI' },
            { label: t('initialDaily'), value: '328 ZAI' },
            { label: t('decayRate'), value: '0.9999636' },
            { label: t('annualBurn'), value: '12.55%' },
            { label: t('rewardsDistribution'), value: '70% + 30% (30天)' }
          ].map((item, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <MotionBox
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                sx={{
                  background: 'linear-gradient(90deg, rgba(255,215,0,0.1) 0%, transparent 100%)',
                  p: 3,
                  borderRadius: 2,
                  borderLeft: '4px solid #FFD700'
                }}
              >
                <Typography variant="body2" sx={{ color: '#90A4AE', mb: 0.5, fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
                  {item.value}
                </Typography>
              </MotionBox>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
