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
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InfoIcon from '@mui/icons-material/Info';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { CONTRACTS } from '../utils/constants';
import PancakeRouterABI from '../contracts/PancakeRouter.json';
import USDTABI from '../contracts/USDT.json';
import ZAIABI from '../contracts/ZenithAI.json';

const MotionCard = motion(Card);

export default function Swap() {
  const { t } = useTranslation();
  const [account, setAccount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [expectedZAI, setExpectedZAI] = useState('0');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [zaiBalance, setZaiBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [slippage, setSlippage] = useState('0.5'); // 默认 0.5% 滑点

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (usdtAmount && parseFloat(usdtAmount) > 0) {
      calculateExpectedZAI();
    } else {
      setExpectedZAI('0');
    }
  }, [usdtAmount]);

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
      setUsdtBalance(ethers.formatUnits(usdtBal, 18)); // USDT on BSC is 18 decimals

      // ZAI 合约
      const zaiContract = new ethers.Contract(CONTRACTS.ZAI, ZAIABI.abi, provider);
      const zaiBal = await zaiContract.balanceOf(address);
      setZaiBalance(ethers.formatEther(zaiBal));
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  const calculateExpectedZAI = async () => {
    if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
      setExpectedZAI('0');
      return;
    }

    try {
      setCalculating(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const router = new ethers.Contract(CONTRACTS.PANCAKE_ROUTER, PancakeRouterABI.abi, provider);

      const amountIn = ethers.parseUnits(usdtAmount, 18); // USDT 18 decimals on BSC
      const path = [CONTRACTS.USDT, CONTRACTS.ZUSD, CONTRACTS.ZAI];

      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedOut = amounts[amounts.length - 1]; // 最后一个是 ZAI

      // 扣除滑点
      const slippagePercent = parseFloat(slippage);
      const minAmount = expectedOut * BigInt(Math.floor((100 - slippagePercent) * 100)) / 10000n;

      setExpectedZAI(ethers.formatEther(minAmount));
    } catch (error) {
      console.error('Failed to calculate expected ZAI:', error);
      setExpectedZAI('0');
      toast.error('计算失败，请检查流动性池');
    } finally {
      setCalculating(false);
    }
  };

  const handleSwap = async () => {
    if (!account) {
      toast.error('请先连接钱包！');
      return;
    }

    if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
      toast.error('请输入有效的 USDT 数量！');
      return;
    }

    if (parseFloat(usdtAmount) > parseFloat(usdtBalance)) {
      toast.error('USDT 余额不足！');
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const usdtContract = new ethers.Contract(CONTRACTS.USDT, USDTABI.abi, signer);
      const router = new ethers.Contract(CONTRACTS.PANCAKE_ROUTER, PancakeRouterABI.abi, signer);

      const amountIn = ethers.parseUnits(usdtAmount, 18);

      // 1. 检查授权
      toast.info('检查 USDT 授权...');
      const allowance = await usdtContract.allowance(account, CONTRACTS.PANCAKE_ROUTER);

      if (allowance < amountIn) {
        toast.info('授权 USDT 给 PancakeSwap Router...');
        const approveTx = await usdtContract.approve(
          CONTRACTS.PANCAKE_ROUTER,
          ethers.MaxUint256 // 授权最大值
        );
        toast.info('等待授权交易确认...');
        await approveTx.wait();
        toast.success('USDT 授权成功！');
      }

      // 2. 计算最小输出（扣除滑点）
      const path = [CONTRACTS.USDT, CONTRACTS.ZUSD, CONTRACTS.ZAI];
      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedOut = amounts[amounts.length - 1];
      const slippagePercent = parseFloat(slippage);
      const amountOutMin = expectedOut * BigInt(Math.floor((100 - slippagePercent) * 100)) / 10000n;

      // 3. 执行 Swap
      toast.info('执行 USDT → ZUSD → ZAI 兑换...');
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 分钟后过期

      const swapTx = await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        account,
        deadline
      );

      toast.info('等待交易确认...');
      const receipt = await swapTx.wait();

      // 4. 刷新余额
      await loadBalances(account);

      const actualZAI = ethers.formatEther(expectedOut);
      toast.success(`兑换成功！获得约 ${parseFloat(actualZAI).toFixed(2)} ZAI`);

      // 清空输入
      setUsdtAmount('');
      setExpectedZAI('0');

    } catch (error) {
      console.error('Swap failed:', error);
      if (error.code === 'ACTION_REJECTED') {
        toast.error('用户取消交易');
      } else if (error.message.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
        toast.error('滑点过大，请增加滑点容忍度');
      } else {
        toast.error('兑换失败: ' + (error.reason || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0A0E17 0%, #001529 50%, #0A0E17 100%)',
        py: 8
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              textAlign: 'center',
              mb: 2,
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            USDT → ZAI 兑换
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: '#B0C4DE',
              mb: 6
            }}
          >
            通过 PancakeSwap 路径: USDT → ZUSD → ZAI
          </Typography>
        </motion.div>

        {/* Swap Card */}
        <MotionCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          sx={{
            background: 'linear-gradient(135deg, rgba(0,31,63,0.6) 0%, rgba(0,15,30,0.8) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: 4,
            boxShadow: '0 10px 40px rgba(0, 191, 255, 0.2)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Wallet Info */}
            {account ? (
              <Alert
                severity="success"
                sx={{
                  mb: 3,
                  bgcolor: 'rgba(0, 230, 118, 0.1)',
                  color: '#00E676',
                  border: '1px solid rgba(0, 230, 118, 0.3)'
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  钱包已连接: {account.substring(0, 6)}...{account.substring(account.length - 4)}
                </Typography>
                <Typography variant="caption">
                  USDT 余额: {parseFloat(usdtBalance).toFixed(2)} | ZAI 余额: {parseFloat(zaiBalance).toFixed(2)}
                </Typography>
              </Alert>
            ) : (
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={connectWallet}
                disabled={loading}
                startIcon={<AccountBalanceWalletIcon />}
                sx={{
                  mb: 3,
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#000',
                  fontWeight: 700,
                  py: 1.5,
                  boxShadow: '0 8px 30px rgba(255, 215, 0, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                  }
                }}
              >
                {loading ? '连接中...' : '连接钱包'}
              </Button>
            )}

            {/* Input: USDT */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#B0C4DE', mb: 1 }}>
                支付 USDT
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={usdtAmount}
                onChange={(e) => setUsdtAmount(e.target.value)}
                placeholder="0.00"
                disabled={!account || loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography sx={{ color: '#FFD700', fontWeight: 'bold' }}>USDT</Typography>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    '& fieldset': {
                      borderColor: 'rgba(255, 215, 0, 0.3)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 215, 0, 0.5)'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFD700'
                    }
                  },
                  '& input': {
                    color: '#fff',
                    fontSize: '1.5rem',
                    fontWeight: 'bold'
                  }
                }}
              />
              <Typography variant="caption" sx={{ color: '#90A4AE', mt: 0.5, display: 'block' }}>
                余额: {parseFloat(usdtBalance).toFixed(2)} USDT
              </Typography>
            </Box>

            {/* Swap Icon */}
            <Box sx={{ textAlign: 'center', my: 2 }}>
              <IconButton
                sx={{
                  bgcolor: 'rgba(255, 215, 0, 0.1)',
                  border: '2px solid rgba(255, 215, 0, 0.3)',
                  color: '#FFD700',
                  '&:hover': {
                    bgcolor: 'rgba(255, 215, 0, 0.2)',
                    transform: 'rotate(180deg)',
                    transition: 'transform 0.3s'
                  }
                }}
              >
                <SwapVertIcon />
              </IconButton>
            </Box>

            {/* Output: ZAI */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#B0C4DE', mb: 1 }}>
                获得 ZAI（预计）
              </Typography>
              <TextField
                fullWidth
                value={calculating ? '计算中...' : expectedZAI}
                placeholder="0.00"
                disabled
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography sx={{ color: '#00BFFF', fontWeight: 'bold' }}>ZAI</Typography>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(0, 191, 255, 0.05)',
                    '& fieldset': {
                      borderColor: 'rgba(0, 191, 255, 0.3)'
                    }
                  },
                  '& input': {
                    color: '#00BFFF',
                    fontSize: '1.5rem',
                    fontWeight: 'bold'
                  }
                }}
              />
              <Typography variant="caption" sx={{ color: '#90A4AE', mt: 0.5, display: 'block' }}>
                余额: {parseFloat(zaiBalance).toFixed(2)} ZAI
              </Typography>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 215, 0, 0.2)' }} />

            {/* Slippage Setting */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#B0C4DE', mb: 1 }}>
                滑点容忍度 (%)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {['0.1', '0.5', '1.0'].map((val) => (
                  <Button
                    key={val}
                    size="small"
                    variant={slippage === val ? 'contained' : 'outlined'}
                    onClick={() => setSlippage(val)}
                    sx={{
                      flex: 1,
                      borderColor: '#FFD700',
                      color: slippage === val ? '#000' : '#FFD700',
                      bgcolor: slippage === val ? '#FFD700' : 'transparent',
                      '&:hover': {
                        borderColor: '#FFA500',
                        bgcolor: slippage === val ? '#FFA500' : 'rgba(255, 215, 0, 0.1)'
                      }
                    }}
                  >
                    {val}%
                  </Button>
                ))}
                <TextField
                  size="small"
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  sx={{
                    width: '80px',
                    '& input': { color: '#fff', textAlign: 'center' }
                  }}
                />
              </Box>
            </Box>

            {/* Info */}
            <Alert
              severity="info"
              icon={<InfoIcon />}
              sx={{
                mb: 3,
                bgcolor: 'rgba(0, 191, 255, 0.1)',
                color: '#00BFFF',
                border: '1px solid rgba(0, 191, 255, 0.3)'
              }}
            >
              <Typography variant="caption">
                兑换路径: USDT → ZUSD → ZAI<br />
                预计滑点: {slippage}%<br />
                交易期限: 20 分钟
              </Typography>
            </Alert>

            {/* Swap Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSwap}
              disabled={!account || loading || !usdtAmount || parseFloat(usdtAmount) <= 0}
              sx={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: '#000',
                fontWeight: 700,
                py: 2,
                fontSize: '1.1rem',
                boxShadow: '0 8px 30px rgba(255, 215, 0, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                  boxShadow: '0 12px 40px rgba(255, 215, 0, 0.6)',
                },
                '&:disabled': {
                  background: 'rgba(255, 215, 0, 0.2)',
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: '#000' }} />
                  处理中...
                </>
              ) : (
                '用 USDT 购买 ZAI'
              )}
            </Button>
          </CardContent>
        </MotionCard>

        {/* Price Impact Warning */}
        {parseFloat(expectedZAI) > 0 && parseFloat(usdtAmount) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Alert
              severity="warning"
              sx={{
                mt: 3,
                bgcolor: 'rgba(255, 183, 77, 0.1)',
                color: '#FFB74D',
                border: '1px solid rgba(255, 183, 77, 0.3)'
              }}
            >
              <Typography variant="body2">
                兑换率: 1 USDT ≈ {(parseFloat(expectedZAI) / parseFloat(usdtAmount)).toFixed(4)} ZAI
              </Typography>
            </Alert>
          </motion.div>
        )}
      </Container>
    </Box>
  );
}
