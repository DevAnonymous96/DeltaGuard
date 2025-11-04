// Core Types for DeltaGuard Frontend

export interface PredictionResult {
  expectedIL: number; // In basis points (e.g., 573 = 5.73%)
  exitProbability: number; // Percentage (0-100)
  confidence: number; // Percentage (0-100)
  timeHorizon: number; // In seconds
  calculatedAt: number; // Timestamp
}

export interface Position {
  id: string;
  poolId: string;
  token0: Token;
  token1: Token;
  amount0: bigint;
  amount1: bigint;
  tickLower: number;
  tickUpper: number;
  currentPrice: number;
  deposited: number; // USD value at deposit
  currentValue: number; // Current USD value
  feesEarned: number; // USD value
  ilRisk: number; // Current IL risk percentage
  status: 'active' | 'idle' | 'rebalancing' | 'warning';
  createdAt: number;
  lastRebalance?: number;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface Pool {
  id: string;
  token0: Token;
  token1: Token;
  fee: number;
  tickSpacing: number;
  liquidity: bigint;
  sqrtPriceX96: bigint;
  tick: number;
}

export interface SimulationParams {
  assetPair: 'ETH/USDC' | 'BTC/USDC' | 'OP/USDC' | 'CUSTOM';
  initialPrice: number;
  priceRange: [number, number]; // [lower, upper]
  timeHorizon: number; // In seconds
  volatility: number; // Annual volatility (e.g., 0.5 = 50%)
}

export interface RebalanceEvent {
  id: string;
  positionId: string;
  timestamp: number;
  reason: 'high_il_risk' | 'out_of_range' | 'manual' | 'scheduled';
  oldRange: [number, number];
  newRange: [number, number];
  gasCost: bigint;
  impact: number; // IL prevented (percentage)
}

export interface HistoricalDataPoint {
  timestamp: number;
  price: number;
  predictedIL: number;
  actualIL?: number;
  feesEarned: number;
  value: number;
}

export interface UserStats {
  totalDeposited: number;
  currentValue: number;
  totalFeesEarned: number;
  totalILPrevented: number;
  totalDonated: number;
  activePositions: number;
  predictionAccuracy: number;
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface PoolPerformance {
  poolId: string;
  poolName: string;
  totalFees: number;
  ilPrevented: number;
  netAPY: number;
  volume24h: number;
  tvl: number;
}

export type RiskLevel = 'safe' | 'moderate' | 'high' | 'critical';

export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0-100
  recommendation: string;
  factors: {
    volatility: number;
    exitProbability: number;
    timeInRange: number;
    liquidityDepth: number;
  };
}

export interface TransactionStatus {
  hash?: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  confirmations?: number;
}

// Contract interaction types
export interface DepositParams {
  amount0: bigint;
  amount1: bigint;
  tickLower: number;
  tickUpper: number;
  recipient: string;
}

export interface WithdrawParams {
  shares: bigint;
  recipient: string;
}

// UI State types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}