// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {MathLib} from "./MathLib.sol";

// ============================================
// STATISTICS LIBRARY
// ============================================

/**
 * @title StatisticsLib
 * @notice Statistical calculations for volatility and returns
 */
library StatisticsLib {
    using MathLib for uint256;
    using MathLib for int256;
    
    uint256 private constant SCALE = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    
    // ============ Errors ============
    
    error InsufficientData();
    error InvalidPriceData();
    
    /**
     * @notice Calculate annualized volatility from price series
     * @dev σ_annual = σ_period * sqrt(periods_per_year)
     * @param prices Array of historical prices
     * @param periodsPerYear Number of periods in a year (e.g., 365 for daily)
     * @return Annualized volatility (scaled by 1e18)
     */
    function calculateVolatility(
        uint256[] memory prices,
        uint256 periodsPerYear
    ) internal pure returns (uint256) {
        if (prices.length < 2) revert InsufficientData();
        
        // Calculate log returns
        int256[] memory returnsArray = new int256[](prices.length - 1);
        for (uint256 i = 0; i < prices.length - 1; i++) {
            if (prices[i] == 0 || prices[i + 1] == 0) revert InvalidPriceData();
            
            // ln(P_t+1 / P_t)
            int256 logReturn = MathLib.ln(prices[i + 1] * SCALE / prices[i]);
            returnsArray[i] = logReturn;
        }
        
        // Calculate mean of returns
        int256 mean = 0;
        for (uint256 i = 0; i < returnsArray.length; i++) {
            mean += returnsArray[i];
        }
        mean = mean / int256(returnsArray.length);
        
        // Calculate variance
        uint256 variance = 0;
        for (uint256 i = 0; i < returnsArray.length; i++) {
            int256 diff = returnsArray[i] - mean;
            variance += MathLib.abs(diff * diff) / SCALE;
        }
        variance = variance / returnsArray.length;

        // Standard deviation (volatility)
        uint256 stdDev = MathLib.sqrt(variance);
        
        // Annualize: σ_annual = σ * sqrt(periods_per_year)
        uint256 annualized = stdDev * MathLib.sqrt(periodsPerYear * SCALE) / MathLib.sqrt(SCALE);
        
        return annualized;
    }
    
    /**
     * @notice Calculate simple returns from price series
     * @return Array of returns (scaled by 1e18)
     */
    function calculateReturns(
        uint256[] memory prices
    ) internal pure returns (int256[] memory) {
        if (prices.length < 2) revert InsufficientData();
        
        int256[] memory returnsArray = new int256[](prices.length - 1);
        
        for (uint256 i = 0; i < prices.length - 1; i++) {
            if (prices[i] == 0) revert InvalidPriceData();
            
            // (P_t+1 - P_t) / P_t
            int256 return_pct = (int256(prices[i + 1]) - int256(prices[i])) * int256(SCALE) / int256(prices[i]);
            returnsArray[i] = return_pct;
        }
        
        return returnsArray;
    }
}