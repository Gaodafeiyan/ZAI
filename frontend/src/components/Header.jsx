import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Menu, MenuItem } from '@mui/material'
import { Link } from 'react-router-dom'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import LanguageIcon from '@mui/icons-material/Language'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { motion } from 'framer-motion'

function Header({ account, onConnect, loading }) {
  const { t, i18n } = useTranslation();
  const [langAnchor, setLangAnchor] = useState(null);

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleLangClick = (event) => {
    setLangAnchor(event.currentTarget);
  };

  const handleLangClose = () => {
    setLangAnchor(null);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    handleLangClose();
  };

  return (
    <AppBar position="sticky" sx={{ background: 'linear-gradient(90deg, #001F3F 0%, #002D5C 100%)', boxShadow: '0 4px 20px rgba(255,215,0,0.2)' }}>
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" component={Link} to="/" sx={{ textDecoration: 'none', color: '#FFD700', fontWeight: 700, letterSpacing: '0.05em' }}>
              ZENITHUS
            </Typography>
            <Typography variant="caption" sx={{ color: '#B0B8C4', ml: 1 }}>
              AI Mining
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Button component={Link} to="/" color="inherit" sx={{ '&:hover': { color: '#FFD700' } }}>
              {t('home')}
            </Button>
            <Button component={Link} to="/dashboard" color="inherit" sx={{ '&:hover': { color: '#FFD700' } }}>
              {t('dashboard')}
            </Button>
            <Button component={Link} to="/mining" color="inherit" sx={{ '&:hover': { color: '#FFD700' } }}>
              {t('mining')}
            </Button>
            <Button component={Link} to="/referral" color="inherit" sx={{ '&:hover': { color: '#FFD700' } }}>
              {t('referral')}
            </Button>

            {/* 语言切换 */}
            <IconButton onClick={handleLangClick} sx={{ color: '#FFD700' }}>
              <LanguageIcon />
            </IconButton>
            <Menu
              anchorEl={langAnchor}
              open={Boolean(langAnchor)}
              onClose={handleLangClose}
              PaperProps={{
                sx: {
                  bgcolor: '#001F3F',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                }
              }}
            >
              <MenuItem onClick={() => changeLanguage('zh')} sx={{ color: i18n.language === 'zh' ? '#FFD700' : 'white' }}>
                中文
              </MenuItem>
              <MenuItem onClick={() => changeLanguage('en')} sx={{ color: i18n.language === 'en' ? '#FFD700' : 'white' }}>
                English
              </MenuItem>
            </Menu>

            {account ? (
              <Button
                variant="contained"
                startIcon={<AccountBalanceWalletIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                  color: '#001F3F',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FFC700, #FFB700)',
                    boxShadow: '0 6px 20px rgba(255, 215, 0, 0.6)',
                  }
                }}
              >
                {formatAddress(account)}
              </Button>
            ) : (
              <Button
                component={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                variant="contained"
                onClick={onConnect}
                disabled={loading}
                startIcon={<AccountBalanceWalletIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                  color: '#001F3F',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FFC700, #FFB700)',
                    boxShadow: '0 6px 20px rgba(255, 215, 0, 0.6)',
                  }
                }}
              >
                {loading ? t('loading') : t('connectWallet')}
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Header
