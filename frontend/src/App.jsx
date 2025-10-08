import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Components
import Header from './components/Header'
import Footer from './components/Footer'

// Pages
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Mining from './pages/Mining'
import Referral from './pages/Referral'
import Wallet from './pages/Wallet'

// Web3
import { initProvider, onAccountsChanged, onChainChanged } from './utils/web3'
import { THEME_COLORS } from './utils/constants'

// Create Euro-American Financial Theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: THEME_COLORS.secondary, // Gold
    },
    secondary: {
      main: THEME_COLORS.primary, // Navy
    },
    background: {
      default: THEME_COLORS.background,
      paper: THEME_COLORS.surface,
    },
    text: {
      primary: THEME_COLORS.text,
      secondary: THEME_COLORS.textSecondary,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    button: {
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #1a1f2e, #0f1419)',
          border: '1px solid rgba(255, 215, 0, 0.2)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.2)',
            borderColor: 'rgba(255, 215, 0, 0.4)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '12px 32px',
          boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(255, 215, 0, 0.5)',
          },
        },
      },
    },
  },
});

function App() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for account changes
    onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(accounts[0]);
      }
    });

    // Listen for chain changes
    onChainChanged(() => {
      window.location.reload();
    });

    // Check if already connected
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      }
    } catch (error) {
      console.error('Check connection error:', error);
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    try {
      const { signer } = await initProvider();
      const address = await signer.getAddress();
      setAccount(address);
    } catch (error) {
      console.error('Connect wallet error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header account={account} onConnect={connectWallet} loading={loading} />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home account={account} onConnect={connectWallet} />} />
              <Route path="/dashboard" element={<Dashboard account={account} />} />
              <Route path="/mining" element={<Mining account={account} />} />
              <Route path="/referral" element={<Referral account={account} />} />
              <Route path="/wallet" element={<Wallet account={account} />} />
            </Routes>
          </main>
          <Footer />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            theme="dark"
            style={{ zIndex: 999999 }}
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App
