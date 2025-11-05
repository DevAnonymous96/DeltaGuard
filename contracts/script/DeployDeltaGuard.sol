// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {ILPredictor} from "../src/core/ILPredictor.sol";
import {VolatilityOracle} from "../src/core/VolatilityOracle.sol";
import {IntelligentPOLHook} from "../src/hooks/IntelligentPOLHook.sol";
import {OctantPOLStrategy} from "../src/strategy/OctantPOLStrategy.sol";

// ============================================
// DEPLOYMENT SCRIPT
// ============================================

/**
 * @title DeployDeltaGuard
 * @notice Deployment script for DeltaGuard system
 * @dev Run with: forge script script/Deploy.s.sol:DeployDeltaGuard --rpc-url <RPC> --broadcast
 */
contract DeployDeltaGuard is Script {
    // ============ Configuration ============
    
    // Chainlink Price Feeds (Sepolia Testnet)
    address constant CHAINLINK_ETH_USD_SEPOLIA = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    
    // Uniswap V4 (update when available on testnet)
    address constant POOL_MANAGER_SEPOLIA = address(0); // TODO: Update
    
    // Tokens (Sepolia)
    address constant WETH_SEPOLIA = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;
    address constant USDC_SEPOLIA = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8;
    
    // Configuration values
    uint256 constant MAX_STALENESS = 1 hours;
    uint256 constant MAX_HISTORICAL_PRICES = 30;
    
    // ============ Main Deployment Function ============
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Deploying DeltaGuard System");
        console.log("==========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy VolatilityOracle
        console.log("1. Deploying VolatilityOracle...");
        VolatilityOracle volatilityOracle = new VolatilityOracle(
            CHAINLINK_ETH_USD_SEPOLIA,
            MAX_STALENESS,
            MAX_HISTORICAL_PRICES
        );
        console.log("   VolatilityOracle:", address(volatilityOracle));
        
        // Set initial manual volatility (50% as default)
        volatilityOracle.setManualVolatility(0.5e18);
        volatilityOracle.setUseManualVolatility(true); // Use manual until we have history
        console.log("   Initial volatility set: 50%");
        
        // Step 2: Deploy ILPredictor
        console.log("");
        console.log("2. Deploying ILPredictor...");
        ILPredictor ilPredictor = new ILPredictor(
            address(volatilityOracle)
        );
        console.log("   ILPredictor:", address(ilPredictor));
        
        // Test prediction
        console.log("   Testing prediction...");
        try ilPredictor.predict(
            2000e18, // $2000 ETH
            -1000,   // Lower tick
            1000,    // Upper tick
            30 days  // Time horizon
        ) returns (uint256 expectedIL, uint256 exitProb, uint256 confidence) {
            console.log("   Expected IL:", expectedIL, "bps");
            console.log("   Exit Probability:", exitProb, "bps");
            console.log("   Confidence:", confidence, "bps");
        } catch {
            console.log("   Test prediction failed (expected if oracle not working)");
        }
        
        // Step 3: Deploy IntelligentPOLHook (requires Uniswap V4)
        console.log("");
        if (POOL_MANAGER_SEPOLIA != address(0)) {
            console.log("3. Deploying IntelligentPOLHook...");
            
            // Create placeholder for strategy address (will be updated)
            address strategyPlaceholder = address(0x1);
            
            IntelligentPOLHook hook = new IntelligentPOLHook(
                IPoolManager(POOL_MANAGER_SEPOLIA),
                address(ilPredictor),
                strategyPlaceholder
            );
            console.log("   IntelligentPOLHook:", address(hook));
            console.log("   Note: Strategy address needs to be updated!");
            
            // Step 4: Deploy OctantPOLStrategy
            console.log("");
            console.log("4. Deploying OctantPOLStrategy...");
            
            // Create dummy PoolKey (update with real values)
            PoolKey memory poolKey = PoolKey({
                currency0: Currency.wrap(WETH_SEPOLIA),
                currency1: Currency.wrap(USDC_SEPOLIA),
                fee: 3000, // 0.3%
                tickSpacing: 60,
                hooks: IHooks(address(hook))
            });
            
            OctantPOLStrategy strategy = new OctantPOLStrategy(
                address(hook),
                POOL_MANAGER_SEPOLIA,
                address(ilPredictor),
                WETH_SEPOLIA,
                USDC_SEPOLIA,
                poolKey
            );
            console.log("   OctantPOLStrategy:", address(strategy));
            
            // Update hook with correct strategy address
            // Note: This requires hook to have setStrategy function
            console.log("   Updating hook with strategy address...");
            // hook.setStrategy(address(strategy)); // Uncomment when implemented
            
        } else {
            console.log("3. Skipping Hook & Strategy deployment");
            console.log("   Reason: Uniswap V4 Pool Manager not available on this network");
            console.log("   You can deploy these later when V4 is available");
        }
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("");
        console.log("==========================================");
        console.log("Deployment Complete!");
        console.log("==========================================");
        console.log("");
        console.log("Deployed Contracts:");
        console.log("-------------------");
        console.log("VolatilityOracle:", address(volatilityOracle));
        console.log("ILPredictor:", address(ilPredictor));
        
        if (POOL_MANAGER_SEPOLIA != address(0)) {
            // Print hook and strategy addresses
            console.log("IntelligentPOLHook: (see above)");
            console.log("OctantPOLStrategy: (see above)");
        }
        
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contracts on Etherscan");
        console.log("2. Update price history: volatilityOracle.updatePriceHistory()");
        console.log("3. Set Octant Payment Splitter: strategy.setOctantPaymentSplitter()");
        console.log("4. Test prediction with: ilPredictor.predict()");
        
        // Save addresses to file
        _saveDeploymentAddresses(
            address(volatilityOracle),
            address(ilPredictor)
        );
    }
    
    // ============ Helper Functions ============
    
    function _saveDeploymentAddresses(
        address volatilityOracle,
        address ilPredictor
    ) internal {
        string memory deploymentInfo = string(abi.encodePacked(
            "# DeltaGuard Deployment Addresses\n\n",
            "Network: Sepolia\n",
            "Timestamp: ", vm.toString(block.timestamp), "\n\n",
            "## Core Contracts\n",
            "VOLATILITY_ORACLE=", vm.toString(volatilityOracle), "\n",
            "IL_PREDICTOR=", vm.toString(ilPredictor), "\n"
        ));
        
        vm.writeFile("deployments/sepolia.txt", deploymentInfo);
        console.log("");
        console.log("Addresses saved to: deployments/sepolia.txt");
    }
}


// ============================================
// INTERFACES (for reference)
// ============================================

// Minimal Uniswap V4 interfaces needed
interface IPoolManager {
    function getSlot0(PoolId id) external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint24 protocolFee
    );
}

interface IHooks {}

struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    IHooks hooks;
}

type Currency is address;
type PoolId is bytes32;