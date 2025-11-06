// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../libraries/MathLib.sol";

// ============================================
// CONFIGURATION HELPER
// ============================================

/**
 * @title ConfigHelper
 * @notice Helper contract for calculating optimal strategy parameters
 * @dev Provides recommendations based on market conditions
 *
 * FIXES APPLIED:
 * ✅ More sophisticated threshold calculations
 * ✅ Gas price consideration for rebalancing
 * ✅ Multi-tier volatility buckets
 * ✅ Dynamic range width calculation
 */
contract ConfigHelper {
    using MathLib for uint256;

    // ============ Constants ============

    uint256 private constant SCALE = 1e18;
    uint256 private constant BASIS_POINTS = 10000;

    // Volatility tiers
    uint256 private constant LOW_VOL = 0.3e18; // 30%
    uint256 private constant MEDIUM_VOL = 0.6e18; // 60%
    uint256 private constant HIGH_VOL = 1e18; // 100%

    // Gas price tiers (in gwei)
    uint256 private constant LOW_GAS = 20;
    uint256 private constant MEDIUM_GAS = 50;
    uint256 private constant HIGH_GAS = 100;

    // ============ Structures ============

    struct RecommendedConfig {
        uint256 ilThreshold; // Basis points
        int24 tickLower; // Recommended lower tick
        int24 tickUpper; // Recommended upper tick
        uint256 rebalanceCooldown; // Seconds
        uint256 confidence; // Basis points
        string riskLevel; // "Low", "Medium", "High"
    }

    // ============ External Functions ============

    /**
     * @notice Get recommended IL threshold based on asset volatility
     * @dev More volatile assets need higher tolerance
     *
     * @param annualizedVolatility Volatility (scaled by 1e18)
     * @return threshold Recommended threshold in basis points
     */
    function getRecommendedILThreshold(
        uint256 annualizedVolatility
    ) external pure returns (uint256 threshold) {
        if (annualizedVolatility < LOW_VOL) {
            return 300; // 3% for stable pairs (e.g., USDC/DAI)
        } else if (annualizedVolatility < MEDIUM_VOL) {
            return 500; // 5% for moderate volatility (e.g., ETH/USDC)
        } else if (annualizedVolatility < HIGH_VOL) {
            return 800; // 8% for high volatility
        } else {
            return 1200; // 12% for very high volatility
        }
    }

    /**
     * @notice Get recommended tick range based on volatility
     * @param volatility Annualized volatility (scaled by 1e18)
     * @param currentTick Current pool tick
     * @return tickLower Lower tick
     * @return tickUpper Upper tick
     */
    function getRecommendedRange(
        uint256 volatility,
        int24 currentTick
    ) external pure returns (int24 tickLower, int24 tickUpper) {
        int24 rangeWidth;

        if (volatility < LOW_VOL) {
            rangeWidth = 500; // Tight range for stable
        } else if (volatility < MEDIUM_VOL) {
            rangeWidth = 1000; // Medium range
        } else if (volatility < HIGH_VOL) {
            rangeWidth = 2000; // Wide range
        } else {
            rangeWidth = 3000; // Very wide for extreme volatility
        }

        return (currentTick - rangeWidth, currentTick + rangeWidth);
    }

    /**
     * @notice Calculate optimal rebalance frequency
     * @param volatility Annualized volatility
     * @param gasPrice Current gas price in gwei
     * @param tvl Total value locked in strategy
     * @return cooldown Recommended cooldown in seconds
     */
    function getOptimalRebalanceFrequency(
        uint256 volatility,
        uint256 gasPrice,
        uint256 tvl
    ) external pure returns (uint256 cooldown) {
        // Base cooldown on volatility
        uint256 baseCooldown;

        if (volatility < LOW_VOL) {
            baseCooldown = 24 hours; // Stable: once per day
        } else if (volatility < MEDIUM_VOL) {
            baseCooldown = 12 hours; // Moderate: twice per day
        } else if (volatility < HIGH_VOL) {
            baseCooldown = 6 hours; // High: four times per day
        } else {
            baseCooldown = 3 hours; // Extreme: eight times per day
        }

        // Adjust for gas prices (higher gas = less frequent)
        if (gasPrice > HIGH_GAS) {
            baseCooldown = baseCooldown * 2; // Double cooldown
        } else if (gasPrice > MEDIUM_GAS) {
            baseCooldown = (baseCooldown * 3) / 2; // 1.5x cooldown
        }

        // Adjust for TVL (larger TVL = can afford more frequent rebalancing)
        if (tvl > 10_000_000e18) {
            // > $10M
            baseCooldown = baseCooldown / 2; // Half cooldown
        } else if (tvl < 100_000e18) {
            // < $100k
            baseCooldown = baseCooldown * 2; // Double cooldown
        }

        // Minimum 1 hour, maximum 7 days
        if (baseCooldown < 1 hours) baseCooldown = 1 hours;
        if (baseCooldown > 7 days) baseCooldown = 7 days;

        return baseCooldown;
    }

    /**
     * @notice Get comprehensive configuration recommendation
     * @param volatility Current volatility
     * @param currentTick Current pool tick
     * @param gasPrice Gas price in gwei
     * @param tvl Total value locked
     * @return config Recommended configuration
     */
    function getRecommendedConfiguration(
        uint256 volatility,
        int24 currentTick,
        uint256 gasPrice,
        uint256 tvl
    ) external view returns (RecommendedConfig memory config) {
        config.ilThreshold = this.getRecommendedILThreshold(volatility);
        (config.tickLower, config.tickUpper) = this.getRecommendedRange(
            volatility,
            currentTick
        );
        config.rebalanceCooldown = this.getOptimalRebalanceFrequency(
            volatility,
            gasPrice,
            tvl
        );

        // Assess confidence based on volatility stability
        if (volatility < LOW_VOL) {
            config.confidence = 9000; // 90% confidence
            config.riskLevel = "Low";
        } else if (volatility < MEDIUM_VOL) {
            config.confidence = 7500; // 75% confidence
            config.riskLevel = "Medium";
        } else if (volatility < HIGH_VOL) {
            config.confidence = 6000; // 60% confidence
            config.riskLevel = "High";
        } else {
            config.confidence = 4000; // 40% confidence
            config.riskLevel = "Very High";
        }

        return config;
    }

    /**
     * @notice Calculate break-even fee APY
     * @dev Fee APY needed to compensate for expected IL
     *
     * @param expectedIL Expected IL in basis points
     * @param timeHorizon Time horizon in seconds
     * @return breakEvenAPY Annual fee APY needed (basis points)
     */
    function calculateBreakEvenFeeAPY(
        uint256 expectedIL,
        uint256 timeHorizon
    ) external pure returns (uint256 breakEvenAPY) {
        // Annualize the expected IL
        uint256 annualizedIL = (expectedIL * 365 days) / timeHorizon;

        // Break-even = IL + safety margin (20%)
        breakEvenAPY = (annualizedIL * 12) / 10;

        return breakEvenAPY;
    }

    /**
     * @notice Check if position should be in LP mode
     * @param feeAPY Current fee APY (basis points)
     * @param expectedIL Expected IL (basis points)
     * @param safeAPY Safe alternative yield (e.g., Aave) (basis points)
     * @return shouldProvideLP True if LP is better than safe alternative
     */
    function shouldProvideLiquidity(
        uint256 feeAPY,
        uint256 expectedIL,
        uint256 safeAPY
    ) external pure returns (bool shouldProvideLP) {
        // Net LP return = Fee APY - Expected IL
        uint256 netLPReturn = feeAPY > expectedIL ? feeAPY - expectedIL : 0;

        // Add 2% margin for LP (to account for gas costs)
        uint256 requiredMargin = 200; // 2%

        // Should provide LP if: Net LP Return > Safe APY + Margin
        return netLPReturn > safeAPY + requiredMargin;
    }
}
