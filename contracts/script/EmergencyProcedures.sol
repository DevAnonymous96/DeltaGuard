// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {ILPredictor} from "../src/core/ILPredictor.sol";
import {VolatilityOracle} from "../src/core/VolatilityOracle.sol";
import {IntelligentPOLHook} from "../src/hooks/IntelligentPOLHook.sol";
import {OctantPOLStrategy} from "../src/strategy/OctantPOLStrategy.sol";

// ============================================
// EMERGENCY PROCEDURES
// ============================================

/**
 * @title EmergencyProcedures
 * @notice Emergency functions for system administrators
 */
contract EmergencyProcedures is Script {
    
    /**
     * @notice Emergency pause of strategy
     */
    function emergencyPauseStrategy() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address strategyAddress = vm.envAddress("STRATEGY");
        
        vm.startBroadcast(privateKey);
        
        OctantPOLStrategy strategy = OctantPOLStrategy(strategyAddress);
        strategy.emergencyWithdraw();
        
        console.log("Emergency withdrawal executed");
        console.log("All funds withdrawn to owner");
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Set high manual volatility to make system conservative
     */
    function enableConservativeMode() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envAddress("VOLATILITY_ORACLE");
        
        vm.startBroadcast(privateKey);
        
        VolatilityOracle oracle = VolatilityOracle(oracleAddress);
        
        // Set very high volatility to make IL predictions conservative
        oracle.setManualVolatility(2e18); // 200% volatility
        oracle.setUseManualVolatility(true);
        
        console.log("Conservative mode enabled");
        console.log("System will avoid LP deployment due to high predicted IL");
        
        vm.stopBroadcast();
    }
}