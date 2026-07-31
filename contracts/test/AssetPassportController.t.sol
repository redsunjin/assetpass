// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AssetPassportController} from "../src/AssetPassportController.sol";

interface VmController {
    function prank(address) external;
    function deal(address account, uint256 newBalance) external;
}

/// @notice Self-contained Foundry tests; no forge-std dependency is required.
contract AssetPassportControllerTest {
    VmController private constant vm = VmController(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant OWNER = address(0xA11CE);
    address payable private constant PAYEE = payable(address(0xB0B));
    address private constant OUTSIDER = address(0xBAD);

    function testOwnerCanExecuteOneAllowedPayment() external {
        AssetPassportController controller = new AssetPassportController(OWNER);
        vm.deal(address(controller), 1 ether);
        vm.prank(OWNER);
        controller.setPayeePolicy(PAYEE, true, 0.005 ether);

        uint256 beforeBalance = PAYEE.balance;
        vm.prank(OWNER);
        controller.executePayment(PAYEE, 0.001 ether, keccak256("proposal-1"), keccak256("policy-1"));

        _assertEq(PAYEE.balance, beforeBalance + 0.001 ether);
        _assertTrue(controller.executedProposals(keccak256("proposal-1")));
    }

    function testPaymentRejectsOutsiderAndPolicyViolations() external {
        AssetPassportController controller = new AssetPassportController(OWNER);
        vm.deal(address(controller), 1 ether);

        vm.prank(OUTSIDER);
        (bool outsiderSuccess,) = address(controller).call(
            abi.encodeCall(controller.executePayment, (PAYEE, 0.001 ether, keccak256("proposal-out"), keccak256("policy")))
        );
        _assertFalse(outsiderSuccess);

        vm.prank(OWNER);
        controller.setPayeePolicy(PAYEE, true, 0.001 ether);
        vm.prank(OWNER);
        (bool overLimitSuccess,) = address(controller).call(
            abi.encodeCall(controller.executePayment, (PAYEE, 0.002 ether, keccak256("proposal-over"), keccak256("policy")))
        );
        _assertFalse(overLimitSuccess);
    }

    function testProposalCannotExecuteTwice() external {
        AssetPassportController controller = new AssetPassportController(OWNER);
        vm.deal(address(controller), 1 ether);
        vm.prank(OWNER);
        controller.setPayeePolicy(PAYEE, true, 0.005 ether);

        bytes32 proposalHash = keccak256("proposal-once");
        vm.prank(OWNER);
        controller.executePayment(PAYEE, 0.001 ether, proposalHash, keccak256("policy"));
        vm.prank(OWNER);
        (bool duplicateSuccess,) = address(controller).call(
            abi.encodeCall(controller.executePayment, (PAYEE, 0.001 ether, proposalHash, keccak256("policy")))
        );
        _assertFalse(duplicateSuccess);
    }

    function _assertEq(uint256 actual, uint256 expected) private pure {
        require(actual == expected, "assertion failed");
    }

    function _assertTrue(bool value) private pure {
        require(value, "assertion failed");
    }

    function _assertFalse(bool value) private pure {
        require(!value, "assertion failed");
    }
}
