// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {StatisticsLib} from "../libraries/StatisticsLib.sol";

// ============================================
// VOLATILITY ORACLE
// ============================================

/**
 * @title VolatilityOracle
 * @notice Manages volatility data from Chainlink and manual sources
 * @dev Provides fallback mechanism if Chainlink data is stale
 */
abstract contract VolatilityOracle is Ownable {
    using StatisticsLib for uint256[];

    // ============ State Variables ============

    AggregatorV3Interface public priceFeed;

    uint256 public manualVolatility; // Fallback volatility (scaled by 1e18)
    uint256 public maxStaleness; // Max time before data considered stale

    uint256[] public historicalPrices;
    uint256 public maxHistoricalPrices;

    bool public useManualVolatility;

    // ============ Events ============

    event VolatilityUpdated(uint256 volatility, uint256 timestamp);
    event ManualVolatilitySet(uint256 volatility, address setter);
    event PriceUpdated(uint256 price, uint256 timestamp);
    event PriceFeedUpdated(address indexed newFeed);

    // ============ Errors ============

    error StalePrice();
    error InvalidVolatility();
    error InvalidPriceFeed();

    // ============ Constructor ============

    constructor(
        address _priceFeed,
        uint256 _maxStaleness,
        uint256 _maxHistoricalPrices
    ) {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();

        priceFeed = AggregatorV3Interface(_priceFeed);
        maxStaleness = _maxStaleness;
        maxHistoricalPrices = _maxHistoricalPrices;

        // Initialize with 10% default volatility
        manualVolatility = 0.1e18;
        useManualVolatility = false;
    }

    // ============ External Functions ============

    /**
     * @notice Get current volatility (annualized)
     * @return Volatility (scaled by 1e18)
     */
    function getVolatility() external view returns (uint256) {
        // Use manual volatility if enabled
        if (useManualVolatility) {
            return manualVolatility;
        }

        // Calculate from historical prices
        if (historicalPrices.length >= 7) {
            return historicalPrices.calculateVolatility(365); // Daily to annual
        }

        // Fallback to manual
        return manualVolatility;
    }

    /**
     * @notice Get latest price from Chainlink
     * @return price Latest price
     * @return timestamp Price timestamp
     */
    function getLatestPrice()
        external
        view
        returns (uint256 price, uint256 timestamp)
    {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        // Check staleness
        if (block.timestamp - updatedAt > maxStaleness) revert StalePrice();
        if (answeredInRound < roundId) revert StalePrice();

        return (uint256(answer), updatedAt);
    }

    /**
     * @notice Update historical prices (called daily by keeper)
     */
    function updatePriceHistory() external {
        (uint256 price, uint256 timestamp) = this.getLatestPrice();

        historicalPrices.push(price);

        // Keep only last N prices
        if (historicalPrices.length > maxHistoricalPrices) {
            // Shift array left
            for (uint256 i = 0; i < historicalPrices.length - 1; i++) {
                historicalPrices[i] = historicalPrices[i + 1];
            }
            historicalPrices.pop();
        }

        emit PriceUpdated(price, timestamp);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set manual volatility (fallback)
     * @param _volatility Volatility value (scaled by 1e18)
     */
    function setManualVolatility(uint256 _volatility) external onlyOwner {
        if (_volatility > 5e18) revert InvalidVolatility(); // Max 500% volatility

        manualVolatility = _volatility;
        emit ManualVolatilitySet(_volatility, msg.sender);
    }

    /**
     * @notice Toggle manual volatility mode
     */
    function setUseManualVolatility(bool _use) external onlyOwner {
        useManualVolatility = _use;
    }

    /**
     * @notice Update price feed address
     */
    function setPriceFeed(address _newFeed) external onlyOwner {
        if (_newFeed == address(0)) revert InvalidPriceFeed();
        priceFeed = AggregatorV3Interface(_newFeed);
        emit PriceFeedUpdated(_newFeed);
    }

    /**
     * @notice Get historical prices array
     */
    function getHistoricalPrices() external view returns (uint256[] memory) {
        return historicalPrices;
    }
}
