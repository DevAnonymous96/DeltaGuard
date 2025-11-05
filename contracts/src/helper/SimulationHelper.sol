// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ILPredictor} from "../core/ILPredictor.sol";
import {MathLib} from "../libraries/MathLib.sol";

// ============================================
// SIMULATION HELPER
// ============================================

/**
 * @title SimulationHelper
 * @notice Helper contract for running IL simulations
 */
contract SimulationHelper {
    using MathLib for uint256;
    
    struct SimulationResult {
        uint256 predictedIL;
        uint256 actualIL;
        uint256 error;
        bool wasPredictionAccurate; // Within 20% error
    }
    
    /**
     * @notice Simulate IL over time with price movements
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
    ) external view returns (SimulationResult memory result) {
        
        ILPredictor pred = ILPredictor(predictor);
        
        // Get prediction at t=0
        (uint256 predictedIL,,) = pred.predict(
            initialPrice,
            tickLower,
            tickUpper,
            30 days
        );
        
        // Calculate actual IL
        uint256 actualIL = pred.calculateCurrentIL(initialPrice, finalPrice);
        
        // Calculate error
        uint256 error;
        if (predictedIL > actualIL) {
            error = ((predictedIL - actualIL) * 10000) / predictedIL;
        } else {
            error = ((actualIL - predictedIL) * 10000) / actualIL;
        }
        
        // Check accuracy (within 20% error)
        bool accurate = error < 2000; // 20%
        
        return SimulationResult({
            predictedIL: predictedIL,
            actualIL: actualIL,
            error: error,
            wasPredictionAccurate: accurate
        });
    }
    
    /**
     * @notice Run batch simulation with multiple price scenarios
     */
    function runBatchSimulation(
        uint256 initialPrice,
        uint256[] memory finalPrices,
        int24 tickLower,
        int24 tickUpper,
        address predictor
    ) external view returns (
        uint256 accuracyRate,
        uint256 avgError
    ) {
        uint256 accurateCount = 0;
        uint256 totalError = 0;
        
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
            
            totalError += result.error;
        }
        
        accuracyRate = (accurateCount * 10000) / finalPrices.length;
        avgError = totalError / finalPrices.length;
        
        return (accuracyRate, avgError);
    }
}