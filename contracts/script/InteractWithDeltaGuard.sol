// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {ILPredictor} from "../src/core/ILPredictor.sol";
import {VolatilityOracle} from "../src/core/VolatilityOracle.sol";
import {IntelligentPOLHook} from "../src/hooks/IntelligentPOLHook.sol";
import {OctantPOLStrategy} from "../src/strategy/OctantPOLStrategy.sol";

// ============================================
// INTERACTION SCRIPTS
// ============================================

/**
 * @title InteractWithDeltaGuard
 * @notice Helper script for interacting with deployed contracts
 */
contract InteractWithDeltaGuard is Script {
    
    function updateVolatility() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envAddress("VOLATILITY_ORACLE");
        
        vm.startBroadcast(privateKey);
        
        VolatilityOracle oracle = VolatilityOracle(oracleAddress);
        oracle.updatePriceHistory();
        
        console.log("Price history updated");
        
        vm.stopBroadcast();
    }
    
    function testPrediction() external view {
        address predictorAddress = vm.envAddress("IL_PREDICTOR");
        
        ILPredictor predictor = ILPredictor(predictorAddress);
        
        // Test with common parameters
        uint256 currentPrice = 2000e18; // $2000
        int24 tickLower = -1000;
        int24 tickUpper = 1000;
        uint256 timeHorizon = 30 days;
        
        console.log("Testing IL Prediction...");
        console.log("Current Price:", currentPrice / 1e18, "USD");
        console.log("Range: [", tickLower, ",", tickUpper, "]");
        console.log("Time Horizon:", timeHorizon / 1 days, "days");
        console.log("");
        
        (uint256 expectedIL, uint256 exitProb, uint256 confidence) = predictor.predict(
            currentPrice,
            tickLower,
            tickUpper,
            timeHorizon
        );
        
        console.log("Results:");
        console.log("- Expected IL:", expectedIL / 100, ".", expectedIL % 100, "%");
        console.log("- Exit Probability:", exitProb / 100, ".", exitProb % 100, "%");
        console.log("- Confidence:", confidence / 100, ".", confidence % 100, "%");
    }
}
