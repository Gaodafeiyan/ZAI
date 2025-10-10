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
  const [fromToken, setFromToken] = useState('USDT'); // USDT, ZUSD, ZAI
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
    // 当输入金额改变时，获取预估输出
    if (amount && parseFloat(amount) > 0) {
      if ((fromToken === 'ZUSD' && toToken === 'ZAI') || (fromToken === 'ZAI' && toToken === 'ZUSD')) {
        getEstimatedOutput(fromToken === 'ZUSD' ? 'buy' : 'sell');
      } else if ((fromToken === 'USDT' && toToken === 'ZUSD') || (fromToken === 'ZUSD' && toToken === 'USDT')) {
        // OTC 模式 1:1 兑换
        setEstimatedOutput(amount);
      }
    } else {
      setEstimatedOutput('0');
    }
  }, [amount, fromToken, toToken]);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await loadBalances(accounts[0]);
        }
      } catch (error) {
        console.error('检查钱包连接失败:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('请安装 MetaMask 钱包!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      setAccount(accounts[0]);
      await loadBalances(accounts[0]);
      toast.success('钱包连接成功!');
    } catch (error) {
      console.error('连接钱包失败:', error);
      toast.error('连接钱包失败!');
    }
  };

  const loadBalances = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // USDT余额
      const usdtContract = new ethers.Contract(
        CONTRACTS.USDT,
        USDTABI.abi,
        provider
      );
      const usdtBal = await usdtContract.balanceOf(address);
      setUsdtBalance(ethers.formatUnits(usdtBal, 18));

      // ZUSD余额
      const zusdContract = new ethers.Contract(
        CONTRACTS.ZUSD,
        ZUSDABI.abi,
        provider
      );
      const zusdBal = await zusdContract.balanceOf(address);
      setZusdBalance(ethers.formatUnits(zusdBal, 18));

      // ZAI余额
      const zaiContract = new ethers.Contract(
        CONTRACTS.ZAI,
        ZAIABI.abi,
        provider
      );
      const zaiBal = await zaiContract.balanceOf(address);
      setZaiBalance(ethers.formatUnits(zaiBal, 18));

    } catch (error) {
      console.error('加载余额失败:', error);
    }
  };

  const getEstimatedOutput = async (direction) => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const routerContract = new ethers.Contract(
        CONTRACTS.PANCAKE_ROUTER,
        PancakeRouterABI.abi,
        provider
      );

      const amountIn = ethers.parseUnits(amount, 18);
      const path = direction === 'buy'
        ? [CONTRACTS.ZUSD, CONTRACTS.ZAI]  // ZUSD -> ZAI (买入)
        : [CONTRACTS.ZAI, CONTRACTS.ZUSD]; // ZAI -> ZUSD (卖出)

      try {
        const amounts = await routerContract.getAmountsOut(amountIn, path);
        if (!amounts || amounts.length < 2 || amounts[1] === 0n) {
          setEstimatedOutput('流动性不足');
          return;
        }
        const output = ethers.formatUnits(amounts[1], 18);
        setEstimatedOutput(parseFloat(output).toFixed(4));
      } catch (error) {
        console.error('获取预估价格失败:', error);
        if (error.message && (error.message.includes('INSUFFICIENT_LIQUIDITY') || error.message.includes('K'))) {
          setEstimatedOutput('流动性不足');
        } else {
          setEstimatedOutput('无法获取价格');
        }
      }
    } catch (error) {
      console.error('预估输出失败:', error);
      setEstimatedOutput('0');
    }
  };

  const handleTokenSwitch = () => {
    // 根据当前代币对决定可切换的选项
    if (fromToken === 'USDT' && toToken === 'ZUSD') {
      setFromToken('ZUSD');
      setToToken('USDT');
    } else if (fromToken === 'ZUSD' && toToken === 'USDT') {
      setFromToken('USDT');
      setToToken('ZUSD');
    } else if (fromToken === 'ZUSD' && toToken === 'ZAI') {
      setFromToken('ZAI');
      setToToken('ZUSD');
    } else if (fromToken === 'ZAI' && toToken === 'ZUSD') {
      setFromToken('ZUSD');
      setToToken('ZAI');
    }
    setAmount('');
    setEstimatedOutput('0');
  };

  const handleFromTokenChange = (e) => {
    const newFrom = e.target.value;
    setFromToken(newFrom);

    // 自动调整目标代币
    if (newFrom === 'USDT') {
      setToToken('ZUSD');
    } else if (newFrom === 'ZUSD') {
      setToToken(toToken === 'ZUSD' ? 'ZAI' : toToken);
    } else if (newFrom === 'ZAI') {
      setToToken('ZUSD');
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
    } else if ((fromToken === 'ZUSD' && toToken === 'ZAI') || (fromToken === 'ZAI' && toToken === 'ZUSD')) {
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

      // 根据交易方向确定代币合约和路径
      const isbuying = fromToken === 'ZUSD' && toToken === 'ZAI';
      const tokenContract = new ethers.Contract(
        isbuying ? CONTRACTS.ZUSD : CONTRACTS.ZAI,
        isbuying ? ZUSDABI.abi : ZAIABI.abi,
        signer
      );
      const routerContract = new ethers.Contract(
        CONTRACTS.PANCAKE_ROUTER,
        PancakeRouterABI.abi,
        signer
      );

      const amountIn = ethers.parseUnits(amount, 18);
      const path = isbuying
        ? [CONTRACTS.ZUSD, CONTRACTS.ZAI]  // ZUSD -> ZAI (买入)
        : [CONTRACTS.ZAI, CONTRACTS.ZUSD]; // ZAI -> ZUSD (卖出)

      // 先检查流动性池是否有足够的流动性
      let amounts;
      try {
        amounts = await routerContract.getAmountsOut(amountIn, path);
        if (!amounts || amounts.length < 2 || amounts[1] === 0n) {
          throw new Error('INSUFFICIENT_LIQUIDITY');
        }
        console.log(`预估输出: ${ethers.formatUnits(amounts[1], 18)} ${toToken}`);
      } catch (error) {
        console.error('获取价格失败:', error);
        if (error.message && (error.message.includes('INSUFFICIENT_LIQUIDITY') || error.message.includes('K'))) {
          toast.error('流动性池流动性不足，请减少兑换金额或稍后重试');
        } else {
          toast.error('无法获取兑换价格，流动性池可能需要初始化');
        }
        setLoading(false);
        return;
      }

      // 检查授权
      const tokenName = isbuying ? 'ZUSD' : 'ZAI';
      toast.info(`检查 ${tokenName} 授权...`);
      const allowance = await tokenContract.allowance(account, CONTRACTS.PANCAKE_ROUTER);

      if (allowance < amountIn) {
        toast.info(`正在授权 ${tokenName}...`);
        const approveTx = await tokenContract.approve(
          CONTRACTS.PANCAKE_ROUTER,
          ethers.MaxUint256
        );
        await approveTx.wait();
        toast.success(`✅ ${tokenName} 授权成功！`);
      }

      // 设置用户自定义滑点
      const slippagePercent = parseFloat(slippage) || 0.5;
      const slippageBps = BigInt(Math.floor((100 - slippagePercent) * 100)); // 转换为基点
      const amountOutMin = (amounts[1] * slippageBps) / 10000n;

      // 执行兑换
      toast.info(`正在兑换 ${amount} ${fromToken} 为 ${toToken} (滑点: ${slippagePercent}%)...`);
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

      const received = ethers.formatUnits(amounts[1], 18);
      toast.success(`✅ 兑换成功！获得 ${parseFloat(received).toFixed(4)} ${toToken}`);

      console.log(`${fromToken} -> ${toToken} 兑换成功: ${receipt.hash}`);

      // 刷新余额
      await loadBalances(account);

      // 清空输入
      setAmount('');
      setEstimatedOutput('0');

    } catch (error) {
      console.error('DEX Swap failed:', error);
      if (error.code === 'ACTION_REJECTED') {
        toast.error('用户取消交易');
      } else if (error.message && error.message.includes('K')) {
        toast.error('流动性池错误：可能需要添加流动性');
      } else {
        toast.error('兑换失败: ' + (error.reason || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const getSwapModeText = () => {
    if ((fromToken === 'USDT' && toToken === 'ZUSD') || (fromToken === 'ZUSD' && toToken === 'USDT')) {
      return 'OTC 模式 (1:1)';
    } else if (fromToken === 'ZUSD' && toToken === 'ZAI') {
      return '买入 ZAI';
    } else if (fromToken === 'ZAI' && toToken === 'ZUSD') {
      return '卖出 ZAI';
    }
    return 'DEX 兑换';
  };

  const getButtonText = () => {
    if (!account) return '连接钱包';
    if (loading) return '处理中...';
    if (fromToken === 'ZUSD' && toToken === 'ZAI') {
      return '买入 ZAI';
    } else if (fromToken === 'ZAI' && toToken === 'ZUSD') {
      return '卖出 ZAI';
    }
    return '兑换';
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          borderRadius: 4
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff' }}>
              代币兑换
            </Typography>
            <IconButton
              onClick={() => setShowSettings(!showSettings)}
              sx={{ color: '#fff' }}
            >
              <SettingsIcon />
            </IconButton>
          </Box>

          <Collapse in={showSettings}>
            <Paper sx={{ p: 2, mb: 3, backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Typography sx={{ color: '#fff', mb: 1 }}>
                滑点设置 (仅DEX模式)
              </Typography>
              <TextField
                fullWidth
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="0.5"
                type="number"
                inputProps={{ min: 0.1, max: 50, step: 0.1 }}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  '& input': { color: '#fff' },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
                InputProps={{
                  endAdornment: <Typography sx={{ color: '#fff' }}>%</Typography>
                }}
              />
            </Paper>
          </Collapse>

          <Alert severity="info" sx={{ mb: 3 }}>
            当前模式: <strong>{getSwapModeText()}</strong>
            {((fromToken === 'USDT' && toToken === 'ZUSD') || (fromToken === 'ZUSD' && toToken === 'USDT')) && (
              <> | 兑换范围: 10 - 10,000</>
            )}
          </Alert>

          <Paper sx={{ p: 3, mb: 2, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#fff' }}>从</Typography>
              <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>
                余额: {fromToken === 'USDT' ? parseFloat(usdtBalance).toFixed(2) :
                      (fromToken === 'ZUSD' ? parseFloat(zusdBalance).toFixed(2) : parseFloat(zaiBalance).toFixed(2))}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  '& input': { color: '#fff', fontSize: '1.5rem' },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
              />
              <Select
                value={fromToken}
                onChange={handleFromTokenChange}
                sx={{
                  minWidth: 120,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
              >
                <MenuItem value="USDT">USDT</MenuItem>
                <MenuItem value="ZUSD">ZUSD</MenuItem>
                <MenuItem value="ZAI">ZAI</MenuItem>
              </Select>
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <IconButton
              onClick={handleTokenSwitch}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
              }}
            >
              <SwapVertIcon />
            </IconButton>
          </Box>

          <Paper sx={{ p: 3, mb: 3, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#fff' }}>到</Typography>
              <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>
                余额: {toToken === 'USDT' ? parseFloat(usdtBalance).toFixed(2) :
                      (toToken === 'ZUSD' ? parseFloat(zusdBalance).toFixed(2) : parseFloat(zaiBalance).toFixed(2))}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                placeholder="0.0"
                value={estimatedOutput}
                disabled
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  '& input': { color: '#fff', fontSize: '1.5rem' },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
              />
              <Box
                sx={{
                  minWidth: 120,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 2
                }}
              >
                {toToken}
              </Box>
            </Box>
          </Paper>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={account ? handleSwap : connectWallet}
            disabled={loading || (account && (!amount || parseFloat(amount) <= 0))}
            startIcon={!account && <AccountBalanceWalletIcon />}
            sx={{
              py: 2,
              backgroundColor: '#fff',
              color: '#764ba2',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              },
              '&:disabled': {
                backgroundColor: 'rgba(255,255,255,0.3)',
                color: 'rgba(255,255,255,0.7)'
              }
            }}
          >
            {loading && <CircularProgress size={24} sx={{ mr: 1 }} />}
            {getButtonText()}
          </Button>

          {account && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                已连接: {account.slice(0, 6)}...{account.slice(-4)}
              </Typography>
            </Box>
          )}
        </CardContent>
      </MotionCard>
    </Container>
  );
}