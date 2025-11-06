import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';

// Contract addresses from environment
export const CONTRACTS = {
  IL_PREDICTOR: process.env.NEXT_PUBLIC_IL_PREDICTOR_ADDRESS as `0x${string}`,
  VOLATILITY_ORACLE: process.env.NEXT_PUBLIC_VOLATILITY_ORACLE_ADDRESS as `0x${string}`,
  INTELLIGENT_POL_HOOK: process.env.NEXT_PUBLIC_INTELLIGENT_POL_HOOK_ADDRESS as `0x${string}`,
  OCTANT_POL_STRATEGY: process.env.NEXT_PUBLIC_OCTANT_POL_STRATEGY_ADDRESS as `0x${string}`,
  POOL_MANAGER: process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS as `0x${string}`,
  WETH: process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`,
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
} as const;

// Supported chains
export const SUPPORTED_CHAINS = [sepolia, mainnet] as const;

// wagmi configuration
export const wagmiConfig = getDefaultConfig({
  appName: 'DeltaGuard',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '7262761f32f67452fda728e2a9097d84',
  chains: SUPPORTED_CHAINS,
  ssr: true,
});

// Default chain
export const DEFAULT_CHAIN = sepolia;

// Token configuration
export const TOKENS = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
    logoURI: '/tokens/eth.svg',
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    address: CONTRACTS.WETH,
    logoURI: '/tokens/weth.svg',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: CONTRACTS.USDC,
    logoURI: '/tokens/usdc.svg',
  },
} as const;

// Pool configurations
export const POOLS = {
  'ETH/USDC': {
    id: 'eth-usdc',
    token0: TOKENS.WETH,
    token1: TOKENS.USDC,
    fee: 3000, // 0.3%
    tickSpacing: 60,
  },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  subgraph: process.env.NEXT_PUBLIC_SUBGRAPH_URL || '',
  api: process.env.NEXT_PUBLIC_API_URL || '/api',
} as const;

// Constants
export const CONSTANTS = {
  SAFE_YIELD_APY: 3.5, // Aave USDC baseline
  IL_WARNING_THRESHOLD: 5, // 5%
  REBALANCE_COOLDOWN: 24 * 60 * 60, // 24 hours in seconds
  MAX_SLIPPAGE: 50, // 0.5% in basis points
} as const;