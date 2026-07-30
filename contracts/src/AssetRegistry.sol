// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AssetRegistry
/// @notice Minimal on-chain evidence registry for demo-only, fictional assets.
/// @dev Stores identifiers and document hashes only. It must never receive or move funds.
contract AssetRegistry {
    enum AssetStatus {
        Draft,
        Review,
        Approved,
        Disclosed,
        Suspended,
        Archived
    }

    enum ReviewDecision {
        Pending,
        Approved,
        Rejected
    }

    struct Asset {
        string externalId;
        address issuer;
        AssetStatus status;
        uint64 createdAt;
        uint64 updatedAt;
        uint64 disclosureDueAt;
        uint32 latestDocumentVersion;
        bytes32 latestDocumentHash;
        bool exists;
    }

    struct DocumentVersion {
        bytes32 documentTypeHash;
        bytes32 contentHash;
        address submittedBy;
        uint64 submittedAt;
        ReviewDecision decision;
        address reviewer;
        uint64 reviewedAt;
        bytes32 reviewEvidenceHash;
    }

    address public immutable admin;
    mapping(address => bool) public issuers;
    mapping(address => bool) public reviewers;
    mapping(address => bool) public auditors;
    mapping(bytes32 => Asset) private assets;
    mapping(bytes32 => mapping(uint32 => DocumentVersion)) private documents;

    error Unauthorized();
    error AssetAlreadyExists();
    error AssetNotFound();
    error InvalidAssetId();
    error InvalidDocumentHash();
    error InvalidDocumentType();
    error InvalidDisclosureDueAt();
    error InvalidStatus();
    error DocumentNotFound();
    error DocumentAlreadyReviewed();
    error NotLatestDocument();

    event RoleUpdated(address indexed account, bytes32 indexed role, bool enabled);
    event AssetRegistered(bytes32 indexed assetKey, string externalId, address indexed issuer, uint64 disclosureDueAt);
    event DocumentSubmitted(
        bytes32 indexed assetKey,
        uint32 indexed version,
        bytes32 indexed contentHash,
        bytes32 documentTypeHash,
        address submittedBy
    );
    event DocumentReviewed(
        bytes32 indexed assetKey,
        uint32 indexed version,
        ReviewDecision decision,
        address indexed reviewer,
        bytes32 reviewEvidenceHash
    );
    event AuditorAttested(
        bytes32 indexed assetKey, uint32 indexed version, address indexed auditor, bytes32 evidenceHash
    );
    event AssetStatusChanged(
        bytes32 indexed assetKey, AssetStatus previousStatus, AssetStatus newStatus, address indexed changedBy
    );

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    constructor(address initialIssuer, address initialReviewer, address initialAuditor) {
        admin = msg.sender;
        _setRole(initialIssuer, ISSUER_ROLE, true);
        _setRole(initialReviewer, REVIEWER_ROLE, true);
        _setRole(initialAuditor, AUDITOR_ROLE, true);
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier onlyIssuer() {
        if (!issuers[msg.sender]) revert Unauthorized();
        _;
    }

    modifier onlyReviewer() {
        if (!reviewers[msg.sender]) revert Unauthorized();
        _;
    }

    modifier onlyAuditor() {
        if (!auditors[msg.sender]) revert Unauthorized();
        _;
    }

    function setIssuer(address account, bool enabled) external onlyAdmin {
        _setRole(account, ISSUER_ROLE, enabled);
    }

    function setReviewer(address account, bool enabled) external onlyAdmin {
        _setRole(account, REVIEWER_ROLE, enabled);
    }

    function setAuditor(address account, bool enabled) external onlyAdmin {
        _setRole(account, AUDITOR_ROLE, enabled);
    }

    function registerAsset(string calldata externalId, uint64 disclosureDueAt) external onlyIssuer returns (bytes32 assetKey) {
        if (bytes(externalId).length == 0) revert InvalidAssetId();
        if (disclosureDueAt <= block.timestamp) revert InvalidDisclosureDueAt();

        assetKey = assetKeyFor(externalId);
        if (assets[assetKey].exists) revert AssetAlreadyExists();

        assets[assetKey] = Asset({
            externalId: externalId,
            issuer: msg.sender,
            status: AssetStatus.Draft,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            disclosureDueAt: disclosureDueAt,
            latestDocumentVersion: 0,
            latestDocumentHash: bytes32(0),
            exists: true
        });

        emit AssetRegistered(assetKey, externalId, msg.sender, disclosureDueAt);
    }

    function submitDocument(bytes32 assetKey, bytes32 documentTypeHash, bytes32 contentHash) external onlyIssuer returns (uint32 version) {
        Asset storage asset = _asset(assetKey);
        if (asset.issuer != msg.sender) revert Unauthorized();
        if (asset.status == AssetStatus.Suspended || asset.status == AssetStatus.Archived) revert InvalidStatus();
        if (documentTypeHash == bytes32(0)) revert InvalidDocumentType();
        if (contentHash == bytes32(0)) revert InvalidDocumentHash();

        version = asset.latestDocumentVersion + 1;
        asset.latestDocumentVersion = version;
        asset.latestDocumentHash = contentHash;
        documents[assetKey][version] = DocumentVersion({
            documentTypeHash: documentTypeHash,
            contentHash: contentHash,
            submittedBy: msg.sender,
            submittedAt: uint64(block.timestamp),
            decision: ReviewDecision.Pending,
            reviewer: address(0),
            reviewedAt: 0,
            reviewEvidenceHash: bytes32(0)
        });

        _setStatus(assetKey, asset, AssetStatus.Review);
        emit DocumentSubmitted(assetKey, version, contentHash, documentTypeHash, msg.sender);
    }

    function reviewLatestDocument(bytes32 assetKey, bool approved, bytes32 reviewEvidenceHash) external onlyReviewer {
        Asset storage asset = _asset(assetKey);
        if (asset.status != AssetStatus.Review) revert InvalidStatus();
        uint32 version = asset.latestDocumentVersion;
        DocumentVersion storage document = documents[assetKey][version];
        if (document.submittedAt == 0) revert DocumentNotFound();
        if (document.decision != ReviewDecision.Pending) revert DocumentAlreadyReviewed();

        document.decision = approved ? ReviewDecision.Approved : ReviewDecision.Rejected;
        document.reviewer = msg.sender;
        document.reviewedAt = uint64(block.timestamp);
        document.reviewEvidenceHash = reviewEvidenceHash;
        _setStatus(assetKey, asset, approved ? AssetStatus.Approved : AssetStatus.Draft);
        emit DocumentReviewed(assetKey, version, document.decision, msg.sender, reviewEvidenceHash);
    }

    function markDisclosed(bytes32 assetKey) external onlyIssuer {
        Asset storage asset = _asset(assetKey);
        if (asset.issuer != msg.sender) revert Unauthorized();
        if (asset.status != AssetStatus.Approved) revert InvalidStatus();
        if (documents[assetKey][asset.latestDocumentVersion].decision != ReviewDecision.Approved) revert NotLatestDocument();
        _setStatus(assetKey, asset, AssetStatus.Disclosed);
    }

    function suspendAsset(bytes32 assetKey) external onlyAdmin {
        Asset storage asset = _asset(assetKey);
        if (asset.status == AssetStatus.Archived) revert InvalidStatus();
        _setStatus(assetKey, asset, AssetStatus.Suspended);
    }

    function archiveAsset(bytes32 assetKey) external onlyAdmin {
        Asset storage asset = _asset(assetKey);
        if (asset.status != AssetStatus.Suspended) revert InvalidStatus();
        _setStatus(assetKey, asset, AssetStatus.Archived);
    }

    function attestDocument(bytes32 assetKey, uint32 version, bytes32 evidenceHash) external onlyAuditor {
        _asset(assetKey);
        if (documents[assetKey][version].submittedAt == 0) revert DocumentNotFound();
        emit AuditorAttested(assetKey, version, msg.sender, evidenceHash);
    }

    function assetKeyFor(string memory externalId) public pure returns (bytes32) {
        return keccak256(bytes(externalId));
    }

    function getAsset(bytes32 assetKey) external view returns (Asset memory) {
        return _asset(assetKey);
    }

    function getDocument(bytes32 assetKey, uint32 version) external view returns (DocumentVersion memory) {
        _asset(assetKey);
        DocumentVersion memory document = documents[assetKey][version];
        if (document.submittedAt == 0) revert DocumentNotFound();
        return document;
    }

    function _asset(bytes32 assetKey) private view returns (Asset storage asset) {
        asset = assets[assetKey];
        if (!asset.exists) revert AssetNotFound();
    }

    function _setStatus(bytes32 assetKey, Asset storage asset, AssetStatus nextStatus) private {
        AssetStatus previousStatus = asset.status;
        asset.status = nextStatus;
        asset.updatedAt = uint64(block.timestamp);
        emit AssetStatusChanged(assetKey, previousStatus, nextStatus, msg.sender);
    }

    function _setRole(address account, bytes32 role, bool enabled) private {
        if (account == address(0)) return;
        if (role == ISSUER_ROLE) issuers[account] = enabled;
        else if (role == REVIEWER_ROLE) reviewers[account] = enabled;
        else if (role == AUDITOR_ROLE) auditors[account] = enabled;
        else revert Unauthorized();
        emit RoleUpdated(account, role, enabled);
    }
}
