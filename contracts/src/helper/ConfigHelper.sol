// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;


// ============================================
// CONFIGURATION HELPER
// ============================================

/**
 * @title ConfigHelper
 * @notice Helper contract for managing configuration
 */
contract ConfigHelper {
    
    /**
     * @notice Get recommended IL warning threshold based on asset volatility
     * @param annualizedVolatility Volatility (scaled by 1e18)
     * @return threshold Recommended threshold in basis points
     */
    function getRecommendedILThreshold(
        uint256 annualizedVolatility
    ) external pure returns (uint256 threshold) {
        // More volatile assets = higher threshold (more tolerant)
        if (annualizedVolatility < 0.3e18) {
            return 300; // 3% for stable pairs
        } else if (annualizedVolatility < 0.6e18) {
            return 500; // 5% for moderate volatility
        } else {
            return 800; // 8% for high volatility
        }
    }
    
    /**
     * @notice Get recommended tick range based on volatility
     * @param volatility Annualized volatility (scaled by 1e18)
     * @return tickLower Lower tick
     * @return tickUpper Upper tick
     */
    function getRecommendedRange(
        uint256 volatility
    ) external pure returns (int24 tickLower, int24 tickUpper) {
        // Higher volatility = wider range
        if (volatility < 0.3e18) {
            return (-500, 500); // Tight range for stable
        } else if (volatility < 0.8e18) {
            return (-1000, 1000); // Medium range
        } else {
            return (-2000, 2000); // Wide range for volatile
        }
    }
    
    /**
     * @notice Calculate optimal rebalance frequency
     * @param volatility Annualized volatility
     * @param gasPrice Current gas price in gwei
     * @return cooldown Recommended cooldown in seconds
     */
    function getOptimalRebalanceFrequency(
        uint256 volatility,
        uint256 gasPrice
    ) external pure returns (uint256 cooldown) {
        // Base cooldown
        uint256 baseCooldown = 1 hours;
        
        // Adjust for volatility (higher vol = more frequent checks)
        if (volatility > 1e18) {
            baseCooldown = 30 minutes;
        }
        
        // Adjust for gas prices (high gas = less frequent)
        if (gasPrice > 50) { // > 50 gwei
            baseCooldown = baseCooldown * 2;
        }
        
        return baseCooldown;
    }
}