/**
 * IL Calculator - Core mathematical functions
 * Implements Black-Scholes model for IL prediction
 */

// Calculate impermanent loss percentage
export function calculateIL(initialPrice: number, finalPrice: number): number {
  const priceRatio = finalPrice / initialPrice;
  const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  return Math.abs(il * 100); // Return as positive percentage
}

// Calculate price ratio from IL percentage
export function ilToPriceRatio(ilPercent: number): number {
  // Inverse of IL formula (approximate)
  const il = ilPercent / 100;
  // For small IL, approximate price ratio
  return Math.pow(1 + il, 2);
}

// Calculate cumulative normal distribution (approximation)
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Calculate d2 parameter for Black-Scholes
function calculateD2(
  currentPrice: number,
  strikePrice: number,
  volatility: number,
  timeToExpiry: number
): number {
  const volSqrtT = volatility * Math.sqrt(timeToExpiry);
  if (volSqrtT === 0) return 0;
  
  return (Math.log(currentPrice / strikePrice) - (volatility * volatility * timeToExpiry) / 2) / volSqrtT;
}

// Calculate probability of price exiting range
export function calculateExitProbability(
  currentPrice: number,
  lowerBound: number,
  upperBound: number,
  volatility: number,
  timeHorizonDays: number
): number {
  // Convert time to years
  const timeToExpiry = timeHorizonDays / 365;
  
  // Probability of going below lower bound
  const d2Lower = calculateD2(currentPrice, lowerBound, volatility, timeToExpiry);
  const probBelow = normalCDF(d2Lower);
  
  // Probability of going above upper bound
  const d2Upper = calculateD2(currentPrice, upperBound, volatility, timeToExpiry);
  const probAbove = 1 - normalCDF(d2Upper);
  
  // Total exit probability
  return (probBelow + probAbove) * 100;
}

// Calculate expected IL based on exit probability and price movement
export function calculateExpectedIL(
  currentPrice: number,
  lowerBound: number,
  upperBound: number,
  volatility: number,
  timeHorizonDays: number
): number {
  const exitProb = calculateExitProbability(currentPrice, lowerBound, upperBound, volatility, timeHorizonDays);
  
  // Calculate potential IL if price moves to bounds
  const ilAtLower = calculateIL(currentPrice, lowerBound);
  const ilAtUpper = calculateIL(currentPrice, upperBound);
  
  // Weight by probability and distance
  const avgIL = (ilAtLower + ilAtUpper) / 2;
  
  // Expected IL = probability of exit × average IL at bounds
  // Add decay factor for time
  const timeFactor = Math.min(timeHorizonDays / 90, 1); // Max at 90 days
  
  return (exitProb / 100) * avgIL * timeFactor;
}

// Calculate confidence level based on volatility and time
export function calculateConfidence(
  volatility: number,
  timeHorizonDays: number,
  historicalAccuracy: number = 73 // Default based on research
): number {
  // Higher volatility = lower confidence
  const volFactor = Math.max(0, 1 - (volatility - 0.3) / 0.7); // 30-100% vol range
  
  // Longer time = lower confidence
  const timeFactor = Math.max(0.5, 1 - timeHorizonDays / 180); // Up to 180 days
  
  // Combined confidence
  return Math.min(100, historicalAccuracy * volFactor * timeFactor);
}

// Calculate annualized volatility from price history
export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0.5; // Default
  
  // Calculate returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  
  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Annualize (assuming daily prices)
  return stdDev * Math.sqrt(365);
}

// Generate IL curve data points for visualization
export function generateILCurve(
  initialPrice: number,
  numPoints: number = 100
): Array<{ priceRatio: number; price: number; il: number }> {
  const points: Array<{ priceRatio: number; price: number; il: number }> = [];
  
  // Generate from 0.2x to 5x price change
  const minRatio = 0.2;
  const maxRatio = 5;
  const step = (maxRatio - minRatio) / numPoints;
  
  for (let i = 0; i <= numPoints; i++) {
    const ratio = minRatio + i * step;
    const price = initialPrice * ratio;
    const il = calculateIL(initialPrice, price);
    points.push({ priceRatio: ratio, price, il });
  }
  
  return points;
}

