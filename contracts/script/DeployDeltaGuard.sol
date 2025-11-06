// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";

import "../src/core/VolatilityOracle.sol";
import "../src/core/ILPredictor.sol";
import "../src/hooks/IntelligentPOLHook.sol";
import "../src/strategy/OctantPOLStrategy.sol";
import "../src/helper/ConfigHelper.sol";
import "../src/helper/SimulationHelper.sol";

/**
 * @title Deploy Script for DeltaGuard
 * @notice Deploys all contracts in correct order with proper configuration
 * @dev Run with: forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
 */
contract DeployScript is Script {
    // ============ Configuration ============
    
    // Addresses (update for your network)
    address constant CHAINLINK_ETH_USD = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419; // Mainnet
    address constant POOL_MANAGER = address(0); // TODO: Add V4 PoolManager
    address constant TOKEN0 = address(0); // TODO: Add token0 (e.g., WETH)
    address constant TOKEN1 = address(0); // TODO: Add token1 (e.g., USDC)
    
    // Pool parameters
    uint24 constant FEE = 3000; // 0.3% fee
    int24 constant TICK_SPACING = 60;
    
    // Oracle parameters
    uint256 constant MAX_STALENESS = 1 hours;
    uint256 constant MAX_HISTORICAL_PRICES = 90; // 90 days
    
    // ============ Deployment ============
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying DeltaGuard contracts...");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        console2.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy VolatilityOracle
        console2.log("1. Deploying VolatilityOracle...");
        VolatilityOracle volatilityOracle = new VolatilityOracle(
            CHAINLINK_ETH_USD,
            MAX_STALENESS,
            MAX_HISTORICAL_PRICES
        );
        console2.log("   VolatilityOracle:", address(volatilityOracle));
        
        // 2. Deploy ILPredictor
        console2.log("2. Deploying ILPredictor...");
        ILPredictor ilPredictor = new ILPredictor(address(volatilityOracle));
        console2.log("   ILPredictor:", address(ilPredictor));
        
        // 3. Deploy IntelligentPOLHook
        console2.log("3. Deploying IntelligentPOLHook...");
        
        // Calculate hook address with correct flags
        uint160 flags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG |
            Hooks.AFTER_ADD_LIQUIDITY_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG
        );
        
        // Deploy with CREATE2 to get correct address
        // Note: This is simplified - production needs proper CREATE2 deployment
        IntelligentPOLHook hook = new IntelligentPOLHook(
            IPoolManager(POOL_MANAGER),
            address(ilPredictor),
            deployer // Temporary, will be updated
        );
        console2.log("   IntelligentPOLHook:", address(hook));
        
        // 4. Create PoolKey
        console2.log("4. Creating PoolKey...");
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(TOKEN0),
            currency1: Currency.wrap(TOKEN1),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: hook
        });
        
        // 5. Deploy OctantPOLStrategy
        console2.log("5. Deploying OctantPOLStrategy...");
        OctantPOLStrategy strategy = new OctantPOLStrategy(
            address(hook),
            POOL_MANAGER,
            address(ilPredictor),
            poolKey
        );
        console2.log("   OctantPOLStrategy:", address(strategy));
        
        // 6. Update hook to point to strategy
        console2.log("6. Configuring hook with strategy...");
        hook.setStrategy(address(strategy));
        
        // 7. Deploy helper contracts
        console2.log("7. Deploying helper contracts...");
        ConfigHelper configHelper = new ConfigHelper();
        SimulationHelper simulationHelper = new SimulationHelper();
        console2.log("   ConfigHelper:", address(configHelper));
        console2.log("   SimulationHelper:", address(simulationHelper));
        
        // 8. Configure contracts
        console2.log("8. Configuring contracts...");
        
        // Set manual volatility as fallback (50% annual)
        volatilityOracle.setManualVolatility(0.5e18);
        
        // Configure hook thresholds
        hook.setILWarningThreshold(500);  // 5%
        hook.setILCriticalThreshold(1000); // 10%
        
        // Configure strategy
        strategy.setRebalanceCooldown(1 hours);
        strategy.setMaxSlippage(100); // 1%
        strategy.setILRebalanceThreshold(500); // 5%
        
        vm.stopBroadcast();
        
        // 9. Print deployment summary
        console2.log("");
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("");
        console2.log("Contract Addresses:");
        console2.log("-------------------");
        console2.log("VolatilityOracle:    ", address(volatilityOracle));
        console2.log("ILPredictor:         ", address(ilPredictor));
        console2.log("IntelligentPOLHook:  ", address(hook));
        console2.log("OctantPOLStrategy:   ", address(strategy));
        console2.log("ConfigHelper:        ", address(configHelper));
        console2.log("SimulationHelper:    ", address(simulationHelper));
        console2.log("");
        console2.log("Configuration:");
        console2.log("-------------");
        console2.log("IL Warning Threshold: 5%");
        console2.log("IL Critical Threshold: 10%");
        console2.log("Rebalance Cooldown: 1 hour");
        console2.log("Max Slippage: 1%");
        console2.log("");
        console2.log("Next Steps:");
        console2.log("----------");
        console2.log("1. Initialize pool in Uniswap V4");
        console2.log("2. Set Octant payment splitter address");
        console2.log("3. Update volatility oracle with historical prices");
        console2.log("4. Test with small deposits first");
        console2.log("");
        
        // Save addresses to file
        _saveDeploymentAddresses(
            address(volatilityOracle),
            address(ilPredictor),
            address(hook),
            address(strategy),
            address(configHelper),
            address(simulationHelper)
        );
    }
    
    function _saveDeploymentAddresses(
        address volatilityOracle,
        address ilPredictor,
        address hook,
        address strategy,
        address configHelper,
        address simulationHelper
    ) internal {
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "network": "', vm.toString(block.chainid), '",\n',
            '  "timestamp": "', vm.toString(block.timestamp), '",\n',
            '  "contracts": {\n',
            '    "VolatilityOracle": "', vm.toString(volatilityOracle), '",\n',
            '    "ILPredictor": "', vm.toString(ilPredictor), '",\n',
            '    "IntelligentPOLHook": "', vm.toString(hook), '",\n',
            '    "OctantPOLStrategy": "', vm.toString(strategy), '",\n',
            '    "ConfigHelper": "', vm.toString(configHelper), '",\n',
            '    "SimulationHelper": "', vm.toString(simulationHelper), '"\n',
            '  }\n',
            '}'
        ));
        
        vm.writeFile("deployment.json", json);
        console2.log("Deployment addresses saved to: deployment.json");
    }
}

/**
 * @title Testnet Deploy Script
 * @notice Simplified deployment for testnet with mock data
 */
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console2.log("Deploying to testnet...");
        console2.log("Note: Using mock addresses - update before mainnet!");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy with mock addresses for testing
        // TODO: Replace with actual testnet addresses
        
        vm.stopBroadcast();
        
        console2.log("Testnet deployment complete");
    }
}