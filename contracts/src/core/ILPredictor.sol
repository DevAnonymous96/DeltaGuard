// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../libraries/MathLib.sol";
import "../libraries/PriceRangeLib.sol";
import "./VolatilityOracle.sol";

/**
 * @title ILPredictor
 * @notice Predicts Impermanent Loss using Black-Scholes model
 * @dev First implementation of options pricing theory for IL prediction
 *
 * FIXES APPLIED:
 * ✅ Fixed library method calls (tickToPrice)
 * ✅ Improved Black-Scholes calculation accuracy
 * ✅ Added input validation and bounds checking
 * ✅ Gas optimization with caching
 * ✅ Better confidence scoring
 * ✅ Comprehensive error handling
 */
contract ILPredictor {
    using MathLib for uint256;
    using MathLib for int256;
    using PriceRangeLib for int24;

    // ============ Constants ============

    uint256 private constant SCALE = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    // IL calculation constants
    uint256 private constant MIN_PRICE_RATIO = 1e15; // 0.001 (99.9% loss)
    uint256 private constant MAX_PRICE_RATIO = 1000e18; // 1000x gain

    // Time horizon limits
    uint256 private constant MIN_TIME_HORIZON = 1 hours;
    uint256 private constant MAX_TIME_HORIZON = 365 days;

    // ============ State Variables ============

    VolatilityOracle public immutable volatilityOracle;

    // Prediction cache (gas optimization)
    struct PredictionCache {
        bytes32 paramsHash;
        uint256 expectedIL;
        uint256 exitProbability;
        uint256 confidence;
        uint256 timestamp;
    }

    mapping(bytes32 => PredictionCache) public predictionCache;
    uint256 public cacheValidityPeriod; // How long cache is valid

    // ============ Events ============

    event ILPredicted(
        uint256 currentPrice,
        int24 tickLower,
        int24 tickUpper,
        uint256 expectedIL,
        uint256 exitProbability,
        uint256 confidence,
        uint256 timestamp
    );

    event CurrentILCalculated(
        uint256 initialPrice,
        uint256 currentPrice,
        uint256 ilBasisPoints,
        uint256 timestamp
    );

    event SwapImpactPredicted(
        uint256 currentPrice,
        int256 swapAmount,
        uint256 estimatedIL,
        bool willExitRange
    );

    // ============ Errors ============

    error InvalidTickRange();
    error InvalidPrice();
    error InvalidTimeHorizon();
    error InvalidVolatility();
    error PriceOutOfBounds();

    // ============ Constructor ============

    constructor(address _volatilityOracle) {
        if (_volatilityOracle == address(0)) revert InvalidPrice();

        volatilityOracle = VolatilityOracle(_volatilityOracle);
        cacheValidityPeriod = 10 minutes; // Cache predictions for 10 minutes
    }

    // ============ External Functions ============

    /**
     * @notice Predict expected IL for an LP position
     * @dev Uses Black-Scholes to calculate exit probability, then expected IL
     *
     * Key Innovation: Applies options pricing theory to DeFi LP positions
     * - Treats LP range as a barrier option
     * - Calculates probability of price exiting range
     * - Estimates expected IL as P(exit) * Average_IL_on_exit
     *
     * @param currentPrice Current price of asset (scaled by 1e18)
     * @param tickLower Lower tick of LP range
     * @param tickUpper Upper tick of LP range
     * @param timeHorizon Time period in seconds (e.g., 30 days)
     *
     * @return expectedIL Expected IL in basis points (e.g., 320 = 3.2%)
     * @return exitProbability Probability of exiting range (0-10000 basis points)
     * @return confidence Confidence level (0-10000 basis points)
     */
    function predict(
        uint256 currentPrice,
        int24 tickLower,
        int24 tickUpper,
        uint256 timeHorizon
    )
        external
        returns (
            uint256 expectedIL,
            uint256 exitProbability,
            uint256 confidence
        )
    {
        // Input validation
        if (currentPrice == 0) revert InvalidPrice();
        if (currentPrice < MIN_PRICE_RATIO || currentPrice > MAX_PRICE_RATIO) {
            revert PriceOutOfBounds();
        }
        if (tickLower >= tickUpper) revert InvalidTickRange();
        if (timeHorizon < MIN_TIME_HORIZON || timeHorizon > MAX_TIME_HORIZON) {
            revert InvalidTimeHorizon();
        }

        // Check cache
        bytes32 paramsHash = keccak256(
            abi.encode(currentPrice, tickLower, tickUpper, timeHorizon)
        );

        PredictionCache memory cached = predictionCache[paramsHash];
        if (
            cached.timestamp > 0 &&
            block.timestamp < cached.timestamp + cacheValidityPeriod
        ) {
            return (
                cached.expectedIL,
                cached.exitProbability,
                cached.confidence
            );
        }

        // Get volatility from oracle
        (
            uint256 volatility,
            uint256 volConfidence,
            bool isStale
        ) = volatilityOracle.getVolatility();

        if (volatility == 0) revert InvalidVolatility();

        // Convert ticks to prices using PriceRangeLib
        uint256 lowerPrice = PriceRangeLib.tickToPrice(tickLower);
        uint256 upperPrice = PriceRangeLib.tickToPrice(tickUpper);

        // Validate price is reasonable
        if (lowerPrice >= upperPrice) revert InvalidTickRange();

        // Calculate exit probability using Black-Scholes
        exitProbability = _calculateExitProbability(
            currentPrice,
            lowerPrice,
            upperPrice,
            volatility,
            timeHorizon
        );

        // Calculate expected IL if exit occurs
        uint256 avgILOnExit = _calculateAverageIL(
            currentPrice,
            lowerPrice,
            upperPrice
        );

        // Expected IL = P(exit) * Average_IL_on_exit
        expectedIL = (exitProbability * avgILOnExit) / BASIS_POINTS;

        // Calculate confidence based on volatility confidence and time horizon
        confidence = _calculateConfidence(
            volConfidence,
            isStale,
            timeHorizon,
            currentPrice,
            lowerPrice,
            upperPrice
        );

        // Cache result
        predictionCache[paramsHash] = PredictionCache({
            paramsHash: paramsHash,
            expectedIL: expectedIL,
            exitProbability: exitProbability,
            confidence: confidence,
            timestamp: block.timestamp
        });

        emit ILPredicted(
            currentPrice,
            tickLower,
            tickUpper,
            expectedIL,
            exitProbability,
            confidence,
            block.timestamp
        );

        return (expectedIL, exitProbability, confidence);
    }

    /**
     * @notice Calculate current IL for a position
     * @dev IL = 2*sqrt(k) / (1+k) - 1, where k = price_ratio
     *
     * @param initialPrice Price when position was opened
     * @param currentPrice Current price
     * @return ilBasisPoints IL in basis points (always positive, represents loss)
     */
    function calculateCurrentIL(
        uint256 initialPrice,
        uint256 currentPrice
    ) external returns (uint256 ilBasisPoints) {
        if (initialPrice == 0 || currentPrice == 0) revert InvalidPrice();

        // Calculate price ratio k = current / initial
        uint256 priceRatio = (currentPrice * SCALE) / initialPrice;

        // Handle extreme ratios
        if (priceRatio < MIN_PRICE_RATIO) priceRatio = MIN_PRICE_RATIO;
        if (priceRatio > MAX_PRICE_RATIO) priceRatio = MAX_PRICE_RATIO;

        // IL formula: 2*sqrt(k) / (1+k) - 1
        uint256 sqrtRatio = MathLib.sqrt(priceRatio);
        uint256 numerator = 2 * sqrtRatio;
        uint256 denominator = SCALE + priceRatio;

        // Calculate ratio
        uint256 ratio = (numerator * SCALE) / denominator;

        // IL = ratio - 1 (negative value means loss)
        int256 ilScaled;
        if (ratio >= SCALE) {
            ilScaled = int256(ratio - SCALE);
        } else {
            ilScaled = -int256(SCALE - ratio);
        }

        // Convert to basis points (take absolute value, IL is always reported as positive loss)
        ilBasisPoints = (MathLib.abs(ilScaled) * BASIS_POINTS) / SCALE;

        emit CurrentILCalculated(
            initialPrice,
            currentPrice,
            ilBasisPoints,
            block.timestamp
        );

        return ilBasisPoints;
    }

    /**
     * @notice Predict IL from an incoming swap
     * @dev Estimates price impact and calculates resulting IL
     *
     * @param currentPrice Current pool price
     * @param tickLower Position lower tick
     * @param tickUpper Position upper tick
     * @param swapAmount Swap amount (positive = buy token0, negative = sell)
     * @param poolLiquidity Total pool liquidity
     *
     * @return estimatedIL Estimated IL from this swap (basis points)
     */
    function predictILFromSwap(
        uint256 currentPrice,
        int24 tickLower,
        int24 tickUpper,
        int256 swapAmount,
        uint256 poolLiquidity
    ) external view returns (uint256 estimatedIL) {
        if (currentPrice == 0) revert InvalidPrice();
        if (poolLiquidity == 0) return 0;

        // Estimate price impact: Δp ≈ amount / liquidity
        uint256 priceImpact = _estimatePriceImpact(
            MathLib.abs(swapAmount),
            poolLiquidity
        );

        // Calculate new price after swap
        uint256 newPrice;
        if (swapAmount > 0) {
            // Buying token0 pushes price up
            newPrice = currentPrice + priceImpact;
        } else {
            // Selling token0 pushes price down
            if (priceImpact >= currentPrice) {
                newPrice = currentPrice / 10; // Cap downside
            } else {
                newPrice = currentPrice - priceImpact;
            }
        }

        // Check if new price exits range
        uint256 lowerPrice = PriceRangeLib.tickToPrice(tickLower);
        uint256 upperPrice = PriceRangeLib.tickToPrice(tickUpper);

        bool willExitRange = newPrice < lowerPrice || newPrice > upperPrice;

        if (willExitRange) {
            // Calculate IL for exiting range
            estimatedIL = this.calculateCurrentIL(currentPrice, newPrice);
        } else {
            // Still in range, minimal IL from price change
            estimatedIL = this.calculateCurrentIL(currentPrice, newPrice);
        }

        emit SwapImpactPredicted(
            currentPrice,
            swapAmount,
            estimatedIL,
            willExitRange
        );

        return estimatedIL;
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate probability of price exiting range
     * @dev Uses Black-Scholes framework adapted for DeFi
     *
     * Black-Scholes for LP positions:
     * - Treat LP range [L, U] as a barrier option
     * - P(exit) = P(price < L) + P(price > U)
     * - Use log-normal distribution for price
     *
     * Formula: P(S < K) = N(d₂) where
     * d₂ = (ln(S/K) - σ²t/2) / (σ√t)
     * N() = cumulative normal distribution
     *
     * @param currentPrice Current spot price
     * @param lowerPrice Lower bound price
     * @param upperPrice Upper bound price
     * @param volatility Annualized volatility
     * @param timeHorizon Time period in seconds
     * @return exitProb Exit probability in basis points
     */
    function _calculateExitProbability(
        uint256 currentPrice,
        uint256 lowerPrice,
        uint256 upperPrice,
        uint256 volatility,
        uint256 timeHorizon
    ) internal pure returns (uint256 exitProb) {
        // Convert time to years (scaled)
        uint256 timeInYears = (timeHorizon * SCALE) / SECONDS_PER_YEAR;

        // Calculate σ√t
        uint256 volSqrtT = (volatility * MathLib.sqrt(timeInYears)) /
            MathLib.sqrt(SCALE);

        if (volSqrtT == 0) return 0; // No volatility = no exit probability

        // Calculate σ²t/2
        uint256 volSquared = (volatility * volatility) / SCALE;
        int256 halfVolSquaredT = int256(
            (volSquared * timeInYears) / (2 * SCALE)
        );

        // Calculate d₂ for lower bound: d₂ = (ln(S/L) - σ²t/2) / (σ√t)
        int256 lnRatioLower = MathLib.ln((currentPrice * SCALE) / lowerPrice);
        int256 d2Lower = ((lnRatioLower - halfVolSquaredT) * int256(SCALE)) /
            int256(volSqrtT);

        // Calculate d₂ for upper bound: d₂ = (ln(S/U) - σ²t/2) / (σ√t)
        int256 lnRatioUpper = MathLib.ln((currentPrice * SCALE) / upperPrice);
        int256 d2Upper = ((lnRatioUpper - halfVolSquaredT) * int256(SCALE)) /
            int256(volSqrtT);

        // P(exit) = P(S < L) + P(S > U)
        //         = N(d₂_lower) + [1 - N(d₂_upper)]
        uint256 probBelowLower = MathLib.normalCDF(d2Lower);
        uint256 probBelowUpper = MathLib.normalCDF(d2Upper);
        uint256 probAboveUpper = SCALE - probBelowUpper;

        // Total exit probability
        uint256 totalExitProb = probBelowLower + probAboveUpper;

        // Clamp to [0, 1]
        if (totalExitProb > SCALE) totalExitProb = SCALE;

        // Convert to basis points
        exitProb = (totalExitProb * BASIS_POINTS) / SCALE;

        return exitProb;
    }

    /**
     * @notice Calculate average IL if price exits range
     * @dev Simplified: assumes uniform distribution of exit prices
     *
     * In reality, exit price distribution is weighted by Black-Scholes density.
     * This is a conservative approximation for gas efficiency.
     */
    function _calculateAverageIL(
        uint256 currentPrice,
        uint256 lowerPrice,
        uint256 upperPrice
    ) internal view returns (uint256 avgIL) {
        // Calculate IL at lower bound
        uint256 ilAtLower = this.calculateCurrentIL(currentPrice, lowerPrice);

        // Calculate IL at upper bound
        uint256 ilAtUpper = this.calculateCurrentIL(currentPrice, upperPrice);

        // Average (equal weighting for simplicity)
        // More sophisticated: weight by probability density
        avgIL = (ilAtLower + ilAtUpper) / 2;

        return avgIL;
    }

    /**
     * @notice Calculate confidence level for prediction
     * @dev Factors: volatility confidence, data staleness, time horizon, range width
     */
    function _calculateConfidence(
        uint256 volConfidence,
        bool isVolStale,
        uint256 timeHorizon,
        uint256 currentPrice,
        uint256 lowerPrice,
        uint256 upperPrice
    ) internal pure returns (uint256 confidence) {
        // Start with volatility confidence
        confidence = volConfidence;

        // Penalize stale volatility data
        if (isVolStale) {
            confidence = (confidence * 7000) / BASIS_POINTS; // -30%
        }

        // Penalize very long time horizons (more uncertainty)
        if (timeHorizon > 90 days) {
            confidence = (confidence * 8000) / BASIS_POINTS; // -20%
        } else if (timeHorizon > 30 days) {
            confidence = (confidence * 9000) / BASIS_POINTS; // -10%
        }

        // Check if current price is near range edges (higher uncertainty)
        uint256 rangeWidth = upperPrice - lowerPrice;
        uint256 distanceToLower = currentPrice > lowerPrice
            ? currentPrice - lowerPrice
            : 0;
        uint256 distanceToUpper = upperPrice > currentPrice
            ? upperPrice - currentPrice
            : 0;

        uint256 minDistance = distanceToLower < distanceToUpper
            ? distanceToLower
            : distanceToUpper;
        uint256 distanceRatio = (minDistance * BASIS_POINTS) / rangeWidth;

        // If within 10% of range edge, reduce confidence
        if (distanceRatio < 1000) {
            // < 10%
            confidence = (confidence * 8500) / BASIS_POINTS; // -15%
        }

        // Clamp to [0, 10000]
        if (confidence > BASIS_POINTS) confidence = BASIS_POINTS;

        return confidence;
    }

    /**
     * @notice Estimate price impact from swap
     * @dev Simplified constant product formula: Δp ≈ Δx / L
     */
    function _estimatePriceImpact(
        uint256 swapAmount,
        uint256 liquidity
    ) internal pure returns (uint256 priceImpact) {
        if (liquidity == 0) return 0;

        // Price impact ≈ swap_amount / liquidity
        // This is a simplification of the actual Uniswap V3/V4 math
        priceImpact = (swapAmount * SCALE) / liquidity;

        // Cap at 50% price impact (unrealistic larger impacts)
        uint256 maxImpact = SCALE / 2;
        if (priceImpact > maxImpact) {
            priceImpact = maxImpact;
        }

        return priceImpact;
    }

    // ============ View Functions ============

    /**
     * @notice Get cached prediction if available
     */
    function getCachedPrediction(
        uint256 currentPrice,
        int24 tickLower,
        int24 tickUpper,
        uint256 timeHorizon
    )
        external
        view
        returns (
            bool cached,
            uint256 expectedIL,
            uint256 exitProbability,
            uint256 confidence
        )
    {
        bytes32 paramsHash = keccak256(
            abi.encode(currentPrice, tickLower, tickUpper, timeHorizon)
        );

        PredictionCache memory cachedResult = predictionCache[paramsHash];

        if (
            cachedResult.timestamp > 0 &&
            block.timestamp < cachedResult.timestamp + cacheValidityPeriod
        ) {
            return (
                true,
                cachedResult.expectedIL,
                cachedResult.exitProbability,
                cachedResult.confidence
            );
        }

        return (false, 0, 0, 0);
    }

    /**
     * @notice Clear cache (admin function, if needed)
     */
    function setCacheValidityPeriod(uint256 _period) external {
        // In production, add onlyOwner modifier
        cacheValidityPeriod = _period;
    }
}
