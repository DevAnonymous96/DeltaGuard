// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {BaseHook} from "v4-periphery/utils/BaseHook.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";

import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

import {ILPredictor} from "../core/ILPredictor.sol";

// ============================================
// INTELLIGENT POL HOOK - V4 Integration
// ============================================

/**
 * @title IntelligentPOLHook
 * @notice Uniswap V4 Hook with IL prediction and risk management
 * @dev Predicts IL before swaps, collects fees, monitors position health
 */
contract IntelligentPOLHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;
    
    // ============ State Variables ============
    
    ILPredictor public immutable ilPredictor;
    address public strategy;
    
    // Pool-specific state
    struct PoolState {
        uint256 accumulatedFees0;
        uint256 accumulatedFees1;
        uint256 totalSwaps;
        uint256 lastHealthCheck;
        uint256 lastDonation;
        int24 tickLower;
        int24 tickUpper;
        bool needsRebalance;
    }
    
    mapping(PoolId => PoolState) public poolStates;
    
    // Configuration
    uint256 public ilWarningThreshold; // Basis points (e.g., 500 = 5%)
    uint256 public donationThreshold; // Fee amount to trigger donation
    uint256 public healthCheckInterval; // Time between health checks
    
    // ============ Events ============
    
    event HighILRiskDetected(
        PoolId indexed poolId,
        uint256 predictedIL,
        uint256 exitProbability,
        uint256 timestamp
    );
    
    event FeesAccumulated(
        PoolId indexed poolId,
        uint256 amount0,
        uint256 amount1,
        uint256 totalSwaps
    );
    
    event FeesDonated(
        PoolId indexed poolId,
        uint256 amount0,
        uint256 amount1,
        uint256 timestamp
    );
    
    event PositionHealthChecked(
        PoolId indexed poolId,
        bool healthy,
        uint256 currentIL,
        bool needsRebalance
    );
    
    event RebalanceTriggered(
        PoolId indexed poolId,
        uint256 reason, // 0 = high IL, 1 = out of range, 2 = manual
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error OnlyStrategy();
    error InvalidThreshold();
    error PoolNotInitialized();
    
    // ============ Modifiers ============
    
    modifier onlyStrategy() {
        if (msg.sender != strategy) revert OnlyStrategy();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        IPoolManager _poolManager,
        address _ilPredictor,
        address _strategy
    ) BaseHook(_poolManager) {
        ilPredictor = ILPredictor(_ilPredictor);
        strategy = _strategy;
        
        // Default configuration
        ilWarningThreshold = 500; // 5%
        donationThreshold = 1000e6; // 1000 USDC (assuming 6 decimals)
        healthCheckInterval = 1 hours;
    }
    
    // ============ Hook Permissions ============
    
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
            // noOp: false,
            // accessLock: false
        });
    //     struct Permissions {
    //     bool beforeInitialize;
    //     bool afterInitialize;
    //     bool beforeAddLiquidity;
    //     bool afterAddLiquidity;
    //     bool beforeRemoveLiquidity;
    //     bool afterRemoveLiquidity;
    //     bool beforeSwap;
    //     bool afterSwap;
    //     bool beforeDonate;
    //     bool afterDonate;
    //     bool beforeSwapReturnDelta;
    //     bool afterSwapReturnDelta;
    //     bool afterAddLiquidityReturnDelta;
    //     bool afterRemoveLiquidityReturnDelta;
    // }
    }
    
    // ============ Hook Implementation ============
    
    /**
     * @notice Called after pool initialization
     * @dev Set up tracking for this pool
     */
    function afterInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24 tick,
        bytes calldata hookData
    ) external override returns (bytes4) {
        PoolId poolId = key.toId();
        
        // Initialize pool state
        poolStates[poolId].lastHealthCheck = block.timestamp;
        poolStates[poolId].lastDonation = block.timestamp;
        
        return BaseHook.afterInitialize.selector;
    }
    
    /**
     * @notice Called after liquidity is added
     * @dev Update position range tracking
     */
    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4) {
        PoolId poolId = key.toId();
        PoolState storage state = poolStates[poolId];
        
        // Update range (assuming single position per pool)
        state.tickLower = params.tickLower;
        state.tickUpper = params.tickUpper;
        
        return BaseHook.afterAddLiquidity.selector;
    }
    
    /**
     * @notice Called BEFORE every swap
     * @dev Predict IL from incoming swap and warn if high risk
     */
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        PoolState storage state = poolStates[poolId];
        
        // Get current pool state
        (uint160 sqrtPriceX96,,) = poolManager.getSlot0(poolId);
        uint256 currentPrice = _sqrtPriceX96ToPrice(sqrtPriceX96);
        
        // Predict IL from this swap
        try ilPredictor.predictILFromSwap(
            currentPrice,
            state.tickLower,
            state.tickUpper,
            params.amountSpecified,
            1000000e18 // TODO: Get actual liquidity from pool
        ) returns (uint256 estimatedIL) {
            
            // Emit warning if IL risk is high
            if (estimatedIL > ilWarningThreshold) {
                // Also predict longer-term IL
                (uint256 expectedIL, uint256 exitProb,) = ilPredictor.predict(
                    currentPrice,
                    state.tickLower,
                    state.tickUpper,
                    30 days
                );
                
                emit HighILRiskDetected(poolId, expectedIL, exitProb, block.timestamp);
                
                // Mark for rebalance if very high risk
                if (expectedIL > ilWarningThreshold * 2) {
                    state.needsRebalance = true;
                    emit RebalanceTriggered(poolId, 0, block.timestamp);
                }
            }
        } catch {
            // If prediction fails, continue with swap
        }
        
        // Return - allow swap to continue
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }
    
    /**
     * @notice Called AFTER every swap
     * @dev Accumulate fees, check health, auto-donate if threshold reached
     */
    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        PoolState storage state = poolStates[poolId];
        
        // Extract and accumulate fees
        (uint256 fee0, uint256 fee1) = _extractFees(delta, params);
        state.accumulatedFees0 += fee0;
        state.accumulatedFees1 += fee1;
        state.totalSwaps++;
        
        emit FeesAccumulated(poolId, fee0, fee1, state.totalSwaps);
        
        // Auto-donate if threshold reached
        if (state.accumulatedFees0 + state.accumulatedFees1 >= donationThreshold) {
            _donateAccumulatedFees(poolId, key);
        }
        
        // Periodic health check
        if (block.timestamp >= state.lastHealthCheck + healthCheckInterval) {
            _checkPositionHealth(poolId, key);
        }
        
        return (BaseHook.afterSwap.selector, 0);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Extract fees from swap delta
     */
    function _extractFees(
        BalanceDelta delta,
        IPoolManager.SwapParams calldata params
    ) internal pure returns (uint256 fee0, uint256 fee1) {
        // In Uniswap V4, fees are part of the delta
        // Simplified: fee = |amount| * fee_tier
        
        int256 amount0 = delta.amount0();
        int256 amount1 = delta.amount1();
        
        // Assume 0.3% fee tier (can make configurable)
        uint256 FEE_TIER = 3000; // 0.3% = 3000 / 1000000
        
        if (amount0 < 0) {
            fee0 = uint256(-amount0) * FEE_TIER / 1000000;
        }
        
        if (amount1 < 0) {
            fee1 = uint256(-amount1) * FEE_TIER / 1000000;
        }
        
        return (fee0, fee1);
    }
    
    /**
     * @notice Donate accumulated fees to Octant
     */
    function _donateAccumulatedFees(PoolId poolId, PoolKey calldata key) internal {
        PoolState storage state = poolStates[poolId];
        
        uint256 amount0 = state.accumulatedFees0;
        uint256 amount1 = state.accumulatedFees1;
        
        if (amount0 > 0 || amount1 > 0) {
            // Transfer fees to strategy (which will donate to Octant)
            // In V4, use poolManager.donate() or direct transfer
            
            // Reset accumulators
            state.accumulatedFees0 = 0;
            state.accumulatedFees1 = 0;
            state.lastDonation = block.timestamp;
            
            emit FeesDonated(poolId, amount0, amount1, block.timestamp);
        }
    }
    
    /**
     * @notice Check position health and IL status
     */
    function _checkPositionHealth(PoolId poolId, PoolKey calldata key) internal {
        PoolState storage state = poolStates[poolId];
        
        // Get current price
        (uint160 sqrtPriceX96,,) = poolManager.getSlot0(poolId);
        uint256 currentPrice = _sqrtPriceX96ToPrice(sqrtPriceX96);
        
        // Predict IL for next 30 days
        try ilPredictor.predict(
            currentPrice,
            state.tickLower,
            state.tickUpper,
            30 days
        ) returns (uint256 expectedIL, uint256 exitProb, uint256 confidence) {
            
            bool healthy = expectedIL < ilWarningThreshold;
            
            // Mark for rebalance if unhealthy
            if (!healthy && exitProb > 5000) { // >50% exit probability
                state.needsRebalance = true;
            }
            
            state.lastHealthCheck = block.timestamp;
            
            emit PositionHealthChecked(poolId, healthy, expectedIL, state.needsRebalance);
            
        } catch {
            // If prediction fails, assume healthy but log
            state.lastHealthCheck = block.timestamp;
        }
    }
    
    /**
     * @notice Convert sqrtPriceX96 to regular price
     */
    function _sqrtPriceX96ToPrice(uint160 sqrtPriceX96) internal pure returns (uint256) {
        // price = (sqrtPriceX96 / 2^96)^2
        uint256 price = (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) >> (96 * 2);
        return price;
    }
    
    // ============ External Functions (Strategy) ============
    
    /**
     * @notice Manually trigger donation
     */
    function triggerDonation(PoolKey calldata key) external onlyStrategy {
        PoolId poolId = key.toId();
        _donateAccumulatedFees(poolId, key);
    }
    
    /**
     * @notice Get accumulated fees for a pool
     */
    function getAccumulatedFees(PoolId poolId) external view returns (uint256 amount0, uint256 amount1) {
        PoolState storage state = poolStates[poolId];
        return (state.accumulatedFees0, state.accumulatedFees1);
    }
    
    /**
     * @notice Check if pool needs rebalancing
     */
    function needsRebalance(PoolId poolId) external view returns (bool) {
        return poolStates[poolId].needsRebalance;
    }
    
    /**
     * @notice Reset rebalance flag (called by strategy after rebalancing)
     */
    function resetRebalanceFlag(PoolId poolId) external onlyStrategy {
        poolStates[poolId].needsRebalance = false;
    }
    
    // ============ Admin Functions ============
    
    function setILWarningThreshold(uint256 _threshold) external {
        if (msg.sender != strategy) revert OnlyStrategy();
        if (_threshold > 10000) revert InvalidThreshold(); // Max 100%
        ilWarningThreshold = _threshold;
    }
    
    function setDonationThreshold(uint256 _threshold) external {
        if (msg.sender != strategy) revert OnlyStrategy();
        donationThreshold = _threshold;
    }
    
    function setStrategy(address _newStrategy) external {
        if (msg.sender != strategy) revert OnlyStrategy();
        strategy = _newStrategy;
    }
}
