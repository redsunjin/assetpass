// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AssetRegistry} from "../src/AssetRegistry.sol";

interface Vm {
    function prank(address) external;
}

/// @notice Self-contained Foundry tests; no forge-std dependency is required.
contract AssetRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant ISSUER = address(0x1001);
    address private constant REVIEWER = address(0x1002);
    address private constant AUDITOR = address(0x1003);
    address private constant OUTSIDER = address(0x1004);

    function testIssuerCanRegisterSubmitReviewAndDisclose() external {
        AssetRegistry registry = new AssetRegistry(ISSUER, REVIEWER, AUDITOR);
        string memory externalId = "demo-solar-001";
        bytes32 assetKey = registry.assetKeyFor(externalId);
        bytes32 documentHash = sha256("demo-document-v1");
        bytes32 reviewEvidenceHash = sha256("review-evidence-v1");

        vm.prank(ISSUER);
        registry.registerAsset(externalId, uint64(block.timestamp + 30 days));
        _assertEq(uint256(registry.getAsset(assetKey).status), uint256(AssetRegistry.AssetStatus.Draft));

        vm.prank(ISSUER);
        uint32 version = registry.submitDocument(assetKey, keccak256("DISCLOSURE"), documentHash);
        _assertEq(version, 1);
        _assertEq(uint256(registry.getAsset(assetKey).status), uint256(AssetRegistry.AssetStatus.Review));

        vm.prank(REVIEWER);
        registry.reviewLatestDocument(assetKey, true, reviewEvidenceHash);
        _assertEq(uint256(registry.getAsset(assetKey).status), uint256(AssetRegistry.AssetStatus.Approved));
        _assertEq(uint256(registry.getDocument(assetKey, version).decision), uint256(AssetRegistry.ReviewDecision.Approved));

        vm.prank(ISSUER);
        registry.markDisclosed(assetKey);
        _assertEq(uint256(registry.getAsset(assetKey).status), uint256(AssetRegistry.AssetStatus.Disclosed));
    }

    function testUnauthorisedAccountCannotRegisterOrReview() external {
        AssetRegistry registry = new AssetRegistry(ISSUER, REVIEWER, AUDITOR);
        bytes32 assetKey = registry.assetKeyFor("demo-invoice-002");
        bytes32 documentHash = sha256("demo-document-v1");

        vm.prank(OUTSIDER);
        (bool registerSuccess,) = address(registry).call(
            abi.encodeCall(registry.registerAsset, ("demo-invoice-002", uint64(block.timestamp + 30 days)))
        );
        _assertFalse(registerSuccess);

        vm.prank(ISSUER);
        registry.registerAsset("demo-invoice-002", uint64(block.timestamp + 30 days));
        vm.prank(ISSUER);
        registry.submitDocument(assetKey, keccak256("DISCLOSURE"), documentHash);

        vm.prank(OUTSIDER);
        (bool reviewSuccess,) = address(registry).call(
            abi.encodeCall(registry.reviewLatestDocument, (assetKey, true, bytes32(0)))
        );
        _assertFalse(reviewSuccess);
    }

    function testRejectedDocumentReturnsAssetToDraftForResubmission() external {
        AssetRegistry registry = new AssetRegistry(ISSUER, REVIEWER, AUDITOR);
        bytes32 assetKey = registry.assetKeyFor("demo-building-003");
        bytes32 firstDocumentHash = sha256("demo-document-v1");
        bytes32 rejectionEvidenceHash = sha256("rejection-evidence-v1");
        bytes32 secondDocumentHash = sha256("demo-document-v2");

        vm.prank(ISSUER);
        registry.registerAsset("demo-building-003", uint64(block.timestamp + 30 days));
        vm.prank(ISSUER);
        registry.submitDocument(assetKey, keccak256("DISCLOSURE"), firstDocumentHash);
        vm.prank(REVIEWER);
        registry.reviewLatestDocument(assetKey, false, rejectionEvidenceHash);
        _assertEq(uint256(registry.getAsset(assetKey).status), uint256(AssetRegistry.AssetStatus.Draft));

        vm.prank(ISSUER);
        uint32 version = registry.submitDocument(assetKey, keccak256("DISCLOSURE"), secondDocumentHash);
        _assertEq(version, 2);
    }

    function _assertEq(uint256 actual, uint256 expected) private pure {
        require(actual == expected, "assertion failed");
    }

    function _assertFalse(bool value) private pure {
        require(!value, "assertion failed");
    }
}
