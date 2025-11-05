// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title DeltaGuard - Intelligent POL System with Predictive IL Management
 * @author DeltaGuard Team
 * @notice Production-ready contracts for IL prediction and automated treasury management
 */

// ============================================
// IMPORTS
// ============================================

import {BaseHook} from "v4-periphery/utils/BaseHook.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/utils/ReentrancyGuard.sol";
import {AggregatorV3Interface} from "@chainlink/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import {MathLib} from "../libraries/MathLib.sol";
import {PriceRangeLib} from "../libraries/PriceRangeLib.sol";
import {VolatilityOracle} from "./VolatilityOracle.sol";

// ============================================
// IL PREDICTOR - CORE INNOVATION
// ============================================

/**
 * @title ILPredictor
 * @notice Predicts Impermanent Loss using Black-Scholes model
 * @dev First implementation of options pricing theory for IL prediction
 */
contract ILPredictor {
    using MathLib for uint256;
    using MathLib for int256;
    using PriceRangeLib for int24;

    // ============ Constants ============

    uint256 private constant SCALE = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    // ============ State Variables ============

    VolatilityOracle public immutable volatilityOracle;

    // ============ Events ============

    event ILPredicted(
        uint256 currentPrice,
        int24 tickLower,
        int24 tickUpper,
        uint256 expectedIL,
        uint256 exitProbability
    );

    // ============ Errors ============

    error InvalidTickRange();
    error InvalidPrice();
    error InvalidTimeHorizon();

    // ============ Constructor ============

    constructor(address _volatilityOracle) {
        volatilityOracle = VolatilityOracle(_volatilityOracle);
    }

    // ============ External Functions ============

    /**
     * @notice Predict expected IL for an LP position
     * @dev Uses Black-Scholes to calculate exit probability, then expected IL
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
        view
        returns (
            uint256 expectedIL,
            uint256 exitProbability,
            uint256 confidence
        )
    {
        // Input validation
        if (currentPrice == 0) revert InvalidPrice();
        if (tickLower >= tickUpper) revert InvalidTickRange();
        if (timeHorizon == 0) revert InvalidTimeHorizon();

        // Get volatility from oracle
        uint256 volatility = volatilityOracle.getVolatility();

        // Convert ticks to prices
        // Should be:
        uint256 lowerPrice = PriceRangeLib.tickToPrice(tickLower);
        uint256 upperPrice = PriceRangeLib.tickToPrice(tickUpper);

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

        // Confidence based on data quality
        confidence = _calculateConfidence(volatility, timeHorizon);

        emit ILPredicted(
            currentPrice,
            tickLower,
            tickUpper,
            expectedIL,
            exitProbability
        );

        return (expectedIL, exitProbability, confidence);
    }

    /**
     * @notice Calculate current IL for a position
     * @param initialPrice Price when position was opened
     * @param currentPrice Current price
     * @return IL in basis points
     */
    function calculateCurrentIL(
        uint256 initialPrice,
        uint256 currentPrice
    ) external pure returns (uint256) {
        if (initialPrice == 0 || currentPrice == 0) revert InvalidPrice();

        // IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
        uint256 priceRatio = (currentPrice * SCALE) / initialPrice;

        uint256 sqrtRatio = MathLib.sqrt(priceRatio);
        uint256 numerator = 2 * sqrtRatio * SCALE;
        uint256 denominator = SCALE + priceRatio;

        // Result in SCALE, convert to basis points
        uint256 ilScaled = ((numerator * SCALE) / denominator) - SCALE;

        // Convert to basis points (negative IL means loss)
        return (ilScaled * BASIS_POINTS) / SCALE;
    }

    /**
     * @notice Predict IL from an incoming swap
     * @dev Used by hook to warn before large swaps
     */
    function predictILFromSwap(
        uint256 currentPrice,
        int24 tickLower,
        int24 tickUpper,
        int256 swapAmount, // Positive = buy token0, negative = sell token0
        uint256 poolLiquidity
    ) external view returns (uint256 estimatedIL) {
        // Estimate price impact
        uint256 priceImpact = _estimatePriceImpact(swapAmount, poolLiquidity);

        // New price after swap
        uint256 newPrice = swapAmount > 0
            ? currentPrice + priceImpact
            : currentPrice - priceImpact;

        // Check if new price exits range
        // Should be:
        uint256 lowerPrice = PriceRangeLib.tickToPrice(tickLower);
        uint256 upperPrice = PriceRangeLib.tickToPrice(tickUpper);

        if (newPrice < lowerPrice || newPrice > upperPrice) {
            // Calculate IL for exiting range
            return this.calculateCurrentIL(currentPrice, newPrice);
        }

        return 0; // Still in range, minimal IL
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate probability of price exiting range
     * @dev Uses Black-Scholes framework: P(S < K) = N(d2)
     */
    function _calculateExitProbability(
        uint256 currentPrice,
        uint256 lowerPrice,
        uint256 upperPrice,
        uint256 volatility,
        uint256 timeHorizon
    ) internal pure returns (uint256) {
        // Time in years
        uint256 timeInYears = (timeHorizon * SCALE) / SECONDS_PER_YEAR;

        // Calculate d2 for lower bound: d2 = (ln(S/K) - σ²t/2) / (σ√t)
        int256 lnLowerRatio = MathLib.ln((currentPrice * SCALE) / lowerPrice);
        int256 lnUpperRatio = MathLib.ln((currentPrice * SCALE) / upperPrice);

        // σ√t
        uint256 volSqrtT = (volatility * MathLib.sqrt(timeInYears)) /
            MathLib.sqrt(SCALE);

        // σ²t/2
        int256 halfVolSquaredT = int256(
            (volatility * volatility * timeInYears) / (2 * SCALE * SCALE)
        );

        // d2_lower
        int256 d2Lower = ((lnLowerRatio - halfVolSquaredT) * int256(SCALE)) /
            int256(volSqrtT);

        // d2_upper
        int256 d2Upper = ((lnUpperRatio - halfVolSquaredT) * int256(SCALE)) /
            int256(volSqrtT);

        // P(exit) = P(S < lower) + P(S > upper)
        //         = N(d2_lower) + (1 - N(d2_upper))
        uint256 probBelowLower = MathLib.normalCDF(d2Lower);
        uint256 probBelowUpper = MathLib.normalCDF(d2Upper);
        uint256 probAboveUpper = SCALE - probBelowUpper;

        uint256 totalExitProb = probBelowLower + probAboveUpper;

        // Convert to basis points
        return (totalExitProb * BASIS_POINTS) / SCALE;
    }

    /**
     * @notice Calculate average IL if price exits range
     * @dev Simplification: assume uniform distribution of exit prices
     */
    function _calculateAverageIL(
        uint256 currentPrice,
        uint256 lowerPrice,
        uint256 upperPrice
    ) internal pure returns (uint256) {
        // Calculate IL at lower bound
        uint256 ilAtLower = this.calculateCurrentIL(currentPrice, lowerPrice);

        // Calculate IL at upper bound
        uint256 ilAtUpper = this.calculateCurrentIL(currentPrice, upperPrice);

        // Average (simplified - could weight by exit probability)
        return (ilAtLower + ilAtUpper) / 2;
    }

    /**
     * @notice Calculate confidence level
     * @dev Higher confidence with: recent data, moderate volatility
     */
    function _calculateConfidence(
        uint256 volatility,
        uint256 timeHorizon
    ) internal pure returns (uint256) {
        // Start with 100% confidence
        uint256 confidence = BASIS_POINTS;

        // Reduce confidence if volatility is extreme
        if (volatility > 1e18) {
            // > 100% annualized
            confidence = (confidence * 7000) / BASIS_POINTS; // 70%
        }

        // Reduce confidence if time horizon is very long
        if (timeHorizon > 90 days) {
            confidence = (confidence * 8000) / BASIS_POINTS; // 80%
        }

        return confidence;
    }

    /**
     * @notice Estimate price impact from swap
     * @dev Simplified: impact = amount / liquidity
     */
    function _estimatePriceImpact(
        int256 swapAmount,
        uint256 liquidity
    ) internal pure returns (uint256) {
        if (liquidity == 0) return 0;

        uint256 absAmount = MathLib.abs(swapAmount);
        return (absAmount * SCALE) / liquidity;
    }
}
