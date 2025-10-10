import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Paper
} from '@mui/material';
import { motion } from 'framer-motion';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { CONTRACTS } from '../utils/constants';
import USDTABI from '../contracts/USDT.json';
import ZUSDABI from '../contracts/ZUSD.json';

const MotionCard = motion(Card);

export default function Swap() {
  const [account, setAccount] = useState('');
  const [fromToken, setFromToken] = useState('USDT'); // USDT or ZUSD
  const [toToken, setToToken] = useState('ZUSD'); // ZUSD or USDT
  const [amount, setAmount] = useState('');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [zusdBalance, setZusdBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          await loadBalances(address);
        }
      } catch (error) {
        console.error('Failed to check wallet:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('请安装 MetaMask 钱包！');
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // 检查网络
      const network = await provider.getNetwork();
      if (network.chainId !== 56n) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }],
        });
      }

      setAccount(address);
      await loadBalances(address);
      toast.success('钱包连接成功！');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('钱包连接失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // USDT 合约
      const usdtContract = new ethers.Contract(CONTRACTS.USDT, USDTABI.abi, provider);
      const usdtBal = await usdtContract.balanceOf(address);
      setUsdtBalance(ethers.formatUnits(usdtBal, 18));

      // ZUSD 合约
      const zusdContract = new ethers.Contract(CONTRACTS.ZUSD, ZUSDABI.abi, provider);
      const zusdBal = await zusdContract.balanceOf(address);
      setZusdBalance(ethers.formatUnits(zusdBal, 18));
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  const handleSwapDirection = () => {
    // 交换方向
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount('');
  };

  const handleSwap = async () => {
    if (!account) {
      toast.error('请先连接钱包！');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('请输入有效的金额！');
      return;
    }

    const fromBalance = fromToken === 'USDT' ? usdtBalance : zusdBalance;
    if (parseFloat(amount) > parseFloat(fromBalance)) {
      toast.error(`${fromToken} 余额不足！`);
      return;
    }

    // 验证金额范围
    if (parseFloat(amount) < 10) {
      toast.error('最小兑换金额为 10！');
      return;
    }

    if (parseFloat(amount) > 10000) {
      toast.error('最大兑换金额为 10000！');
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const fromContract = new ethers.Contract(
        fromToken === 'USDT' ? CONTRACTS.USDT : CONTRACTS.ZUSD,
        fromToken === 'USDT' ? USDTABI.abi : ZUSDABI.abi,
        signer
      );

      const amountIn = ethers.parseUnits(amount, 18);

      // 转账到监控钱包
      toast.info(`正在转账 ${amount} ${fromToken} 到兑换系统...`);
      const transferTx = await fromContract.transfer(
        CONTRACTS.MONITOR_WALLET,
        amountIn
      );

      toast.info('等待交易确认...');
      const receipt = await transferTx.wait();

      toast.success(`✅ ${fromToken} 转账成功！`);
      toast.info(`🔄 系统正在处理，预计30秒内 ${amount} ${toToken} 将自动转入您的钱包...`, {
        autoClose: 10000
      });

      console.log(`${fromToken}转账成功: ${receipt.hash}`);
      console.log(`监控系统将自动转出 ${amount} ${toToken} 到 ${account}`);

      // 刷新余额
      await loadBalances(account);

      // 清空输入
      setAmount('');

      // 提示用户等待到账
      toast.warning(`⏰ 请等待 ${toToken} 到账...`, {
        autoClose: 15000
      });

    } catch (error) {
      console.error('Swap failed:', error);
      if (error.code === 'ACTION_REJECTED') {
        toast.error('用户取消交易');
      } else {
        toast.error('兑换失败: ' + (error.reason || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const getBalance = (token) => {
    return token === 'USDT' ? usdtBalance : zusdBalance;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0A0E17 0%, #001529 50%, #0A0E17 100%)',
        py: 8
      }}
    >
      <Container maxWidth="sm">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              mb: 4,
              color: '#fff'
            }}
          >
            兑换
          </Typography>
        </motion.div>

        {/* Swap Card */}
        <MotionCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          sx={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          <CardContent sx={{ p: 3 }}>
            {/* Connect Wallet Button */}
            {!account ? (
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={connectWallet}
                disabled={loading}
                startIcon={<AccountBalanceWalletIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #FF007A, #FF6B9D)',
                  color: '#fff',
                  fontWeight: 600,
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '1rem',
                  borderRadius: 2,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #E6006D, #FF5A8C)',
                  }
                }}
              >
                {loading ? '连接中...' : '连接钱包'}
              </Button>
            ) : (
              <>
                {/* From Token */}
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    mb: 1
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      支付
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      余额: {parseFloat(getBalance(fromToken)).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      disabled={loading}
                      variant="standard"
                      InputProps={{
                        disableUnderline: true,
                        sx: {
                          fontSize: '2rem',
                          fontWeight: 500,
                          color: '#fff',
                          '& input': {
                            textAlign: 'left',
                            '&::placeholder': {
                              color: 'rgba(255, 255, 255, 0.3)',
                              opacity: 1
                            }
                          }
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      sx={{
                        minWidth: '100px',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontWeight: 600,
                        py: 1,
                        px: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.15)',
                        }
                      }}
                    >
                      {fromToken}
                    </Button>
                  </Box>
                </Paper>

                {/* Swap Direction Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center', my: -1, position: 'relative', zIndex: 1 }}>
                  <IconButton
                    onClick={handleSwapDirection}
                    disabled={loading}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      border: '4px solid #0A0E17',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    <SwapVertIcon />
                  </IconButton>
                </Box>

                {/* To Token */}
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    mb: 3
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      接收（预计）
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      余额: {parseFloat(getBalance(toToken)).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography
                      sx={{
                        fontSize: '2rem',
                        fontWeight: 500,
                        color: amount && parseFloat(amount) > 0 ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                        flex: 1
                      }}
                    >
                      {amount && parseFloat(amount) > 0 ? amount : '0.0'}
                    </Typography>
                    <Button
                      variant="contained"
                      sx={{
                        minWidth: '100px',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontWeight: 600,
                        py: 1,
                        px: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.15)',
                        }
                      }}
                    >
                      {toToken}
                    </Button>
                  </Box>
                </Paper>

                {/* Exchange Rate Info */}
                {amount && parseFloat(amount) > 0 && (
                  <Alert
                    severity="info"
                    sx={{
                      mb: 2,
                      bgcolor: 'rgba(33, 114, 229, 0.1)',
                      border: '1px solid rgba(33, 114, 229, 0.3)',
                      color: '#2172E5',
                      '& .MuiAlert-icon': {
                        color: '#2172E5'
                      }
                    }}
                  >
                    <Typography variant="body2">
                      1 {fromToken} = 1 {toToken}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      兑换限额: 10 - 10,000 • 预计到账时间: ~30秒
                    </Typography>
                  </Alert>
                )}

                {/* Swap Button */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSwap}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  sx={{
                    background: 'linear-gradient(135deg, #FF007A, #FF6B9D)',
                    color: '#fff',
                    fontWeight: 600,
                    py: 2,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    borderRadius: 2,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #E6006D, #FF5A8C)',
                    },
                    '&:disabled': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1, color: '#fff' }} />
                      处理中...
                    </>
                  ) : (
                    '兑换'
                  )}
                </Button>

                {/* Wallet Info */}
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
                    已连接钱包
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, mt: 0.5 }}>
                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </MotionCard>
      </Container>
    </Box>
  );
}
