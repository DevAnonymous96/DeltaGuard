// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// ============================================
// MATH LIBRARY - Statistical Functions
// ============================================

/**
 * @title MathLib
 * @notice Advanced mathematical operations for IL calculations
 * @dev Uses fixed-point arithmetic (18 decimals) for precision
 */
library MathLib {
    uint256 private constant SCALE = 1e18;
    int256 private constant SCALE_INT = 1e18;
    
    // ============ Errors ============
    
    error InvalidInput();
    error OverflowError();
    error DivisionByZero();
    
    // ============ Core Functions ============
    
    /**
     * @notice Calculate natural logarithm using Taylor series approximation
     * @dev ln(x) = 2 * [(x-1)/(x+1) + 1/3*((x-1)/(x+1))^3 + ...]
     * @param x Input value (scaled by 1e18)
     * @return Natural log of x (scaled by 1e18)
     */
    function ln(uint256 x) internal pure returns (int256) {
        if (x == 0) revert DivisionByZero();
        if (x == SCALE) return 0; // ln(1) = 0
        
        // For x close to 1, use Taylor series
        // ln(x) ≈ 2 * sum((x-1)/(x+1))^(2n+1) / (2n+1)
        
        int256 result;
        int256 y = int256(x);
        
        // Normalize to range [0.5, 2]
        int256 power = 0;
        while (y > 2 * SCALE_INT) {
            y = y / 2;
            power++;
        }
        while (y < SCALE_INT / 2) {
            y = y * 2;
            power--;
        }
        
        // Calculate ln using approximation
        int256 z = (y - SCALE_INT) * SCALE_INT / (y + SCALE_INT);
        int256 z_squared = z * z / SCALE_INT;
        
        result = 2 * z; // First term
        
        // Add higher order terms
        int256 term = z;
        for (uint256 i = 1; i < 10; i++) {
            term = term * z_squared / SCALE_INT;
            result += 2 * term / int256(2 * i + 1);
        }
        
        // Adjust for normalization
        result += power * 693147180559945309; // ln(2) * SCALE
        
        return result;
    }
    
    /**
     * @notice Square root using Babylonian method
     * @param x Input value
     * @return Square root of x
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        
        return y;
    }
    
    /**
     * @notice Normal CDF approximation using Hart 1968 algorithm
     * @dev Approximates P(X <= x) for standard normal distribution
     * @param x Input value (scaled by 1e18, can be negative)
     * @return Probability * 1e18 (0 to 1e18)
     */
    function normalCDF(int256 x) internal pure returns (uint256) {
        // Constants for Hart 1968 approximation
        int256 a1 = 254829592;
        int256 a2 = -284496736;
        int256 a3 = 1421413741;
        int256 a4 = -1453152027;
        int256 a5 = 1061405429;
        int256 p = 327591100; // 0.3275911 * 1e9
        
        // Handle negative values using symmetry: N(-x) = 1 - N(x)
        bool isNegative = x < 0;
        if (isNegative) x = -x;
        
        // Normalize x
        int256 t = SCALE_INT * 1e9 / (1e9 + p * x / SCALE_INT);
        
        // Calculate approximation
        int256 y = a1 * t / 1e9;
        y = (y + a2) * t / 1e9;
        y = (y + a3) * t / 1e9;
        y = (y + a4) * t / 1e9;
        y = (y + a5) * t / 1e9;
        
        // Calculate e^(-x^2/2) approximation
        int256 exponent = -x * x / (2 * SCALE_INT);
        int256 exp_val = _exp(exponent);
        
        int256 result = SCALE_INT - (y * exp_val / SCALE_INT);
        
        if (isNegative) {
            result = SCALE_INT - result;
        }
        
        return uint256(result);
    }
    
    /**
     * @notice Exponential function approximation
     * @dev e^x using Taylor series
     */
    function _exp(int256 x) private pure returns (int256) {
        int256 result = SCALE_INT;
        int256 term = SCALE_INT;
        
        for (uint256 i = 1; i < 20; i++) {
            term = term * x / (int256(i) * SCALE_INT);
            result += term;
            
            if (term < 1000) break; // Convergence check
        }
        
        return result;
    }
    
    /**
     * @notice Calculate absolute value
     */
    function abs(int256 x) internal pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }
}
