// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {StatisticsLib} from "../src/libraries/StatisticsLib.sol";

// ============================================
// TEST SUITE: STATISTICS LIBRARY TESTS
// ============================================

contract StatisticsLibTest is Test {
    using StatisticsLib for uint256[];
    
    uint256 constant SCALE = 1e18;
    
    function testCalculateVolatility_StablePrices_ReturnsLowVolatility() public {
        // Stable prices: 2000, 2000, 2000, 2000
        uint256[] memory prices = new uint256[](4);
        prices[0] = 2000 * SCALE;
        prices[1] = 2000 * SCALE;
        prices[2] = 2000 * SCALE;
        prices[3] = 2000 * SCALE;
        
        uint256 volatility = prices.calculateVolatility(365);
        
        // Should be near zero
        assertLt(volatility, 1e16, "Stable prices should have low volatility");
    }
    
    function testCalculateVolatility_VolatilePrices_ReturnsHighVolatility() public {
        // Volatile prices: 2000, 2500, 1800, 2200
        uint256[] memory prices = new uint256[](4);
        prices[0] = 2000 * SCALE;
        prices[1] = 2500 * SCALE; // +25%
        prices[2] = 1800 * SCALE; // -28%
        prices[3] = 2200 * SCALE; // +22%
        
        uint256 volatility = prices.calculateVolatility(365);
        
        // Should be high (>50% annualized)
        assertGt(volatility, 0.5e18, "Volatile prices should have high volatility");
    }
    
    function testCalculateVolatility_InsufficientData_Reverts() public {
        uint256[] memory prices = new uint256[](1);
        prices[0] = 2000 * SCALE;
        
        vm.expectRevert(StatisticsLib.InsufficientData.selector);
        prices.calculateVolatility(365);
    }
    
    function testCalculateVolatility_ZeroPrice_Reverts() public {
        uint256[] memory prices = new uint256[](3);
        prices[0] = 2000 * SCALE;
        prices[1] = 0; // Invalid
        prices[2] = 2100 * SCALE;
        
        vm.expectRevert(StatisticsLib.InvalidPriceData.selector);
        prices.calculateVolatility(365);
    }
    
    function testCalculateReturns_PositiveReturn() public {
        uint256[] memory prices = new uint256[](2);
        prices[0] = 2000 * SCALE;
        prices[1] = 2200 * SCALE; // +10%

        int256[] memory returnsArray = StatisticsLib.calculateReturns(prices);

        assertEq(returnsArray.length, 1, "Should have 1 return");

        // Return should be +10% (0.1 * 1e18)
        assertApproxEqAbs(uint256(returnsArray[0]), 0.1e18, 1e16, "Return should be ~10%");
    }
    
    function testCalculateReturns_NegativeReturn() public {
        uint256[] memory prices = new uint256[](2);
        prices[0] = 2000 * SCALE;
        prices[1] = 1800 * SCALE; // -10%
        
        int256[] memory returnsArray = StatisticsLib.calculateReturns(prices);
        
        // Return should be -10%
        assertTrue(returnsArray[0] < 0, "Return should be negative");
        assertApproxEqAbs(uint256(-returnsArray[0]), 0.1e18, 1e16, "Return should be ~-10%");
    }
}
