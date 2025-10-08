# Zenithus Frontend

Euro-American style DeFi frontend for Zenithus AI Mining Protocol on BSC.

## Features

- 🌐 Web3 wallet integration (MetaMask)
- ⛏️ Virtual mining system
- 💰 Real-time rewards tracking
- 🔗 3-level referral system
- 📊 Dashboard with statistics
- 🎨 Financial-grade UI (Navy Blue + Gold theme)

## Tech Stack

- **Framework**: React 18 + Vite
- **UI**: Material-UI 5 (Euro-American financial style)
- **Web3**: ethers.js 6
- **Routing**: React Router v6
- **Charts**: Chart.js
- **3D**: Three.js
- **Animations**: Framer Motion

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Contract Addresses (BSC Mainnet)

- **ZAI**: `0xA49c95d8B262c3BD8FDFD6A602cca9db21377605`
- **ZUSD**: `0xe6bE6A764CE488812E0C875107832656fEDE694F`
- **Mining**: `0xb3300A66b1D098eDE8482f9Ff40ec0456eb5b83B`

## Environment Variables

Copy `.env` and configure:

```
VITE_CHAIN_ID=56
VITE_RPC_URL=https://bsc-dataseed.binance.org/
VITE_ZAI_ADDRESS=0xA49c95d8B262c3BD8FDFD6A602cca9db21377605
VITE_ZUSD_ADDRESS=0xe6bE6A764CE488812E0C875107832656fEDE694F
VITE_MINING_ADDRESS=0xb3300A66b1D098eDE8482f9Ff40ec0456eb5b83B
```

## Deployment

Deploy to Vercel/Netlify or your own server with:

```bash
npm run build
# Upload dist/ folder
```

## License

MIT
