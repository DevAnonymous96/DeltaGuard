// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// ============================================
// PRICE RANGE LIBRARY
// ============================================

/**
 * @title PriceRangeLib
 * @notice Utilities for Uniswap V4 tick/price conversions
 */
library PriceRangeLib {
    int256 private constant MIN_TICK = -887272;
    int256 private constant MAX_TICK = 887272;
    uint256 private constant Q96 = 2**96;
    
    // ============ Errors ============
    
    error TickOutOfBounds();
    
    /**
     * @notice Convert tick to price
     * @dev price = 1.0001^tick
     * @param tick Uniswap V4 tick
     * @return Price (scaled by 1e18)
     */
    function tickToPrice(int24 tick) internal pure returns (uint256) {
        if (tick < MIN_TICK || tick > MAX_TICK) revert TickOutOfBounds();
        
        // Simplified: price = 1.0001^tick ≈ e^(tick * ln(1.0001))
        // ln(1.0001) ≈ 0.00009999500033
        
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        
        // Calculate 1.0001^tick using exponentiation
        uint256 price = 1e18;
        uint256 base = 1000100000000000000; // 1.0001 * 1e18
        
        uint256 remaining = absTick;
        uint256 current = base;
        
        while (remaining > 0) {
            if (remaining & 1 == 1) {
                price = price * current / 1e18;
            }
            current = current * current / 1e18;
            remaining >>= 1;
        }
        
        if (tick < 0) {
            price = 1e36 / price;
        }
        
        return price;
    }
    
    /**
     * @notice Calculate range width as percentage
     * @param tickLower Lower tick
     * @param tickUpper Upper tick
     * @return Range width in basis points
     */
    function calculateRangeWidth(
        int24 tickLower,
        int24 tickUpper
    ) internal pure returns (uint256) {
        if (tickLower >= tickUpper) revert TickOutOfBounds();
        
        uint256 lowerPrice = tickToPrice(tickLower);
        uint256 upperPrice = tickToPrice(tickUpper);
        
        // Width = (upper - lower) / lower * 10000
        return (upperPrice - lowerPrice) * 10000 / lowerPrice;
    }
}