// Calculate recommended range based on volatility
export function recommendRange(
  currentPrice: number,
  volatility: number,
  strategy: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): { lower: number; upper: number } {
  const multipliers = {
    conservative: { lower: 0.85, upper: 1.15 }, // ±15%
    moderate: { lower: 0.75, upper: 1.33 },     // ±25-33%
    aggressive: { lower: 0.6, upper: 1.67 },    // ±40-67%
  };
  
  const { lower: lowerMult, upper: upperMult } = multipliers[strategy];
  
  // Adjust based on volatility
  const volAdjustment = 1 + (volatility - 0.5) * 0.5; // Higher vol = wider range
  
  return {
    lower: currentPrice * lowerMult * volAdjustment,
    upper: currentPrice * upperMult * volAdjustment,
  };
}

// Calculate optimal rebalancing threshold
export function calculateRebalanceThreshold(
  feeAPY: number,
  expectedIL: number,
  safeYieldAPY: number = 3.5 // Default Aave USDC APY
): { shouldRebalance: boolean; netReturn: number; recommendation: string } {
  const netReturn = feeAPY - expectedIL;
  const threshold = safeYieldAPY + 2; // 2% safety margin
  
  const shouldRebalance = netReturn < threshold;
  
  let recommendation = '';
  if (shouldRebalance) {
    recommendation = `Switch to lending (${safeYieldAPY}% APY). Current net return (${netReturn.toFixed(2)}%) below threshold.`;
  } else {
    recommendation = `Continue LP position. Net return (${netReturn.toFixed(2)}%) exceeds safe yield by ${(netReturn - safeYieldAPY).toFixed(2)}%.`;
  }
  
  return { shouldRebalance, netReturn, recommendation };
}

// Simulate IL over time with Monte Carlo
export function simulateILOverTime(
  currentPrice: number,
  lowerBound: number,
  upperBound: number,
  volatility: number,
  days: number,
  simulations: number = 100
): Array<{ day: number; avgIL: number; maxIL: number; minIL: number }> {
  const results: Array<{ day: number; avgIL: number; maxIL: number; minIL: number }> = [];
  
  for (let day = 0; day <= days; day += Math.ceil(days / 20)) {
    const ilValues: number[] = [];
    
    for (let sim = 0; sim < simulations; sim++) {
      // Random price walk
      const randomReturn = (Math.random() - 0.5) * volatility * Math.sqrt(day / 365) * 2;
      const simulatedPrice = currentPrice * Math.exp(randomReturn);
      const il = calculateIL(currentPrice, simulatedPrice);
      ilValues.push(il);
    }
    
    results.push({
      day,
      avgIL: ilValues.reduce((a, b) => a + b, 0) / ilValues.length,
      maxIL: Math.max(...ilValues),
      minIL: Math.min(...ilValues),
    });
  }
  
  return results;
}

// Calculate fee earnings projection
export function projectFeeEarnings(
  depositedValue: number,
  feeAPY: number,
  days: number
): number {
  const dailyRate = feeAPY / 100 / 365;
  return depositedValue * dailyRate * days;
}

// Calculate net P&L (fees - IL)
export function calculateNetPnL(
  depositedValue: number,
  feeAPY: number,
  ilPercent: number,
  days: number
): { fees: number; ilLoss: number; netPnL: number; netAPY: number } {
  const fees = projectFeeEarnings(depositedValue, feeAPY, days);
  const ilLoss = (ilPercent / 100) * depositedValue;
  const netPnL = fees - ilLoss;
  const netAPY = (netPnL / depositedValue) * (365 / days) * 100;
  
  return { fees, ilLoss, netPnL, netAPY };
}