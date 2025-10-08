import { ethers } from 'ethers';
import { CONTRACTS, CHAIN_CONFIG } from './constants';

// ABIs will be imported from contract files
import ZAI_ABI from '../contracts/ZenithAI.json';
import ZUSD_ABI from '../contracts/ZenithUSD.json';
import MINING_ABI from '../contracts/ZenithMining.json';

let provider = null;
let signer = null;

// Initialize Web3 provider
export const initProvider = async () => {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask!');
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  // Request account access
  await provider.send('eth_requestAccounts', []);

  signer = await provider.getSigner();

  // Check if on BSC Mainnet
  const network = await provider.getNetwork();
  if (network.chainId !== 56n) {
    await switchToBSC();
  }

  return { provider, signer };
};

// Switch to BSC Mainnet
export const switchToBSC = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_CONFIG.chainId }],
    });
  } catch (switchError) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [CHAIN_CONFIG],
      });
    } else {
      throw switchError;
    }
  }
};

// Get contract instances
export const getContracts = async () => {
  if (!signer) {
    await initProvider();
  }

  return {
    zai: new ethers.Contract(CONTRACTS.ZAI, ZAI_ABI.abi, signer),
    zusd: new ethers.Contract(CONTRACTS.ZUSD, ZUSD_ABI.abi, signer),
    mining: new ethers.Contract(CONTRACTS.MINING, MINING_ABI.abi, signer)
  };
};

// Get user address
export const getAddress = async () => {
  if (!signer) {
    await initProvider();
  }
  return await signer.getAddress();
};

// Get BNB balance
export const getBNBBalance = async (address) => {
  if (!provider) {
    await initProvider();
  }
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
};

// Format token amount
export const formatToken = (amount, decimals = 18) => {
  return ethers.formatUnits(amount, decimals);
};

// Parse token amount
export const parseToken = (amount, decimals = 18) => {
  return ethers.parseUnits(amount.toString(), decimals);
};

// Listen to account changes
export const onAccountsChanged = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', callback);
  }
};

// Listen to chain changes
export const onChainChanged = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', callback);
  }
};

// Disconnect wallet
export const disconnectWallet = () => {
  provider = null;
  signer = null;
};

export { provider, signer };
