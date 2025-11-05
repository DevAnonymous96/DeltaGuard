// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {MathLib} from "../src/libraries/MathLib.sol";

// ============================================
// TEST SUITE: MATH LIBRARY TESTS
// ============================================

contract MathLibTest is Test {
    using MathLib for uint256;
    using MathLib for int256;
    
    uint256 constant SCALE = 1e18;
    
    function setUp() public {}
    
    // ============ Natural Log Tests ============
    
    function testLn_One_ReturnsZero() public {
        int256 result = MathLib.ln(SCALE);
        assertEq(result, 0, "ln(1) should be 0");
    }
    
    function testLn_e_ReturnsOne() public {
        // e ≈ 2.718281828
        uint256 e = 2718281828459045235; // e * 1e18
        int256 result = MathLib.ln(e);
        
        // Should be close to 1e18
        assertApproxEqAbs(uint256(result), SCALE, 1e16, "ln(e) should be 1");
    }
    
    function testLn_Ten_ReturnsCorrectValue() public {
        uint256 ten = 10 * SCALE;
        int256 result = MathLib.ln(ten);
        
        // ln(10) ≈ 2.302585
        int256 expected = 2302585092994045684; // 2.302585 * 1e18
        assertApproxEqAbs(uint256(result), uint256(expected), 1e16, "ln(10) incorrect");
    }
    
    function testLn_LargeNumber() public {
        uint256 large = 1000 * SCALE;
        int256 result = MathLib.ln(large);
        
        // ln(1000) ≈ 6.907755
        assertGt(result, 6e18, "ln(1000) should be > 6");
        assertLt(result, 7e18, "ln(1000) should be < 7");
    }
    
    function testLn_RevertsOnZero() public {
        vm.expectRevert(MathLib.DivisionByZero.selector);
        MathLib.ln(0);
    }
    
    // ============ Square Root Tests ============
    
    function testSqrt_Zero_ReturnsZero() public {
        uint256 result = MathLib.sqrt(0);
        assertEq(result, 0, "sqrt(0) should be 0");
    }
    
    function testSqrt_One_ReturnsOne() public {
        uint256 result = MathLib.sqrt(1);
        assertEq(result, 1, "sqrt(1) should be 1");
    }
    
    function testSqrt_PerfectSquare() public {
        uint256 result = MathLib.sqrt(16);
        assertEq(result, 4, "sqrt(16) should be 4");
    }
    
    function testSqrt_LargeNumber() public {
        uint256 input = SCALE * SCALE; // 1e36
        uint256 result = MathLib.sqrt(input);
        assertEq(result, SCALE, "sqrt(1e36) should be 1e18");
    }
    
    function testSqrt_NonPerfectSquare() public {
        uint256 result = MathLib.sqrt(2 * SCALE);
        
        // sqrt(2) ≈ 1.414213562
        uint256 expected = 1414213562373095048; // 1.414213562 * 1e18
        assertApproxEqAbs(result, expected, 1e9, "sqrt(2) incorrect");
    }
    
    // ============ Normal CDF Tests ============
    
    function testNormalCDF_Zero_ReturnsHalf() public {
        uint256 result = MathLib.normalCDF(0);
        
        // N(0) = 0.5
        assertApproxEqAbs(result, SCALE / 2, 1e16, "N(0) should be 0.5");
    }
    
    function testNormalCDF_Positive_ReturnsGreaterThanHalf() public {
        int256 input = 1 * int256(SCALE); // 1 standard deviation
        uint256 result = MathLib.normalCDF(input);
        
        // N(1) ≈ 0.841 (84.1%)
        assertGt(result, SCALE / 2, "N(1) should be > 0.5");
        assertApproxEqAbs(result, 841e15, 5e16, "N(1) ~= 0.841");

    }
    
    function testNormalCDF_Negative_ReturnsLessThanHalf() public {
        int256 input = -1 * int256(SCALE);
        uint256 result = MathLib.normalCDF(input);
        
        // N(-1) ≈ 0.159
        assertLt(result, SCALE / 2, "N(-1) should be < 0.5");
        assertApproxEqAbs(result, 159e15, 5e16, "N(-1) ~= 0.159");
    }
    
    function testNormalCDF_LargePositive_ReturnsNearOne() public {
        int256 input = 3 * int256(SCALE); // 3 std deviations
        uint256 result = MathLib.normalCDF(input);
        
        // N(3) ≈ 0.9987
        assertGt(result, 99e16, "N(3) should be > 0.99");
    }
    
    function testNormalCDF_LargeNegative_ReturnsNearZero() public {
        int256 input = -3 * int256(SCALE);
        uint256 result = MathLib.normalCDF(input);
        
        // N(-3) ≈ 0.0013
        assertLt(result, 1e16, "N(-3) should be < 0.01");
    }
    
    // ============ Absolute Value Tests ============
    
    function testAbs_Positive_ReturnsSame() public {
        int256 input = 100;
        uint256 result = MathLib.abs(input);
        assertEq(result, 100, "abs(100) should be 100");
    }
    
    function testAbs_Negative_ReturnsPositive() public {
        int256 input = -100;
        uint256 result = MathLib.abs(input);
        assertEq(result, 100, "abs(-100) should be 100");
    }
    
    function testAbs_Zero_ReturnsZero() public {
        int256 input = 0;
        uint256 result = MathLib.abs(input);
        assertEq(result, 0, "abs(0) should be 0");
    }
    
    // ============ Gas Benchmarks ============
    
    function testGas_Ln() public {
        uint256 gasStart = gasleft();
        MathLib.ln(2 * SCALE);
        uint256 gasUsed = gasStart - gasleft();
        
        // Should be < 15k gas
        assertLt(gasUsed, 15000, "ln() uses too much gas");
        emit log_named_uint("Gas used for ln()", gasUsed);
    }
    
    function testGas_Sqrt() public {
        uint256 gasStart = gasleft();
        MathLib.sqrt(2 * SCALE);
        uint256 gasUsed = gasStart - gasleft();
        
        // Should be < 10k gas
        assertLt(gasUsed, 10000, "sqrt() uses too much gas");
        emit log_named_uint("Gas used for sqrt()", gasUsed);
    }
    
    function testGas_NormalCDF() public {
        uint256 gasStart = gasleft();
        MathLib.normalCDF(int256(SCALE));
        uint256 gasUsed = gasStart - gasleft();
        
        // Should be < 20k gas
        assertLt(gasUsed, 20000, "normalCDF() uses too much gas");
        emit log_named_uint("Gas used for normalCDF()", gasUsed);
    }
}