// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AssetRegistry} from "../src/AssetRegistry.sol";

interface Vm {
    function envAddress(string calldata name) external returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Deploys the evidence-only registry from the test-only broadcaster supplied to Foundry.
contract DeployAssetRegistry {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (AssetRegistry registry) {
        address issuer = vm.envAddress("ASSET_PASSPORT_ISSUER");
        address reviewer = vm.envAddress("ASSET_PASSPORT_REVIEWER");
        address auditor = vm.envAddress("ASSET_PASSPORT_AUDITOR");

        vm.startBroadcast();
        registry = new AssetRegistry(issuer, reviewer, auditor);
        vm.stopBroadcast();
    }
}
