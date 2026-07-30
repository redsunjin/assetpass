// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AssetRegistry} from "../src/AssetRegistry.sol";

interface Vm {
    function envAddress(string calldata name) external returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Registers only fictional demo assets and their content hashes.
/// @dev Run this only after deployment from an address granted the issuer role.
contract InitializeDemoAssets {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    bytes32 private constant DISCLOSURE = keccak256("DISCLOSURE");
    bytes32 private constant SOLAR_DOCUMENT_HASH = 0xaf5aba5c9f5e365d508f8f4a7d8139896a3c50dd21ef0307ead61d2547464ce6;
    bytes32 private constant BUILDING_DOCUMENT_HASH = 0x8030f3c7878d2e8507104989348b8228a2ed3b45a3ee1607730e0573258f772b;

    function run() external {
        AssetRegistry registry = AssetRegistry(vm.envAddress("ASSET_PASSPORT_REGISTRY"));

        vm.startBroadcast();
        bytes32 solar = registry.registerAsset("demo-solar-001", uint64(block.timestamp + 14 days));
        registry.submitDocument(solar, DISCLOSURE, SOLAR_DOCUMENT_HASH);

        registry.registerAsset("demo-invoice-002", uint64(block.timestamp + 21 days));

        bytes32 building = registry.registerAsset("demo-building-003", uint64(block.timestamp + 28 days));
        registry.submitDocument(building, DISCLOSURE, BUILDING_DOCUMENT_HASH);
        vm.stopBroadcast();
    }
}
