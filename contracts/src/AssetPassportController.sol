// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AssetPassportController
/// @notice Demo-only policy gate for human-approved native-asset payments.
/// @dev An AI may create a proposal off-chain, but it never receives an execution key.
///      Only the owner wallet can execute an allowed payment. Do not use this minimal
///      controller for production custody; production deployments should integrate a Safe
///      or a reviewed multisig/account-abstraction policy layer.
contract AssetPassportController {
    struct PayeePolicy {
        bool allowed;
        uint96 maxAmount;
    }

    address public immutable owner;
    uint256 private unlocked = 1;
    mapping(address => PayeePolicy) public payeePolicies;
    mapping(bytes32 => bool) public executedProposals;

    error Unauthorized();
    error InvalidPayee();
    error InvalidAmount();
    error PayeeNotAllowed();
    error AmountExceedsPolicy();
    error ProposalAlreadyExecuted();
    error InvalidEvidenceHash();
    error TransferFailed();
    error Reentrancy();

    event PayeePolicyUpdated(address indexed payee, bool allowed, uint96 maxAmount);
    event Funded(address indexed funder, uint256 amount);
    event PaymentExecuted(
        bytes32 indexed proposalHash,
        bytes32 indexed policyHash,
        address indexed approver,
        address recipient,
        uint256 amount
    );

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert InvalidPayee();
        owner = initialOwner;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (unlocked != 1) revert Reentrancy();
        unlocked = 0;
        _;
        unlocked = 1;
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    function setPayeePolicy(address payee, bool allowed, uint96 maxAmount) external onlyOwner {
        if (payee == address(0)) revert InvalidPayee();
        if (allowed && maxAmount == 0) revert InvalidAmount();
        payeePolicies[payee] = PayeePolicy({allowed: allowed, maxAmount: maxAmount});
        emit PayeePolicyUpdated(payee, allowed, maxAmount);
    }

    /// @notice Executes exactly one owner-approved, policy-compliant payment.
    /// @param proposalHash Hash of the immutable off-chain AI proposal snapshot.
    /// @param policyHash Hash of the policy snapshot evaluated before execution.
    function executePayment(address payable recipient, uint256 amount, bytes32 proposalHash, bytes32 policyHash)
        external
        onlyOwner
        nonReentrant
    {
        if (recipient == address(0)) revert InvalidPayee();
        if (amount == 0) revert InvalidAmount();
        if (proposalHash == bytes32(0) || policyHash == bytes32(0)) revert InvalidEvidenceHash();
        if (executedProposals[proposalHash]) revert ProposalAlreadyExecuted();

        PayeePolicy memory policy = payeePolicies[recipient];
        if (!policy.allowed) revert PayeeNotAllowed();
        if (amount > policy.maxAmount) revert AmountExceedsPolicy();

        executedProposals[proposalHash] = true;
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit PaymentExecuted(proposalHash, policyHash, msg.sender, recipient, amount);
    }
}
