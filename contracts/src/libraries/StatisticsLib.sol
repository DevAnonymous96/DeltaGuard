// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./MathLib.sol";

/**
 * @title StatisticsLib
 * @notice Statistical calculations for volatility and risk metrics
 * @dev Production-ready with proper error handling and gas optimization
 *
 * FIXES APPLIED:
 * ✅ Robust volatility calculation with outlier detection
 * ✅ Added EWMA (Exponentially Weighted Moving Average) option
 * ✅ Sharpe ratio and downside deviation calculations
 * ✅ Gas-optimized array operations
 * ✅ Comprehensive bounds checking
 */
library StatisticsLib {
    using MathLib for uint256;
    using MathLib for int256;

    // ============ Constants ============

    uint256 private constant SCALE = 1e18;
    int256 private constant SCALE_INT = 1e18;
    uint256 private constant BASIS_POINTS = 10000;

    // Volatility parameters
    uint256 private constant MIN_DATA_POINTS = 7; // Minimum for meaningful volatility
    uint256 private constant MAX_DATA_POINTS = 365; // Max historical data (1 year daily)

    // EWMA decay factor (lambda = 0.94 for RiskMetrics)
    uint256 private constant EWMA_LAMBDA = 940000000000000000; // 0.94 * 1e18

    // ============ Errors ============

    error InsufficientData();
    error InvalidPriceData();
    error ArrayTooLarge();
    error InvalidParameter();

    // ============ Structures ============

    struct VolatilityResult {
        uint256 volatility; // Annualized volatility
        uint256 confidence; // Confidence level (0-10000 basis points)
        uint256 dataPoints; // Number of data points used
        int256 meanReturn; // Average return
    }

    // ============ Main Functions ============

    /**
     * @notice Calculate annualized volatility from price series
     * @dev Uses log returns and sample standard deviation
     *
     * Formula: σ_annual = σ_sample * sqrt(periods_per_year)
     * where σ_sample = sqrt(Σ(r_i - μ)² / (n-1))
     *
     * @param prices Array of historical prices (must be > MIN_DATA_POINTS)
     * @param periodsPerYear Number of periods in a year (365 for daily, 52 for weekly)
     * @return result VolatilityResult struct with volatility and metadata
     */
    function calculateVolatility(
        uint256[] memory prices,
        uint256 periodsPerYear
    ) internal pure returns (VolatilityResult memory result) {
        // Validation
        if (prices.length < MIN_DATA_POINTS) revert InsufficientData();
        if (prices.length > MAX_DATA_POINTS) revert ArrayTooLarge();
        if (periodsPerYear == 0 || periodsPerYear > 365)
            revert InvalidParameter();

        // Calculate log returns
        int256[] memory returnsArray = new int256[](prices.length - 1);

        unchecked {
            for (uint256 i = 0; i < prices.length - 1; i++) {
                if (prices[i] == 0 || prices[i + 1] == 0)
                    revert InvalidPriceData();

                // Prevent extreme price movements (likely data errors)
                uint256 ratio = (prices[i + 1] * SCALE) / prices[i];
                if (ratio > 10 * SCALE || ratio < SCALE / 10) {
                    revert InvalidPriceData(); // > 10x or < 0.1x movement
                }

                // ln(P_t+1 / P_t)
                int256 logReturn = MathLib.ln(
                    (prices[i + 1] * SCALE) / prices[i]
                );
                returnsArray[i] = logReturn;
            }
        }

        // Calculate mean return
        int256 mean = _calculateMean(returnsArray);

        // Calculate variance (sample variance with Bessel's correction)
        uint256 variance = 0;

        unchecked {
            for (uint256 i = 0; i < returnsArray.length; i++) {
                int256 diff = returnsArray[i] - mean;
                uint256 squaredDiff = MathLib.abs(diff * diff) / SCALE;
                variance += squaredDiff;
            }
        }

        // Sample variance: divide by (n-1) not n
        variance = variance / (returnsArray.length - 1);

        // Standard deviation (period volatility)
        uint256 stdDev = MathLib.sqrt(variance);

        // Annualize: σ_annual = σ_period * sqrt(periods_per_year)
        uint256 sqrtPeriods = MathLib.sqrt(periodsPerYear * SCALE);
        uint256 annualizedVol = (stdDev * sqrtPeriods) / MathLib.sqrt(SCALE);

        // Calculate confidence based on data quality
        uint256 confidence = _calculateConfidence(prices.length, returnsArray);

        return
            VolatilityResult({
                volatility: annualizedVol,
                confidence: confidence,
                dataPoints: prices.length,
                meanReturn: mean
            });
    }

    /**
     * @notice Calculate EWMA volatility (more responsive to recent data)
     * @dev Uses RiskMetrics methodology with lambda = 0.94
     *
     * Formula: σ²_t = λ * σ²_t-1 + (1-λ) * r²_t
     *
     * @param prices Historical prices
     * @param periodsPerYear Periods per year for annualization
     * @return Annualized EWMA volatility
     */
    function calculateEWMAVolatility(
        uint256[] memory prices,
        uint256 periodsPerYear
    ) internal pure returns (uint256) {
        if (prices.length < MIN_DATA_POINTS) revert InsufficientData();

        // Calculate returns
        int256[] memory returnsArray = new int256[](prices.length - 1);

        unchecked {
            for (uint256 i = 0; i < prices.length - 1; i++) {
                if (prices[i] == 0 || prices[i + 1] == 0)
                    revert InvalidPriceData();
                returnsArray[i] = MathLib.ln(
                    (prices[i + 1] * SCALE) / prices[i]
                );
            }
        }

        // Initialize with sample variance
        uint256 variance = 0;
        int256 mean = _calculateMean(returnsArray);

        unchecked {
            for (uint256 i = 0; i < returnsArray.length; i++) {
                int256 diff = returnsArray[i] - mean;
                variance += MathLib.abs(diff * diff) / SCALE;
            }
        }
        variance = variance / returnsArray.length;

        // Apply EWMA recursively
        uint256 ewmaVariance = variance;

        unchecked {
            for (uint256 i = 0; i < returnsArray.length; i++) {
                uint256 squaredReturn = MathLib.abs(
                    returnsArray[i] * returnsArray[i]
                ) / SCALE;

                // σ²_t = λ * σ²_t-1 + (1-λ) * r²_t
                ewmaVariance =
                    (EWMA_LAMBDA * ewmaVariance) /
                    SCALE +
                    ((SCALE - EWMA_LAMBDA) * squaredReturn) /
                    SCALE;
            }
        }

        // Annualize
        uint256 stdDev = MathLib.sqrt(ewmaVariance);
        uint256 sqrtPeriods = MathLib.sqrt(periodsPerYear * SCALE);

        return (stdDev * sqrtPeriods) / MathLib.sqrt(SCALE);
    }

    /**
     * @notice Calculate simple returns (not log returns)
     * @param prices Price array
     * @return Array of simple returns (scaled by 1e18)
     */
    function calculateReturns(
        uint256[] memory prices
    ) internal pure returns (int256[] memory) {
        if (prices.length < 2) revert InsufficientData();

        int256[] memory returnsArray = new int256[](prices.length - 1);

        unchecked {
            for (uint256 i = 0; i < prices.length - 1; i++) {
                if (prices[i] == 0) revert InvalidPriceData();

                // (P_t+1 - P_t) / P_t
                int256 returnPct = ((int256(prices[i + 1]) -
                    int256(prices[i])) * SCALE_INT) / int256(prices[i]);
                returnsArray[i] = returnPct;
            }
        }

        return returnsArray;
    }

    /**
     * @notice Calculate Sharpe ratio
     * @dev Sharpe = (mean_return - risk_free_rate) / volatility
     *
     * @param prices Historical prices
     * @param riskFreeRate Annual risk-free rate (scaled by 1e18)
     * @param periodsPerYear Periods per year
     * @return Sharpe ratio (scaled by 1e18)
     */
    function calculateSharpeRatio(
        uint256[] memory prices,
        uint256 riskFreeRate,
        uint256 periodsPerYear
    ) internal pure returns (int256) {
        VolatilityResult memory volResult = calculateVolatility(
            prices,
            periodsPerYear
        );

        // Annualize mean return
        int256 annualizedReturn = volResult.meanReturn * int256(periodsPerYear);

        // Sharpe = (return - rf) / volatility
        int256 excessReturn = annualizedReturn - int256(riskFreeRate);

        if (volResult.volatility == 0) return 0;

        return (excessReturn * SCALE_INT) / int256(volResult.volatility);
    }

    /**
     * @notice Calculate downside deviation (only negative returns)
     * @dev Used for Sortino ratio calculation
     *
     * @param prices Historical prices
     * @param periodsPerYear Periods per year
     * @return Annualized downside deviation
     */
    function calculateDownsideDeviation(
        uint256[] memory prices,
        uint256 periodsPerYear
    ) internal pure returns (uint256) {
        if (prices.length < MIN_DATA_POINTS) revert InsufficientData();

        int256[] memory returnsArray = new int256[](prices.length - 1);

        unchecked {
            for (uint256 i = 0; i < prices.length - 1; i++) {
                if (prices[i] == 0 || prices[i + 1] == 0)
                    revert InvalidPriceData();
                returnsArray[i] = MathLib.ln(
                    (prices[i + 1] * SCALE) / prices[i]
                );
            }
        }

        // Calculate downside variance (only negative returns)
        uint256 downsideVariance = 0;
        uint256 negativeCount = 0;

        unchecked {
            for (uint256 i = 0; i < returnsArray.length; i++) {
                if (returnsArray[i] < 0) {
                    uint256 squaredReturn = MathLib.abs(
                        returnsArray[i] * returnsArray[i]
                    ) / SCALE;
                    downsideVariance += squaredReturn;
                    negativeCount++;
                }
            }
        }

        if (negativeCount == 0) return 0;

        downsideVariance = downsideVariance / negativeCount;

        // Annualize
        uint256 downsideDev = MathLib.sqrt(downsideVariance);
        uint256 sqrtPeriods = MathLib.sqrt(periodsPerYear * SCALE);

        return (downsideDev * sqrtPeriods) / MathLib.sqrt(SCALE);
    }

    /**
     * @notice Calculate maximum drawdown
     * @param prices Historical prices
     * @return Maximum drawdown in basis points
     */
    function calculateMaxDrawdown(
        uint256[] memory prices
    ) internal pure returns (uint256) {
        if (prices.length < 2) revert InsufficientData();

        uint256 maxDrawdown = 0;
        uint256 peak = prices[0];

        unchecked {
            for (uint256 i = 1; i < prices.length; i++) {
                if (prices[i] > peak) {
                    peak = prices[i];
                } else {
                    // Calculate drawdown from peak
                    uint256 drawdown = ((peak - prices[i]) * BASIS_POINTS) /
                        peak;
                    if (drawdown > maxDrawdown) {
                        maxDrawdown = drawdown;
                    }
                }
            }
        }

        return maxDrawdown;
    }

    // ============ Internal Helper Functions ============

    /**
     * @notice Calculate mean of returns
     */
    function _calculateMean(
        int256[] memory returnsArray
    ) private pure returns (int256) {
        if (returnsArray.length == 0) return 0;

        int256 sum = 0;

        unchecked {
            for (uint256 i = 0; i < returnsArray.length; i++) {
                sum += returnsArray[i];
            }
        }

        return sum / int256(returnsArray.length);
    }

    /**
     * @notice Calculate confidence level based on data quality
     * @dev More data points = higher confidence, outliers reduce confidence
     */
    function _calculateConfidence(
        uint256 dataPoints,
        int256[] memory returnsArray
    ) private pure returns (uint256) {
        // Base confidence on sample size
        uint256 confidence = BASIS_POINTS;

        // Reduce confidence for small samples
        if (dataPoints < 30) {
            confidence = (confidence * dataPoints * 100) / 3000; // Linear scale
        }

        // Check for outliers (returns > 3 std deviations)
        int256 mean = _calculateMean(returnsArray);
        uint256 variance = 0;

        unchecked {
            for (uint256 i = 0; i < returnsArray.length; i++) {
                int256 diff = returnsArray[i] - mean;
                variance += MathLib.abs(diff * diff) / SCALE;
            }
        }

        variance = variance / returnsArray.length;
        uint256 stdDev = MathLib.sqrt(variance);

        // Count outliers
        uint256 outlierCount = 0;
        unchecked {
            for (uint256 i = 0; i < returnsArray.length; i++) {
                uint256 deviation = MathLib.abs(returnsArray[i] - mean);
                if (deviation > 3 * stdDev) {
                    outlierCount++;
                }
            }
        }

        // Reduce confidence by 10% for each outlier
        if (outlierCount > 0) {
            uint256 reduction = MathLib.min(outlierCount * 1000, 5000); // Max 50% reduction
            confidence =
                (confidence * (BASIS_POINTS - reduction)) /
                BASIS_POINTS;
        }

        return confidence;
    }
}
