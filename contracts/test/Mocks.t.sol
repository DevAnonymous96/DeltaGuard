// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "openzeppelin-contracts/token/ERC20/ERC20.sol";

// ============================================
// MOCK CONTRACTS FOR TESTING
// ============================================

contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}

contract MockChainlinkFeed {
    int256 public price;
    uint256 public timestamp;
    
    constructor(int256 _price) {
        price = _price;
        timestamp = block.timestamp;
    }
    
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (1, price, timestamp, timestamp, 1);
    }
    
    function setPrice(int256 _price) external {
        price = _price;
        timestamp = block.timestamp;
    }
}