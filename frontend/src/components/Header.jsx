import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material'
import { Link } from 'react-router-dom'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'

function Header({ account, onConnect, loading }) {
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
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
              Home
            </Button>
            <Button component={Link} to="/dashboard" color="inherit" sx={{ '&:hover': { color: '#FFD700' } }}>
              Dashboard
            </Button>
            <Button component={Link} to="/mining" color="inherit" sx={{ '&:hover': { color: '#FFD700' } }}>
              Mining
            </Button>
            <Button component={Link} to="/referral" color="inherit" sx={{ '&:hover': { color: '#FFD700' } }}>
              Referral
            </Button>
            <Button component={Link} to="/wallet" color="inherit" sx={{ '&:hover': { color: '#FFD700' } }}>
              Wallet
            </Button>

            {account ? (
              <Button
                variant="contained"
                startIcon={<AccountBalanceWalletIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                  color: '#001F3F',
                  fontWeight: 700,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FFC700, #FFB700)',
                  }
                }}
              >
                {formatAddress(account)}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={onConnect}
                disabled={loading}
                startIcon={<AccountBalanceWalletIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #FFD700, #FFC700)',
                  color: '#001F3F',
                  fontWeight: 700,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FFC700, #FFB700)',
                  }
                }}
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Header
