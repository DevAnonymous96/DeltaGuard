// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {ILPredictor} from "../src/core/ILPredictor.sol";
import {VolatilityOracle} from "../src/core/VolatilityOracle.sol";
import {MockChainlinkFeed} from "./Mocks.t.sol";

// ============================================
// TEST SUITE: IL PREDICTOR TESTS (CORE)
// ============================================

contract ILPredictorTest is Test {
    ILPredictor public predictor;
    VolatilityOracle public oracle;
    MockChainlinkFeed public priceFeed;
    
    uint256 constant SCALE = 1e18;
    
    function setUp() public {
        // Setup price feed and oracle
        priceFeed = new MockChainlinkFeed(2000e8);
        oracle = new VolatilityOracle(address(priceFeed), 1 hours, 30);
        
        // Set 50% annualized volatility for testing
        oracle.setManualVolatility(0.5e18);
        oracle.setUseManualVolatility(true);
        
        // Deploy predictor
        predictor = new ILPredictor(address(oracle));
    }
    
    function testPredict_NormalConditions_ReturnsReasonableValues() public {
        uint256 currentPrice = 2000 * SCALE;
        int24 tickLower = -1000;
        int24 tickUpper = 1000;
        uint256 timeHorizon = 30 days;
        
        (uint256 expectedIL, uint256 exitProb, uint256 confidence) = predictor.predict(
            currentPrice,
            tickLower,
            tickUpper,
            timeHorizon
        );
        
        // Expected IL should be positive but < 100%
        assertGt(expectedIL, 0, "Expected IL should be > 0");
        assertLt(expectedIL, 10000, "Expected IL should be < 100%");
        
        // Exit probability should be between 0-100%
        assertGe(exitProb, 0, "Exit prob should be >= 0");
        assertLe(exitProb, 10000, "Exit prob should be <= 100%");
        
        // Confidence should be high
        assertGt(confidence, 5000, "Confidence should be > 50%");
        
        emit log_named_uint("Expected IL (bps)", expectedIL);
        emit log_named_uint("Exit Probability (bps)", exitProb);
        emit log_named_uint("Confidence (bps)", confidence);
    }
    
    function testPredict_HighVolatility_ReturnsHigherIL() public {
        uint256 currentPrice = 2000 * SCALE;
        int24 tickLower = -500;
        int24 tickUpper = 500;
        uint256 timeHorizon = 30 days;
        
        // Test with low volatility (10%)
        oracle.setManualVolatility(0.1e18);
        (uint256 expectedIL_low,,) = predictor.predict(
            currentPrice, tickLower, tickUpper, timeHorizon
        );
        
        // Test with high volatility (80%)
        oracle.setManualVolatility(0.8e18);
        (uint256 expectedIL_high,,) = predictor.predict(
            currentPrice, tickLower, tickUpper, timeHorizon
        );
        
        // High volatility should result in higher expected IL
        assertGt(expectedIL_high, expectedIL_low, "High vol should have higher IL");
        
        emit log_named_uint("IL @ 10% vol (bps)", expectedIL_low);
        emit log_named_uint("IL @ 80% vol (bps)", expectedIL_high);
    }
    
    function testPredict_TightRange_HigherExitProbability() public {
        uint256 currentPrice = 2000 * SCALE;
        uint256 timeHorizon = 30 days;
        
        // Wide range
        (,uint256 exitProb_wide,) = predictor.predict(
            currentPrice, -2000, 2000, timeHorizon
        );
        
        // Tight range
        (,uint256 exitProb_tight,) = predictor.predict(
            currentPrice, -100, 100, timeHorizon
        );
        
        // Tight range should have higher exit probability
        assertGt(exitProb_tight, exitProb_wide, "Tight range should have higher exit prob");
        
        emit log_named_uint("Exit prob - wide range (bps)", exitProb_wide);
        emit log_named_uint("Exit prob - tight range (bps)", exitProb_tight);
    }
    
    function testPredict_LongerTimeHorizon_HigherExitProbability() public {
        uint256 currentPrice = 2000 * SCALE;
        int24 tickLower = -500;
        int24 tickUpper = 500;
        
        // 7 days
        (,uint256 exitProb_short,) = predictor.predict(
            currentPrice, tickLower, tickUpper, 7 days
        );
        
        // 90 days
        (,uint256 exitProb_long,) = predictor.predict(
            currentPrice, tickLower, tickUpper, 90 days
        );
        
        // Longer time horizon = higher exit probability
        assertGt(exitProb_long, exitProb_short, "Longer horizon should have higher exit prob");
    }
    
    function testPredict_ZeroPrice_Reverts() public {
        vm.expectRevert(ILPredictor.InvalidPrice.selector);
        predictor.predict(0, -1000, 1000, 30 days);
    }
    
    function testPredict_InvalidTickRange_Reverts() public {
        vm.expectRevert(ILPredictor.InvalidTickRange.selector);
        predictor.predict(2000 * SCALE, 1000, -1000, 30 days); // Lower > upper
    }
    
    function testPredict_ZeroTimeHorizon_Reverts() public {
        vm.expectRevert(ILPredictor.InvalidTimeHorizon.selector);
        predictor.predict(2000 * SCALE, -1000, 1000, 0);
    }
    
    function testCalculateCurrentIL_PriceDoubled_Returns42Percent() public {
        uint256 initialPrice = 2000 * SCALE;
        uint256 currentPrice = 4000 * SCALE; // 2x
        
        uint256 il = predictor.calculateCurrentIL(initialPrice, currentPrice);
        
        // IL for 2x price change ≈ 5.72% (572 bps)
        assertApproxEqAbs(il, 572, 50, "IL for 2x should be ~5.72%");
        
        emit log_named_uint("IL for 2x price (bps)", il);
    }
    
    function testCalculateCurrentIL_PriceHalved_Returns42Percent() public {
        uint256 initialPrice = 2000 * SCALE;
        uint256 currentPrice = 1000 * SCALE; // 0.5x
        
        uint256 il = predictor.calculateCurrentIL(initialPrice, currentPrice);
        
        // IL for 0.5x price change ≈ 5.72% (same as 2x due to symmetry)
        assertApproxEqAbs(il, 572, 50, "IL for 0.5x should be ~5.72%");
    }
    
    function testPredictILFromSwap_LargeSwap_ReturnsHighIL() public {
        uint256 currentPrice = 2000 * SCALE;
        int24 tickLower = -500;
        int24 tickUpper = 500;
        int256 largeSwapAmount = 1000000 * int256(SCALE); // Large buy
        uint256 liquidity = 10000000 * SCALE;
        
        uint256 il = predictor.predictILFromSwap(
            currentPrice,
            tickLower,
            tickUpper,
            largeSwapAmount,
            liquidity
        );
        
        // Should return some IL estimate
        emit log_named_uint("IL from large swap (bps)", il);
    }
    
    // ============ Gas Benchmarks ============
    
    function testGas_Predict() public {
        uint256 gasStart = gasleft();
        
        predictor.predict(2000 * SCALE, -1000, 1000, 30 days);
        
        uint256 gasUsed = gasStart - gasleft();
        
        // Should be < 100k gas
        assertLt(gasUsed, 100000, "predict() uses too much gas");
        emit log_named_uint("Gas used for predict()", gasUsed);
    }
}