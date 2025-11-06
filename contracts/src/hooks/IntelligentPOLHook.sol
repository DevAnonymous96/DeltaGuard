// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {BaseHook} from "@openzeppelin/uniswap-hooks/src/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager, SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";

import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

import {ILPredictor} from "../core/ILPredictor.sol";
import {PriceRangeLib} from "../libraries/PriceRangeLib.sol";

/**
 * @title IntelligentPOLHook
 * @notice Uniswap V4 Hook with IL prediction and risk management
 */
contract IntelligentPOLHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;
    using StateLibrary for IPoolManager;
    using SafeCast for int256;
    using SafeCast for uint256;
    using CurrencyLibrary for Currency;

    // ============ State Variables ============

    ILPredictor public immutable ilPredictor;
    address public strategy;

    struct PoolState {
        uint128 accumulatedFees0;
        uint128 accumulatedFees1;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint32 totalSwaps;
        uint32 lastHealthCheck;
        uint32 lastDonation;
        bool needsRebalance;
        bool initialized;
    }

    mapping(PoolId => PoolState) public poolStates;

    uint256 public ilWarningThreshold;
    uint256 public ilCriticalThreshold;
    uint256 public donationThreshold;
    uint256 public healthCheckInterval;
    uint256 public minLiquidityForPrediction;

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ============ Events ============

    event PoolInitialized(
        PoolId indexed poolId,
        int24 tickLower,
        int24 tickUpper,
        uint128 initialLiquidity
    );

    event HighILRiskDetected(
        PoolId indexed poolId,
        uint256 predictedIL,
        uint256 exitProbability,
        uint256 confidence,
        uint256 timestamp
    );

    event FeesAccumulated(
        PoolId indexed poolId,
        uint128 amount0,
        uint128 amount1,
        uint32 totalSwaps
    );

    event FeesDonated(
        PoolId indexed poolId,
        uint128 amount0,
        uint128 amount1,
        address indexed recipient,
        uint256 timestamp
    );

    event PositionHealthChecked(
        PoolId indexed poolId,
        bool healthy,
        uint256 currentIL,
        bool needsRebalance,
        uint256 timestamp
    );

    event RebalanceTriggered(
        PoolId indexed poolId,
        uint8 reason,
        uint256 predictedIL,
        uint256 timestamp
    );

    event ConfigurationUpdated(string parameter, uint256 newValue);

    // ============ Errors ============

    error OnlyStrategy();
    error PoolNotInitialized();
    error InvalidThreshold();
    error InsufficientLiquidity();
    error ReentrancyGuard();
    error InvalidConfiguration();

    // ============ Modifiers ============

    modifier onlyStrategy() {
        if (msg.sender != strategy) revert OnlyStrategy();
        _;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyGuard();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ============ Constructor ============

    constructor(
        IPoolManager _poolManager,
        address _ilPredictor,
        address _strategy
    ) BaseHook(_poolManager) {
        if (_ilPredictor == address(0) || _strategy == address(0)) {
            revert InvalidConfiguration();
        }

        ilPredictor = ILPredictor(_ilPredictor);
        strategy = _strategy;

        ilWarningThreshold = 500;
        ilCriticalThreshold = 1000;
        donationThreshold = 1000e6;
        healthCheckInterval = 1 hours;
        minLiquidityForPrediction = 1000e18;

        _status = _NOT_ENTERED;
    }

    // ============ Hook Permissions ============

    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
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
            });
    }

    // ============ Hook Implementation (Internal) ============

    function _afterInitialize(
        address,
        PoolKey calldata key,
        uint160,
        int24 tick
    ) internal override returns (bytes4) {
        PoolId poolId = key.toId();

        poolStates[poolId] = PoolState({
            accumulatedFees0: 0,
            accumulatedFees1: 0,
            tickLower: tick - 1000,
            tickUpper: tick + 1000,
            liquidity: 0,
            totalSwaps: 0,
            lastHealthCheck: uint32(block.timestamp),
            lastDonation: uint32(block.timestamp),
            needsRebalance: false,
            initialized: true
        });

        emit PoolInitialized(poolId, tick - 1000, tick + 1000, 0);

        return BaseHook.afterInitialize.selector;
    }

    function _afterAddLiquidity(
        address,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, BalanceDelta) {
        PoolId poolId = key.toId();
        PoolState storage state = poolStates[poolId];

        if (!state.initialized) revert PoolNotInitialized();

        state.tickLower = params.tickLower;
        state.tickUpper = params.tickUpper;

        // Use StateLibrary to get liquidity
        uint128 currentLiquidity = poolManager.getLiquidity(poolId);
        state.liquidity = currentLiquidity;

        return (BaseHook.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }

    function _beforeSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        PoolState storage state = poolStates[poolId];

        if (!state.initialized) {
            return (
                BaseHook.beforeSwap.selector,
                BeforeSwapDeltaLibrary.ZERO_DELTA,
                0
            );
        }

        if (state.liquidity < minLiquidityForPrediction) {
            return (
                BaseHook.beforeSwap.selector,
                BeforeSwapDeltaLibrary.ZERO_DELTA,
                0
            );
        }

        // Get current pool state using StateLibrary
        (uint160 sqrtPriceX96, int24 tick, , ) = poolManager.getSlot0(poolId);
        uint256 currentPrice = PriceRangeLib.sqrtPriceX96ToPrice(sqrtPriceX96);

        // Predict IL from this specific swap
        try
            ilPredictor.predictILFromSwap(
                currentPrice,
                state.tickLower,
                state.tickUpper,
                params.amountSpecified,
                state.liquidity
            )
        returns (uint256 estimatedIL) {
            if (estimatedIL > ilWarningThreshold) {
                try
                    ilPredictor.predict(
                        currentPrice,
                        state.tickLower,
                        state.tickUpper,
                        30 days
                    )
                returns (
                    uint256 expectedIL,
                    uint256 exitProb,
                    uint256 confidence
                ) {
                    emit HighILRiskDetected(
                        poolId,
                        expectedIL,
                        exitProb,
                        confidence,
                        block.timestamp
                    );

                    if (expectedIL > ilCriticalThreshold && exitProb > 5000) {
                        state.needsRebalance = true;
                        emit RebalanceTriggered(
                            poolId,
                            0,
                            expectedIL,
                            block.timestamp
                        );
                    }
                } catch {}
            }
        } catch {}

        return (
            BaseHook.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            0
        );
    }

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta delta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        PoolState storage state = poolStates[poolId];

        if (!state.initialized) {
            return (BaseHook.afterSwap.selector, 0);
        }

        (uint128 fee0, uint128 fee1) = _extractFees(delta, key.fee);

        unchecked {
            state.accumulatedFees0 += fee0;
            state.accumulatedFees1 += fee1;
            state.totalSwaps++;
        }

        emit FeesAccumulated(poolId, fee0, fee1, state.totalSwaps);

        uint256 totalFees = uint256(state.accumulatedFees0) +
            uint256(state.accumulatedFees1);
        if (totalFees >= donationThreshold) {
            _triggerDonation(poolId, key);
        }

        if (block.timestamp >= state.lastHealthCheck + healthCheckInterval) {
            _checkPositionHealth(poolId, key);
        }

        return (BaseHook.afterSwap.selector, 0);
    }

    // ============ Internal Helper Functions ============

    function _extractFees(
        BalanceDelta delta,
        uint24 feeTier
    ) internal pure returns (uint128 fee0, uint128 fee1) {
        int256 amount0 = delta.amount0();
        int256 amount1 = delta.amount1();

        if (amount0 < 0) {
            uint256 absAmount = uint256(-amount0);
            fee0 = uint128((absAmount * feeTier) / 1_000_000);
        }

        if (amount1 < 0) {
            uint256 absAmount = uint256(-amount1);
            fee1 = uint128((absAmount * feeTier) / 1_000_000);
        }

        return (fee0, fee1);
    }

    function _triggerDonation(
        PoolId poolId,
        PoolKey calldata key
    ) internal nonReentrant {
        PoolState storage state = poolStates[poolId];

        uint128 amount0 = state.accumulatedFees0;
        uint128 amount1 = state.accumulatedFees1;

        if (amount0 == 0 && amount1 == 0) return;

        emit FeesDonated(poolId, amount0, amount1, strategy, block.timestamp);

        state.accumulatedFees0 = 0;
        state.accumulatedFees1 = 0;
        state.lastDonation = uint32(block.timestamp);
    }

    function _checkPositionHealth(
        PoolId poolId,
        PoolKey calldata key
    ) internal {
        PoolState storage state = poolStates[poolId];

        (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(poolId);
        uint256 currentPrice = PriceRangeLib.sqrtPriceX96ToPrice(sqrtPriceX96);

        bool inRange = PriceRangeLib.isPriceInRange(
            currentPrice,
            state.tickLower,
            state.tickUpper
        );

        if (!inRange) {
            state.needsRebalance = true;
            emit RebalanceTriggered(poolId, 1, 0, block.timestamp);
        }

        try
            ilPredictor.predict(
                currentPrice,
                state.tickLower,
                state.tickUpper,
                30 days
            )
        returns (uint256 expectedIL, uint256 exitProb, uint256 confidence) {
            bool healthy = expectedIL < ilWarningThreshold;

            if (!healthy && exitProb > 5000) {
                state.needsRebalance = true;
            }

            emit PositionHealthChecked(
                poolId,
                healthy,
                expectedIL,
                state.needsRebalance,
                block.timestamp
            );
        } catch {}

        state.lastHealthCheck = uint32(block.timestamp);
    }

    // ============ External Functions (Strategy Interface) ============

    function triggerDonation(PoolKey calldata key) external onlyStrategy {
        PoolId poolId = key.toId();
        _triggerDonation(poolId, key);
    }

    function getAccumulatedFees(
        PoolId poolId
    ) external view returns (uint128 amount0, uint128 amount1) {
        PoolState storage state = poolStates[poolId];
        return (state.accumulatedFees0, state.accumulatedFees1);
    }

    function needsRebalance(PoolId poolId) external view returns (bool) {
        return poolStates[poolId].needsRebalance;
    }

    function resetRebalanceFlag(PoolId poolId) external onlyStrategy {
        poolStates[poolId].needsRebalance = false;
    }

    function getPoolState(
        PoolId poolId
    ) external view returns (PoolState memory) {
        return poolStates[poolId];
    }

    function forceHealthCheck(PoolKey calldata key) external onlyStrategy {
        PoolId poolId = key.toId();
        _checkPositionHealth(poolId, key);
    }

    // ============ Admin Functions ============

    function setILWarningThreshold(uint256 _threshold) external onlyStrategy {
        if (_threshold > 10000) revert InvalidThreshold();
        ilWarningThreshold = _threshold;
        emit ConfigurationUpdated("ilWarningThreshold", _threshold);
    }

    function setILCriticalThreshold(uint256 _threshold) external onlyStrategy {
        if (_threshold > 10000) revert InvalidThreshold();
        ilCriticalThreshold = _threshold;
        emit ConfigurationUpdated("ilCriticalThreshold", _threshold);
    }

    function setDonationThreshold(uint256 _threshold) external onlyStrategy {
        donationThreshold = _threshold;
        emit ConfigurationUpdated("donationThreshold", _threshold);
    }

    function setHealthCheckInterval(uint256 _interval) external onlyStrategy {
        healthCheckInterval = _interval;
        emit ConfigurationUpdated("healthCheckInterval", _interval);
    }

    function setMinLiquidityForPrediction(
        uint256 _minLiquidity
    ) external onlyStrategy {
        minLiquidityForPrediction = _minLiquidity;
        emit ConfigurationUpdated("minLiquidityForPrediction", _minLiquidity);
    }

    function setStrategy(address _newStrategy) external onlyStrategy {
        if (_newStrategy == address(0)) revert InvalidConfiguration();
        strategy = _newStrategy;
    }
}
