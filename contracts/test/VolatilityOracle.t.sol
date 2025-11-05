// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {VolatilityOracle} from "../src/core/VolatilityOracle.sol";
import {MockChainlinkFeed} from "./Mocks.t.sol";

// ============================================
// TEST SUITE: VOLATILITY ORACLE TESTS
// ============================================

contract VolatilityOracleTest is Test {
    VolatilityOracle public oracle;
    MockChainlinkFeed public priceFeed;
    
    address public owner;
    
    function setUp() public {
        owner = address(this);
        
        // Create mock price feed at $2000
        priceFeed = new MockChainlinkFeed(2000e8); // Chainlink uses 8 decimals
        
        // Deploy oracle
        oracle = new VolatilityOracle(
            address(priceFeed),
            1 hours, // Max staleness
            30 // Max historical prices
        );
    }
    
    function testGetLatestPrice_ReturnsCorrectPrice() public {
        (uint256 price, uint256 timestamp) = oracle.getLatestPrice();
        
        assertEq(price, 2000e8, "Price should be $2000");
        assertEq(timestamp, block.timestamp, "Timestamp should be current");
    }
    
    function testGetLatestPrice_StalePrice_Reverts() public {
        // Move time forward past staleness threshold
        vm.warp(block.timestamp + 2 hours);
        
        vm.expectRevert(VolatilityOracle.StalePrice.selector);
        oracle.getLatestPrice();
    }
    
    function testGetVolatility_InitialState_ReturnsManual() public {
        uint256 volatility = oracle.getVolatility();
        
        // Should return default 10% volatility
        assertEq(volatility, 0.1e18, "Initial volatility should be 10%");
    }
    
    function testUpdatePriceHistory_AddsPrice() public {
        oracle.updatePriceHistory();
        
        uint256[] memory prices = oracle.getHistoricalPrices();
        assertEq(prices.length, 1, "Should have 1 price");
        assertEq(prices[0], 2000e8, "Price should be $2000");
    }
    
    function testUpdatePriceHistory_MultiplePrices() public {
        // Add 5 prices with time advances
        for (uint i = 0; i < 5; i++) {
            oracle.updatePriceHistory();
            vm.warp(block.timestamp + 1 days);
            priceFeed.setPrice(int256(2000e8 + i * 50e8));
        }
        
        uint256[] memory prices = oracle.getHistoricalPrices();
        assertEq(prices.length, 5, "Should have 5 prices");
    }
    
    function testSetManualVolatility_UpdatesValue() public {
        oracle.setManualVolatility(0.3e18); // 30%
        
        oracle.setUseManualVolatility(true);
        uint256 volatility = oracle.getVolatility();
        
        assertEq(volatility, 0.3e18, "Should use manual volatility");
    }
    
    function testSetManualVolatility_TooHigh_Reverts() public {
        vm.expectRevert(VolatilityOracle.InvalidVolatility.selector);
        oracle.setManualVolatility(6e18); // 600% - too high
    }
}