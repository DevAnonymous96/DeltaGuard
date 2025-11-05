// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";

import {ReentrancyGuard} from "openzeppelin-contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";

import {ILPredictor} from "../core/ILPredictor.sol";
import {IntelligentPOLHook} from "../hooks/IntelligentPOLHook.sol";

// ============================================
//  OCTANT POL STRATEGY - Main Strategy
// ============================================

/**
 * @title OctantPOLStrategy
 * @notice Main strategy contract implementing Octant IStrategy interface
 * @dev Manages deposits, withdrawals, rebalancing, and donations
 */
abstract contract OctantPOLStrategy is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;
    
    // ============ State Variables ============
    
    IntelligentPOLHook public immutable hook;
    IPoolManager public immutable poolManager;
    ILPredictor public immutable ilPredictor;
    
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    
    address public octantPaymentSplitter;
    
    // Pool configuration
    PoolKey public poolKey;
    PoolId public poolId;
    
    // Position tracking
    struct Position {
        uint256 liquidity;
        int24 tickLower;
        int24 tickUpper;
        uint256 depositedAmount0;
        uint256 depositedAmount1;
        uint256 timestamp;
    }
    
    Position public currentPosition;
    
    // User share tracking
    mapping(address => uint256) public userShares;
    uint256 public totalShares;
    
    // Strategy state
    bool public isInLPMode; // true = LP, false = idle/lending
    uint256 public lastRebalance;
    uint256 public rebalanceCooldown; // Min time between rebalances
    
    // Performance tracking
    uint256 public totalFeesCollected;
    uint256 public totalDonated;
    uint256 public totalILIncurred;
    
    // ============ Events ============
    
    event Deposited(address indexed user, uint256 amount0, uint256 amount1, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount0, uint256 amount1, uint256 shares);
    event FeesHarvested(uint256 amount0, uint256 amount1);
    event FeesDonated(uint256 amount, address indexed recipient);
    event Rebalanced(bool enteredLP, uint256 amount0, uint256 amount1, uint256 timestamp);
    event StrategyModeChanged(bool isInLP);
    
    // ============ Errors ============
    
    error InsufficientShares();
    error RebalanceTooSoon();
    error InvalidAmount();
    error StrategyNotInLPMode();
    error PaymentSplitterNotSet();
    
    // ============ Constructor ============
    
    constructor(
        address _hook,
        address _poolManager,
        address _ilPredictor,
        address _token0,
        address _token1,
        PoolKey memory _poolKey
    ) {
        hook = IntelligentPOLHook(_hook);
        poolManager = IPoolManager(_poolManager);
        ilPredictor = ILPredictor(_ilPredictor);
        
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        
        poolKey = _poolKey;
        poolId = _poolKey.toId();
        
        isInLPMode = false;
        rebalanceCooldown = 1 hours;
        lastRebalance = block.timestamp;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Deposit assets into strategy
     * @param amount0 Amount of token0
     * @param amount1 Amount of token1
     * @return shares Shares minted to user
     */
    function deposit(
        uint256 amount0,
        uint256 amount1
    ) external nonReentrant returns (uint256 shares) {
        if (amount0 == 0 && amount1 == 0) revert InvalidAmount();
        
        // Transfer tokens from user
        if (amount0 > 0) {
            token0.safeTransferFrom(msg.sender, address(this), amount0);
        }
        if (amount1 > 0) {
            token1.safeTransferFrom(msg.sender, address(this), amount1);
        }
        
        // Calculate shares (1:1 for first deposit, then proportional)
        if (totalShares == 0) {
            shares = amount0 + amount1; // Simple initial valuation
        } else {
            uint256 totalValue = _calculateTotalValue();
            shares = ((amount0 + amount1) * totalShares) / totalValue;
        }
        
        // Mint shares
        userShares[msg.sender] += shares;
        totalShares += shares;
        
        // Deploy to LP if strategy is in LP mode
        if (isInLPMode) {
            _deployToLP(amount0, amount1);
        }
        
        emit Deposited(msg.sender, amount0, amount1, shares);
        
        return shares;
    }
    
    /**
     * @notice Withdraw assets from strategy
     * @param shares Amount of shares to redeem
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function withdraw(
        uint256 shares
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (shares == 0) revert InvalidAmount();
        if (userShares[msg.sender] < shares) revert InsufficientShares();
        
        // Calculate amounts to withdraw
        uint256 totalValue = _calculateTotalValue();
        amount0 = (shares * _getBalance0()) / totalShares;
        amount1 = (shares * _getBalance1()) / totalShares;
        
        // Burn shares
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        
        // Withdraw from LP if needed
        if (isInLPMode && (amount0 > token0.balanceOf(address(this)) || amount1 > token1.balanceOf(address(this)))) {
            _withdrawFromLP(amount0, amount1);
        }
        
        // Transfer tokens to user
        if (amount0 > 0) {
            token0.safeTransfer(msg.sender, amount0);
        }
        if (amount1 > 0) {
            token1.safeTransfer(msg.sender, amount1);
        }
        
        emit Withdrawn(msg.sender, amount0, amount1, shares);
        
        return (amount0, amount1);
    }
    
    /**
     * @notice Harvest fees and donate to Octant
     * @return totalDonatedAmount Total donated
     */
    function harvest() external nonReentrant returns (uint256 totalDonatedAmount) {
        // Collect fees from hook
        (uint256 fee0, uint256 fee1) = hook.getAccumulatedFees(poolId);
        
        if (fee0 > 0 || fee1 > 0) {
            // Trigger donation from hook
            hook.triggerDonation(poolKey);
            
            totalFeesCollected += fee0 + fee1;
            
            emit FeesHarvested(fee0, fee1);
        }
        
        // Donate to Octant payment splitter
        if (octantPaymentSplitter != address(0)) {
            uint256 balance0 = token0.balanceOf(address(this));
            uint256 balance1 = token1.balanceOf(address(this));
            
            uint256 donationAmount = balance0 + balance1;
            
            if (donationAmount > 0) {
                // Transfer to payment splitter
                if (balance0 > 0) {
                    token0.safeTransfer(octantPaymentSplitter, balance0);
                }
                if (balance1 > 0) {
                    token1.safeTransfer(octantPaymentSplitter, balance1);
                }
                
                totalDonated += donationAmount;
                
                emit FeesDonated(donationAmount, octantPaymentSplitter);
            }
            
            return donationAmount;
        }
        
        return 0;
    }
    
    /**
     * @notice Check if strategy should rebalance
     * @return shouldRebalance True if rebalancing is recommended
     * @return enterLP True if should enter LP, false if should exit
     */
    function checkRebalanceNeeded() public view returns (bool shouldRebalance, bool enterLP) {
        // Check cooldown
        if (block.timestamp < lastRebalance + rebalanceCooldown) {
            return (false, isInLPMode);
        }
        
        // Check if hook flagged for rebalance
        if (hook.needsRebalance(poolId)) {
            return (true, false); // Exit LP
        }
        
        // Get current price and position
        (uint160 sqrtPriceX96,,) = poolManager.getSlot0(poolId);
        uint256 currentPrice = _sqrtPriceX96ToPrice(sqrtPriceX96);
        
        // Predict IL for next 30 days
        try ilPredictor.predict(
            currentPrice,
            currentPosition.tickLower,
            currentPosition.tickUpper,
            30 days
        ) returns (uint256 expectedIL, uint256 exitProb, uint256 confidence) {
            
            // Decision logic
            uint256 IL_THRESHOLD = 500; // 5%
            
            if (isInLPMode) {
                // Currently in LP - should we exit?
                if (expectedIL > IL_THRESHOLD || exitProb > 7000) {
                    return (true, false); // Exit LP
                }
            } else {
                // Currently not in LP - should we enter?
                if (expectedIL < IL_THRESHOLD / 2 && exitProb < 3000) {
                    return (true, true); // Enter LP
                }
            }
            
        } catch {
            // If prediction fails, don't rebalance
            return (false, isInLPMode);
        }
        
        return (false, isInLPMode);
    }
    
    /**
     * @notice Execute rebalancing
     */
    function rebalance() external nonReentrant {
        if (block.timestamp < lastRebalance + rebalanceCooldown) {
            revert RebalanceTooSoon();
        }
        
        (bool should, bool enterLP) = checkRebalanceNeeded();
        
        if (!should) {
            return; // Nothing to do
        }
        
        uint256 amount0;
        uint256 amount1;
        
        if (enterLP && !isInLPMode) {
            // Enter LP mode
            amount0 = token0.balanceOf(address(this));
            amount1 = token1.balanceOf(address(this));
            
            _deployToLP(amount0, amount1);
            isInLPMode = true;
            
        } else if (!enterLP && isInLPMode) {
            // Exit LP mode
            _withdrawAllFromLP();
            isInLPMode = false;
        }
        
        lastRebalance = block.timestamp;
        hook.resetRebalanceFlag(poolId);
        
        emit Rebalanced(isInLPMode, amount0, amount1, block.timestamp);
        emit StrategyModeChanged(isInLPMode);
    }
    
    // ============ Internal Functions ============
    
    function _deployToLP(uint256 amount0, uint256 amount1) internal {
        // Approve pool manager
        token0.safeApprove(address(poolManager), amount0);
        token1.safeApprove(address(poolManager), amount1);
        
        // Add liquidity via pool manager
        // Note: Simplified - real implementation needs proper liquidity calculation
        
        currentPosition.depositedAmount0 += amount0;
        currentPosition.depositedAmount1 += amount1;
        currentPosition.timestamp = block.timestamp;
    }
    
    function _withdrawFromLP(uint256 amount0, uint256 amount1) internal {
        // Remove liquidity proportionally
        // Note: Simplified - real implementation needs proper liquidity calculation
        
        currentPosition.depositedAmount0 -= amount0;
        currentPosition.depositedAmount1 -= amount1;
    }
    
    function _withdrawAllFromLP() internal {
        _withdrawFromLP(
            currentPosition.depositedAmount0,
            currentPosition.depositedAmount1
        );
    }
    
    function _calculateTotalValue() internal view returns (uint256) {
        return _getBalance0() + _getBalance1();
    }
    
    function _getBalance0() internal view returns (uint256) {
        return token0.balanceOf(address(this)) + currentPosition.depositedAmount0;
    }
    
    function _getBalance1() internal view returns (uint256) {
        return token1.balanceOf(address(this)) + currentPosition.depositedAmount1;
    }
    
    function _sqrtPriceX96ToPrice(uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 price = (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) >> (96 * 2);
        return price;
    }
    
    // ============ View Functions ============
    
    function balanceOf(address user) external view returns (uint256) {
        return userShares[user];
    }
    
    function totalAssets() external view returns (uint256) {
        return _calculateTotalValue();
    }
    
    function getPosition() external view returns (Position memory) {
        return currentPosition;
    }
    
    // ============ Admin Functions ============
    
    function setOctantPaymentSplitter(address _splitter) external onlyOwner {
        octantPaymentSplitter = _splitter;
    }
    
    function setRebalanceCooldown(uint256 _cooldown) external onlyOwner {
        rebalanceCooldown = _cooldown;
    }
    
    function emergencyWithdraw() external onlyOwner {
        if (isInLPMode) {
            _withdrawAllFromLP();
            isInLPMode = false;
        }
        
        // Transfer all tokens to owner
        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        
        if (balance0 > 0) {
            token0.safeTransfer(owner(), balance0);
        }
        if (balance1 > 0) {
            token1.safeTransfer(owner(), balance1);
        }
    }
}