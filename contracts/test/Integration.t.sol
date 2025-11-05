// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {ILPredictor} from "../src/core/ILPredictor.sol";
import {VolatilityOracle} from "../src/core/VolatilityOracle.sol";
import {MockERC20, MockChainlinkFeed} from "./Mocks.t.sol";

// ============================================
// TEST SUITE: INTEGRATION TESTS
// ============================================

contract IntegrationTest is Test {
    ILPredictor public predictor;
    VolatilityOracle public oracle;
    MockChainlinkFeed public priceFeed;
    
    MockERC20 public token0;
    MockERC20 public token1;
    
    address public user1;
    address public user2;
    
    uint256 constant SCALE = 1e18;
    
    function setUp() public {
        // Setup users
        user1 = address(0x1);
        user2 = address(0x2);
        
        // Deploy tokens
        token0 = new MockERC20("OP Token", "OP", 18);
        token1 = new MockERC20("USDC", "USDC", 6);
        
        // Mint tokens to users
        token0.mint(user1, 10000 * SCALE);
        token1.mint(user1, 10000 * 1e6);
        
        token0.mint(user2, 10000 * SCALE);
        token1.mint(user2, 10000 * 1e6);
        
        // Setup oracle
        priceFeed = new MockChainlinkFeed(2000e8);
        oracle = new VolatilityOracle(address(priceFeed), 1 hours, 30);
        oracle.setManualVolatility(0.5e18);
        oracle.setUseManualVolatility(true);
        
        // Deploy predictor
        predictor = new ILPredictor(address(oracle));
    }
    
    function testIntegration_FullScenario_NormalConditions() public {
        // 1. User checks IL prediction before deploying
        uint256 currentPrice = 2000 * SCALE;
        int24 tickLower = -1000;
        int24 tickUpper = 1000;
        
        (uint256 expectedIL, uint256 exitProb, uint256 confidence) = predictor.predict(
            currentPrice,
            tickLower,
            tickUpper,
            30 days
        );
        
        emit log_string("=== IL Prediction Results ===");
        emit log_named_uint("Expected IL (bps)", expectedIL);
        emit log_named_uint("Exit Probability (bps)", exitProb);
        emit log_named_uint("Confidence (bps)", confidence);
        
        // 2. Decision: Deploy if IL < 5%
        bool shouldDeploy = expectedIL < 500;
        
        emit log_named_string("Decision", shouldDeploy ? "DEPLOY TO LP" : "STAY IN LENDING");
        
        // 3. Simulate price movement
        vm.warp(block.timestamp + 7 days);
        uint256 newPrice = 2100 * SCALE; // +5% price change
        
        // 4. Calculate actual IL
        uint256 actualIL = predictor.calculateCurrentIL(currentPrice, newPrice);
        
        emit log_named_uint("Actual IL after 7 days (bps)", actualIL);
        
        // 5. Compare prediction vs reality
        emit log_string("=== Prediction Accuracy ===");
        if (actualIL < expectedIL) {
            emit log_string("Status: IL was LOWER than predicted (good!)");
        } else {
            emit log_string("Status: IL was HIGHER than predicted");
        }
    }
    
    function testIntegration_HighVolatilityScenario() public {
        // Scenario: Market becomes highly volatile
        oracle.setManualVolatility(1.2e18); // 120% annualized
        
        uint256 currentPrice = 2000 * SCALE;
        int24 tickLower = -500;
        int24 tickUpper = 500;
        
        (uint256 expectedIL, uint256 exitProb,) = predictor.predict(
            currentPrice,
            tickLower,
            tickUpper,
            30 days
        );
        
        emit log_string("=== High Volatility Scenario ===");
        emit log_named_uint("Expected IL (bps)", expectedIL);
        emit log_named_uint("Exit Probability (bps)", exitProb);
        
        // Should recommend NOT deploying to LP
        bool shouldDeploy = expectedIL < 500 && exitProb < 5000;
        emit log_named_string("Recommendation", shouldDeploy ? "DEPLOY" : "AVOID LP");
        
        assertFalse(shouldDeploy, "Should NOT deploy in high volatility");
    }
}