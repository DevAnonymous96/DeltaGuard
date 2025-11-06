// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ILPredictor} from "../core/ILPredictor.sol";
import {MathLib} from "../libraries/MathLib.sol";

// ============================================
// SIMULATION HELPER
// ============================================

/**
 * @title SimulationHelper
 * @notice Helper contract for backtesting and scenario analysis
 * @dev Allows testing IL predictions against historical outcomes
 *
 * FIXES APPLIED:
 * ✅ Batch processing for gas efficiency
 * ✅ Statistical analysis of prediction accuracy
 * ✅ Monte Carlo simulation support
 * ✅ Proper error handling
 */
contract SimulationHelper {
    using MathLib for uint256;

    // ============ Structures ============

    struct SimulationResult {
        uint256 predictedIL;
        uint256 actualIL;
        uint256 errorBasisPoints;
        bool wasPredictionAccurate; // Within 20% error
        uint256 timestamp;
    }

    struct BatchResults {
        uint256 accuracyRate; // Basis points
        uint256 avgError; // Basis points
        uint256 maxError; // Basis points
        uint256 totalSimulations;
        uint256 accurateCount;
        uint256 timestamp;
    }

    // ============ Constants ============

    uint256 private constant ACCURACY_THRESHOLD = 2000; // 20% error margin
    uint256 private constant BASIS_POINTS = 10000;

    // ============ External Functions ============

    /**
     * @notice Simulate IL prediction for a single price movement
     * @param initialPrice Starting price
     * @param finalPrice Ending price
     * @param tickLower Lower tick
     * @param tickUpper Upper tick
     * @param predictor IL Predictor contract
     * @return result Simulation results
     */
    function simulatePriceMovement(
        uint256 initialPrice,
        uint256 finalPrice,
        int24 tickLower,
        int24 tickUpper,
        address predictor
    ) external returns (SimulationResult memory result) {
        ILPredictor pred = ILPredictor(predictor);

        // Get prediction at t=0
        (uint256 predictedIL, , ) = pred.predict(
            initialPrice,
            tickLower,
            tickUpper,
            30 days
        );

        // Calculate actual IL
        uint256 actualIL = pred.calculateCurrentIL(initialPrice, finalPrice);

        // Calculate error
        uint256 errorBasisPoints;
        if (predictedIL > actualIL) {
            errorBasisPoints =
                ((predictedIL - actualIL) * BASIS_POINTS) /
                predictedIL;
        } else if (actualIL > 0) {
            errorBasisPoints =
                ((actualIL - predictedIL) * BASIS_POINTS) /
                actualIL;
        }

        // Check accuracy
        bool accurate = errorBasisPoints < ACCURACY_THRESHOLD;

        return
            SimulationResult({
                predictedIL: predictedIL,
                actualIL: actualIL,
                errorBasisPoints: errorBasisPoints,
                wasPredictionAccurate: accurate,
                timestamp: block.timestamp
            });
    }

    /**
     * @notice Run batch simulation with multiple price scenarios
     * @param initialPrice Starting price
     * @param finalPrices Array of ending prices
     * @param tickLower Lower tick
     * @param tickUpper Upper tick
     * @param predictor IL Predictor contract
     * @return results Aggregated batch results
     */
    function runBatchSimulation(
        uint256 initialPrice,
        uint256[] memory finalPrices,
        int24 tickLower,
        int24 tickUpper,
        address predictor
    ) external returns (BatchResults memory results) {
        require(finalPrices.length > 0, "Empty price array");
        require(finalPrices.length <= 100, "Too many simulations"); // Gas limit

        uint256 accurateCount = 0;
        uint256 totalError = 0;
        uint256 maxError = 0;

        for (uint256 i = 0; i < finalPrices.length; i++) {
            SimulationResult memory result = this.simulatePriceMovement(
                initialPrice,
                finalPrices[i],
                tickLower,
                tickUpper,
                predictor
            );

            if (result.wasPredictionAccurate) {
                accurateCount++;
            }

            totalError += result.errorBasisPoints;

            if (result.errorBasisPoints > maxError) {
                maxError = result.errorBasisPoints;
            }
        }

        uint256 accuracyRate = (accurateCount * BASIS_POINTS) /
            finalPrices.length;
        uint256 avgError = totalError / finalPrices.length;

        return
            BatchResults({
                accuracyRate: accuracyRate,
                avgError: avgError,
                maxError: maxError,
                totalSimulations: finalPrices.length,
                accurateCount: accurateCount,
                timestamp: block.timestamp
            });
    }

    /**
     * @notice Generate price scenarios for Monte Carlo simulation
     * @dev Generates N random price movements based on volatility
     *
     * @param currentPrice Current price
     * @param volatility Annualized volatility
     * @param timeHorizon Time period in seconds
     * @param numScenarios Number of scenarios to generate
     * @param seed Random seed
     * @return scenarios Array of simulated final prices
     */
    function generatePriceScenarios(
        uint256 currentPrice,
        uint256 volatility,
        uint256 timeHorizon,
        uint256 numScenarios,
        uint256 seed
    ) external pure returns (uint256[] memory scenarios) {
        require(
            numScenarios > 0 && numScenarios <= 100,
            "Invalid scenario count"
        );

        scenarios = new uint256[](numScenarios);

        // Simple pseudo-random number generation
        // In production, use Chainlink VRF for true randomness
        uint256 random = seed;

        for (uint256 i = 0; i < numScenarios; i++) {
            // Generate random return: μ = 0, σ = volatility * sqrt(t)
            random = uint256(keccak256(abi.encode(random, i)));

            // Map random to normal distribution (simplified)
            // This is a rough approximation - production should use proper normal distribution
            int256 normalReturn = int256(random % (2 * volatility)) -
                int256(volatility);

            // Scale by time
            normalReturn =
                (normalReturn * int256(timeHorizon)) /
                int256(365 days);

            // Calculate final price: P_final = P_current * e^(return)
            // Simplified: P_final = P_current * (1 + return)
            if (normalReturn >= 0) {
                scenarios[i] =
                    currentPrice +
                    (currentPrice * uint256(normalReturn)) /
                    1e18;
            } else {
                uint256 absReturn = uint256(-normalReturn);
                if (absReturn < 1e18) {
                    scenarios[i] =
                        currentPrice -
                        (currentPrice * absReturn) /
                        1e18;
                } else {
                    scenarios[i] = currentPrice / 10; // Cap downside
                }
            }
        }

        return scenarios;
    }

    /**
     * @notice Compare prediction accuracy across different time horizons
     * @param initialPrice Starting price
     * @param finalPrice Ending price
     * @param tickLower Lower tick
     * @param tickUpper Upper tick
     * @param predictor IL Predictor address
     * @return results Array of results for different horizons
     */
    function compareTimeHorizons(
        uint256 initialPrice,
        uint256 finalPrice,
        int24 tickLower,
        int24 tickUpper,
        address predictor
    ) external returns (SimulationResult[] memory results) {
        // Test different time horizons: 1 day, 7 days, 30 days, 90 days
        uint256[] memory horizons = new uint256[](4);
        horizons[0] = 1 days;
        horizons[1] = 7 days;
        horizons[2] = 30 days;
        horizons[3] = 90 days;

        results = new SimulationResult[](4);
        ILPredictor pred = ILPredictor(predictor);

        for (uint256 i = 0; i < horizons.length; i++) {
            (uint256 predictedIL, , ) = pred.predict(
                initialPrice,
                tickLower,
                tickUpper,
                horizons[i]
            );

            uint256 actualIL = pred.calculateCurrentIL(
                initialPrice,
                finalPrice
            );

            uint256 error = predictedIL > actualIL
                ? ((predictedIL - actualIL) * BASIS_POINTS) / predictedIL
                : ((actualIL - predictedIL) * BASIS_POINTS) / actualIL;

            results[i] = SimulationResult({
                predictedIL: predictedIL,
                actualIL: actualIL,
                errorBasisPoints: error,
                wasPredictionAccurate: error < ACCURACY_THRESHOLD,
                timestamp: horizons[i]
            });
        }

        return results;
    }
}
