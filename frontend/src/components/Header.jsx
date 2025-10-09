import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Menu, MenuItem, Drawer, useMediaQuery, useTheme } from '@mui/material'
import { Link } from 'react-router-dom'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import LanguageIcon from '@mui/icons-material/Language'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { motion } from 'framer-motion'

function Header({ account, onConnect, loading }) {
  const { t, i18n } = useTranslation();
  const [langAnchor, setLangAnchor] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { label: t('home'), to: '/' },
    { label: t('dashboard'), to: '/dashboard' },
    { label: t('mining'), to: '/mining' },
    { label: t('swap'), to: '/swap' },
    { label: t('referral'), to: '/referral' }
  ];

  return (
    <AppBar position="sticky" sx={{ background: 'linear-gradient(90deg, #001F3F 0%, #002D5C 100%)', boxShadow: '0 4px 20px rgba(255,215,0,0.2)' }}>
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h5"
              component={Link}
              to="/"
              sx={{
                textDecoration: 'none',
                color: '#FFD700',
                fontWeight: 700,
                letterSpacing: '0.05em',
                fontSize: { xs: '1.2rem', md: '1.5rem' }
              }}
            >
              ZENITHUS
            </Typography>
            <Typography variant="caption" sx={{ color: '#B0B8C4', ml: 1, display: { xs: 'none', sm: 'block' } }}>
              AI Mining
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile ? (
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {navLinks.map((link) => (
                <Button
                  key={link.to}
                  component={Link}
                  to={link.to}
                  color="inherit"
                  sx={{ '&:hover': { color: '#FFD700' } }}
                >
                  {link.label}
                </Button>
              ))}

              {/* Language Switcher */}
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

              {/* Wallet Button */}
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
          ) : (
            /* Mobile Navigation */
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Mobile Wallet Button */}
              {account ? (
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                    color: '#001F3F',
                    fontWeight: 700,
                    minWidth: 'auto',
                    px: 2,
                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                  }}
                >
                  {formatAddress(account)}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  onClick={onConnect}
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                    color: '#001F3F',
                    fontWeight: 700,
                    minWidth: 'auto',
                    px: 2,
                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                  }}
                >
                  {loading ? '...' : t('connect')}
                </Button>
              )}

              {/* Hamburger Menu Icon */}
              <IconButton
                onClick={toggleMobileMenu}
                sx={{ color: '#FFD700' }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </Container>

      {/* Mobile Drawer Menu */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        PaperProps={{
          sx: {
            width: 280,
            background: 'linear-gradient(180deg, #001F3F 0%, #002D5C 100%)',
            borderLeft: '2px solid rgba(255, 215, 0, 0.3)',
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Close Button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ color: '#FFD700', fontWeight: 700, fontSize: '1.2rem' }}>
              Menu
            </Typography>
            <IconButton onClick={closeMobileMenu} sx={{ color: '#FFD700' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navLinks.map((link) => (
              <Button
                key={link.to}
                component={Link}
                to={link.to}
                onClick={closeMobileMenu}
                sx={{
                  color: 'white',
                  justifyContent: 'flex-start',
                  py: 1.5,
                  px: 2,
                  textAlign: 'left',
                  '&:hover': {
                    bgcolor: 'rgba(255, 215, 0, 0.1)',
                    color: '#FFD700',
                  }
                }}
              >
                {link.label}
              </Button>
            ))}

            {/* Language Switcher in Drawer */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 215, 0, 0.2)' }}>
              <Typography sx={{ color: '#B0B8C4', mb: 1, px: 2, fontSize: '0.9rem' }}>
                {t('language')}
              </Typography>
              <Button
                onClick={() => { changeLanguage('zh'); closeMobileMenu(); }}
                sx={{
                  color: i18n.language === 'zh' ? '#FFD700' : 'white',
                  justifyContent: 'flex-start',
                  py: 1,
                  px: 2,
                  width: '100%',
                  '&:hover': {
                    bgcolor: 'rgba(255, 215, 0, 0.1)',
                  }
                }}
              >
                中文
              </Button>
              <Button
                onClick={() => { changeLanguage('en'); closeMobileMenu(); }}
                sx={{
                  color: i18n.language === 'en' ? '#FFD700' : 'white',
                  justifyContent: 'flex-start',
                  py: 1,
                  px: 2,
                  width: '100%',
                  '&:hover': {
                    bgcolor: 'rgba(255, 215, 0, 0.1)',
                  }
                }}
              >
                English
              </Button>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}

export default Header
