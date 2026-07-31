// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AssetPassportController} from "../src/AssetPassportController.sol";

interface VmControllerDeploy {
    function envAddress(string calldata name) external returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Deploys the demo policy gate. Use a test-only owner wallet and fund it only with Test ETH.
contract DeployAssetPassportController {
    VmControllerDeploy private constant vm = VmControllerDeploy(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (AssetPassportController controller) {
        address owner = vm.envAddress("ASSET_PASSPORT_OWNER");
        vm.startBroadcast();
        controller = new AssetPassportController(owner);
        vm.stopBroadcast();
    }
}
