import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AssetPair = 'ETH/USDC' | 'BTC/USDC' | 'OP/USDC' | 'CUSTOM';
export type Strategy = 'conservative' | 'moderate' | 'aggressive';

export interface SimulationResult {
  expectedIL: number;
  exitProbability: number;
  confidence: number;
  recommendation: 'safe' | 'moderate' | 'high' | 'critical';
  netReturn: number;
  shouldRebalance: boolean;
  calculatedAt: number;
}

interface SimulatorState {
  // Input parameters
  assetPair: AssetPair;
  currentPrice: number;
  lowerBound: number;
  upperBound: number;
  timeHorizonDays: number;
  volatility: number;
  feeAPY: number;
  depositAmount: number;
  
  // UI state
  isCalculating: boolean;
  showAdvanced: boolean;
  
  // Results
  result: SimulationResult | null;
  
  // History
  simulationHistory: Array<{
    timestamp: number;
    params: Partial<SimulatorState>;
    result: SimulationResult;
  }>;
  
  // Actions
  setAssetPair: (pair: AssetPair) => void;
  setCurrentPrice: (price: number) => void;
  setPriceRange: (lower: number, upper: number) => void;
  setLowerBound: (bound: number) => void;
  setUpperBound: (bound: number) => void;
  setTimeHorizon: (days: number) => void;
  setVolatility: (vol: number) => void;
  setFeeAPY: (apy: number) => void;
  setDepositAmount: (amount: number) => void;
  setResult: (result: SimulationResult) => void;
  setIsCalculating: (calculating: boolean) => void;
  toggleAdvanced: () => void;
  
  // Preset strategies
  applyStrategy: (strategy: Strategy) => void;
  
  // History management
  saveToHistory: () => void;
  clearHistory: () => void;
  
  // Reset
  reset: () => void;
}

const DEFAULT_PRICES: Record<AssetPair, number> = {
  'ETH/USDC': 2500,
  'BTC/USDC': 45000,
  'OP/USDC': 2.5,
  'CUSTOM': 1000,
};

const DEFAULT_VOLATILITY: Record<AssetPair, number> = {
  'ETH/USDC': 0.65,
  'BTC/USDC': 0.55,
  'OP/USDC': 0.85,
  'CUSTOM': 0.5,
};

const initialState = {
  assetPair: 'ETH/USDC' as AssetPair,
  currentPrice: DEFAULT_PRICES['ETH/USDC'],
  lowerBound: 2000,
  upperBound: 3000,
  timeHorizonDays: 30,
  volatility: DEFAULT_VOLATILITY['ETH/USDC'],
  feeAPY: 12,
  depositAmount: 100000,
  isCalculating: false,
  showAdvanced: false,
  result: null,
  simulationHistory: [],
};

export const useSimulatorStore = create<SimulatorState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setAssetPair: (pair) => {
        const price = DEFAULT_PRICES[pair];
        const vol = DEFAULT_VOLATILITY[pair];
        const range = 0.25; // ±25% default
        
        set({
          assetPair: pair,
          currentPrice: price,
          lowerBound: price * (1 - range),
          upperBound: price * (1 + range),
          volatility: vol,
          result: null,
        });
      },
      
      setCurrentPrice: (price) => {
        const state = get();
        const currentRange = (state.upperBound - state.lowerBound) / 2;
        
        set({
          currentPrice: price,
          lowerBound: price - currentRange,
          upperBound: price + currentRange,
          result: null,
        });
      },
      
      setPriceRange: (lower, upper) => set({ 
        lowerBound: lower, 
        upperBound: upper,
        result: null,
      }),
      
      setLowerBound: (bound) => set({ lowerBound: bound, result: null }),
      setUpperBound: (bound) => set({ upperBound: bound, result: null }),
      setTimeHorizon: (days) => set({ timeHorizonDays: days, result: null }),
      setVolatility: (vol) => set({ volatility: vol, result: null }),
      setFeeAPY: (apy) => set({ feeAPY: apy, result: null }),
      setDepositAmount: (amount) => set({ depositAmount: amount }),
      setResult: (result) => set({ result }),
      setIsCalculating: (calculating) => set({ isCalculating: calculating }),
      toggleAdvanced: () => set((state) => ({ showAdvanced: !state.showAdvanced })),
      
      applyStrategy: (strategy) => {
        const state = get();
        const { currentPrice } = state;
        
        const ranges = {
          conservative: { lower: 0.85, upper: 1.18 }, // Narrow ±15-18%
          moderate: { lower: 0.75, upper: 1.33 },     // Medium ±25-33%
          aggressive: { lower: 0.5, upper: 2.0 },     // Wide ±50-100%
        };
        
        const { lower, upper } = ranges[strategy];
        
        set({
          lowerBound: currentPrice * lower,
          upperBound: currentPrice * upper,
          result: null,
        });
      },
      
      saveToHistory: () => {
        const state = get();
        if (!state.result) return;
        
        const historyEntry = {
          timestamp: Date.now(),
          params: {
            assetPair: state.assetPair,
            currentPrice: state.currentPrice,
            lowerBound: state.lowerBound,
            upperBound: state.upperBound,
            timeHorizonDays: state.timeHorizonDays,
            volatility: state.volatility,
            feeAPY: state.feeAPY,
          },
          result: state.result,
        };
        
        set((state) => ({
          simulationHistory: [historyEntry, ...state.simulationHistory.slice(0, 9)], // Keep last 10
        }));
      },
      
      clearHistory: () => set({ simulationHistory: [] }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'deltaguard-simulator',
      partialize: (state) => ({
        simulationHistory: state.simulationHistory,
        showAdvanced: state.showAdvanced,
      }),
    }
  )
);