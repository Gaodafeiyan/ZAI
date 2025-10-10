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
  IconButton,
  Paper,
  Select,
  MenuItem,
  Collapse
} from '@mui/material';
import { motion } from 'framer-motion';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SettingsIcon from '@mui/icons-material/Settings';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { CONTRACTS } from '../utils/constants';
import USDTABI from '../contracts/USDT.json';
import ZUSDABI from '../contracts/ZUSD.json';
import ZAIABI from '../contracts/ZenithAI.json';
import PancakeRouterABI from '../contracts/PancakeRouter.json';

const MotionCard = motion(Card);

export default function Swap() {
  const [account, setAccount] = useState('');
  const [fromToken, setFromToken] = useState('USDT'); // USDT, ZUSD
  const [toToken, setToToken] = useState('ZUSD'); // ZUSD, USDT, ZAI
  const [amount, setAmount] = useState('');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [zusdBalance, setZusdBalance] = useState('0');
  const [zaiBalance, setZaiBalance] = useState('0');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [loading, setLoading] = useState(false);
  const [slippage, setSlippage] = useState('0.5'); // 默认 0.5% 滑点
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    // 当输入金额改变时，如果是 ZUSD -> ZAI，获取预估输出
    if (fromToken === 'ZUSD' && toToken === 'ZAI' && amount && parseFloat(amount) > 0) {
      getEstimatedZAI();
    } else if ((fromToken === 'USDT' && toToken === 'ZUSD') || (fromToken === 'ZUSD' && toToken === 'USDT')) {
      // OTC 模式 1:1
      setEstimatedOutput(amount);
    }
  }, [amount, fromToken, toToken]);

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

      // ZAI 合约
      const zaiContract = new ethers.Contract(CONTRACTS.ZAI, ZAIABI.abi, provider);
      const zaiBal = await zaiContract.balanceOf(address);
      setZaiBalance(ethers.formatUnits(zaiBal, 18));
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  const getEstimatedZAI = async () => {
    try {
      if (!amount || parseFloat(amount) <= 0) {
        setEstimatedOutput('0');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const routerContract = new ethers.Contract(
        CONTRACTS.PANCAKE_ROUTER,
        PancakeRouterABI.abi,
        provider
      );

      const amountIn = ethers.parseUnits(amount, 18);
      const path = [CONTRACTS.ZUSD, CONTRACTS.ZAI];

      const amounts = await routerContract.getAmountsOut(amountIn, path);
      const estimatedZAI = ethers.formatUnits(amounts[1], 18);
      setEstimatedOutput(estimatedZAI);
    } catch (error) {
      console.error('Failed to get estimated ZAI:', error);
      setEstimatedOutput('0');
    }
  };

  const handleTokenSelect = (position, token) => {
    if (position === 'from') {
      setFromToken(token);
      // 根据 from token 自动设置 to token
      if (token === 'USDT') {
        setToToken('ZUSD');
      } else if (token === 'ZUSD') {
        setToToken('ZAI'); // 默认 ZUSD -> ZAI
      }
    } else {
      setToToken(token);
    }
    setAmount('');
    setEstimatedOutput('0');
  };

  const handleSwapDirection = () => {
    // 只有 USDT <-> ZUSD 可以双向兑换
    if ((fromToken === 'USDT' && toToken === 'ZUSD') || (fromToken === 'ZUSD' && toToken === 'USDT')) {
      setFromToken(toToken);
      setToToken(fromToken);
      setAmount('');
      setEstimatedOutput('0');
    } else {
      toast.warning('ZUSD → ZAI 为单向兑换');
    }
  };

  const handleSlippageChange = (value) => {
    // 验证滑点值
    const numValue = parseFloat(value);
    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 50)) {
      setSlippage(value);
    }
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

    const fromBalance = fromToken === 'USDT' ? usdtBalance : (fromToken === 'ZUSD' ? zusdBalance : zaiBalance);
    if (parseFloat(amount) > parseFloat(fromBalance)) {
      toast.error(`${fromToken} 余额不足！`);
      return;
    }

    // OTC 模式验证金额范围
    if ((fromToken === 'USDT' && toToken === 'ZUSD') || (fromToken === 'ZUSD' && toToken === 'USDT')) {
      if (parseFloat(amount) < 10) {
        toast.error('最小兑换金额为 10！');
        return;
      }
      if (parseFloat(amount) > 10000) {
        toast.error('最大兑换金额为 10000！');
        return;
      }
      await handleOTCSwap();
    } else if (fromToken === 'ZUSD' && toToken === 'ZAI') {
      await handleDEXSwap();
    }
  };

  const handleOTCSwap = async () => {
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
      setEstimatedOutput('0');

      // 提示用户等待到账
      toast.warning(`⏰ 请等待 ${toToken} 到账...`, {
        autoClose: 15000
      });

    } catch (error) {
      console.error('OTC Swap failed:', error);
      if (error.code === 'ACTION_REJECTED') {
        toast.error('用户取消交易');
      } else {
        toast.error('兑换失败: ' + (error.reason || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDEXSwap = async () => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const zusdContract = new ethers.Contract(CONTRACTS.ZUSD, ZUSDABI.abi, signer);
      const routerContract = new ethers.Contract(
        CONTRACTS.PANCAKE_ROUTER,
        PancakeRouterABI.abi,
        signer
      );

      const amountIn = ethers.parseUnits(amount, 18);
      const path = [CONTRACTS.ZUSD, CONTRACTS.ZAI];

      // 检查授权
      toast.info('检查 ZUSD 授权...');
      const allowance = await zusdContract.allowance(account, CONTRACTS.PANCAKE_ROUTER);

      if (allowance < amountIn) {
        toast.info('正在授权 ZUSD...');
        const approveTx = await zusdContract.approve(
          CONTRACTS.PANCAKE_ROUTER,
          ethers.MaxUint256
        );
        await approveTx.wait();
        toast.success('✅ ZUSD 授权成功！');
      }

      // 获取最新价格并设置用户自定义滑点
      const amounts = await routerContract.getAmountsOut(amountIn, path);
      const slippagePercent = parseFloat(slippage) || 0.5;
      const slippageBps = BigInt(Math.floor((100 - slippagePercent) * 100)); // 转换为基点
      const amountOutMin = (amounts[1] * slippageBps) / 10000n;

      // 执行兑换
      toast.info(`正在兑换 ${amount} ZUSD 为 ZAI (滑点: ${slippagePercent}%)...`);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟

      const swapTx = await routerContract.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        account,
        deadline
      );

      toast.info('等待交易确认...');
      const receipt = await swapTx.wait();

      const receivedZAI = ethers.formatUnits(amounts[1], 18);
      toast.success(`✅ 兑换成功！获得 ${parseFloat(receivedZAI).toFixed(4)} ZAI`);

      console.log(`ZUSD -> ZAI 兑换成功: ${receipt.hash}`);

      // 刷新余额
      await loadBalances(account);

      // 清空输入
      setAmount('');
      setEstimatedOutput('0');

    } catch (error) {
      console.error('DEX Swap failed:', error);
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
    if (token === 'USDT') return usdtBalance;
    if (token === 'ZUSD') return zusdBalance;
    if (token === 'ZAI') return zaiBalance;
    return '0';
  };

  const getAvailableToTokens = () => {
    if (fromToken === 'USDT') return ['ZUSD'];
    if (fromToken === 'ZUSD') return ['USDT', 'ZAI'];
    return [];
  };

  const isOTCMode = (fromToken === 'USDT' && toToken === 'ZUSD') || (fromToken === 'ZUSD' && toToken === 'USDT');
  const isDEXMode = fromToken === 'ZUSD' && toToken === 'ZAI';

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#fff'
              }}
            >
              兑换
            </Typography>
            {account && isDEXMode && (
              <IconButton
                onClick={() => setShowSettings(!showSettings)}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <SettingsIcon />
              </IconButton>
            )}
          </Box>
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
            {/* Slippage Settings (只在 DEX 模式显示) */}
            {account && isDEXMode && (
              <Collapse in={showSettings}>
                <Paper
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1.5 }}>
                    滑点容差 (%)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                    {['0.1', '0.5', '1.0'].map((preset) => (
                      <Button
                        key={preset}
                        variant={slippage === preset ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setSlippage(preset)}
                        sx={{
                          flex: 1,
                          color: slippage === preset ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                          bgcolor: slippage === preset ? 'rgba(255, 0, 122, 0.8)' : 'transparent',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          '&:hover': {
                            bgcolor: slippage === preset ? 'rgba(255, 0, 122, 1)' : 'rgba(255, 255, 255, 0.05)',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          }
                        }}
                      >
                        {preset}%
                      </Button>
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    type="number"
                    value={slippage}
                    onChange={(e) => handleSlippageChange(e.target.value)}
                    placeholder="自定义"
                    variant="outlined"
                    size="small"
                    InputProps={{
                      endAdornment: <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', ml: 1 }}>%</Typography>,
                      sx: {
                        color: '#fff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#FF007A',
                        }
                      }
                    }}
                  />
                  {parseFloat(slippage) > 5 && (
                    <Alert severity="warning" sx={{ mt: 1, fontSize: '0.75rem' }}>
                      滑点过高可能导致交易损失
                    </Alert>
                  )}
                </Paper>
              </Collapse>
            )}

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
                    <Select
                      value={fromToken}
                      onChange={(e) => handleTokenSelect('from', e.target.value)}
                      disabled={loading}
                      sx={{
                        minWidth: '100px',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontWeight: 600,
                        borderRadius: 2,
                        '& .MuiOutline-notchedOutline': { border: 'none' },
                        '& .MuiSelect-icon': { color: '#fff' }
                      }}
                    >
                      <MenuItem value="USDT">USDT</MenuItem>
                      <MenuItem value="ZUSD">ZUSD</MenuItem>
                    </Select>
                  </Box>
                </Paper>

                {/* Swap Direction Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center', my: -1, position: 'relative', zIndex: 1 }}>
                  <IconButton
                    onClick={handleSwapDirection}
                    disabled={loading || !isOTCMode}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      border: '4px solid #0A0E17',
                      color: isOTCMode ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                      '&:hover': {
                        bgcolor: isOTCMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      },
                      '&:disabled': {
                        color: 'rgba(255, 255, 255, 0.2)'
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
                        color: estimatedOutput && parseFloat(estimatedOutput) > 0 ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                        flex: 1
                      }}
                    >
                      {estimatedOutput && parseFloat(estimatedOutput) > 0 ? parseFloat(estimatedOutput).toFixed(4) : '0.0'}
                    </Typography>
                    <Select
                      value={toToken}
                      onChange={(e) => handleTokenSelect('to', e.target.value)}
                      disabled={loading}
                      sx={{
                        minWidth: '100px',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontWeight: 600,
                        borderRadius: 2,
                        '& .MuiOutline-notchedOutline': { border: 'none' },
                        '& .MuiSelect-icon': { color: '#fff' }
                      }}
                    >
                      {getAvailableToTokens().map(token => (
                        <MenuItem key={token} value={token}>{token}</MenuItem>
                      ))}
                    </Select>
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
                    {isOTCMode && (
                      <>
                        <Typography variant="body2">
                          1 {fromToken} = 1 {toToken}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                          兑换限额: 10 - 10,000 • 预计到账时间: ~30秒 • OTC 模式
                        </Typography>
                      </>
                    )}
                    {isDEXMode && (
                      <>
                        <Typography variant="body2">
                          {amount} ZUSD ≈ {estimatedOutput && parseFloat(estimatedOutput).toFixed(4)} ZAI
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                          PancakeSwap 实时兑换 • 滑点: {slippage}% • 即时到账
                        </Typography>
                      </>
                    )}
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
