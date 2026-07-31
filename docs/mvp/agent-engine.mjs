/**
 * Deterministic AssetOps agent primitives.
 * LLMs can explain a finding, but they do not decide a policy result or execute a payment.
 */
export const DEFAULT_POLICY = Object.freeze({
  minimumBalanceEth: 0.01,
  maxPaymentEth: 0.005,
  allowlistedPayees: ["0x8A45D58f4f9D774A50E33D4C34eEDC1C7aA13E19"],
  automaticExecution: false,
});

export function runAssetWatcher({ balanceEth, policy = DEFAULT_POLICY, scheduledPayouts = 0, pendingTransactions = 0 }) {
  const balanceBelowMinimum = Number(balanceEth) < Number(policy.minimumBalanceEth);
  return {
    agent: "asset-watcher",
    status: balanceBelowMinimum ? "finding" : "clear",
    severity: balanceBelowMinimum ? "warning" : "info",
    balanceEth: Number(balanceEth),
    scheduledPayouts: Number(scheduledPayouts),
    pendingTransactions: Number(pendingTransactions),
    reason: balanceBelowMinimum ? "minimum-balance-not-met" : "minimum-balance-met",
  };
}

export function planTopUp({ finding, recipient, amountEth, policy = DEFAULT_POLICY, id }) {
  if (finding?.status !== "finding") return { status: "not-needed", agent: "transaction-planner" };
  const proposal = { id, recipient, amountEth: Number(amountEth), reason: finding.reason, type: "top-up" };
  const policyResult = evaluateProposal(proposal, policy);
  return { agent: "transaction-planner", status: policyResult.allowed ? "ready-for-human" : "blocked", proposal, policyResult };
}

export function evaluateProposal(proposal, policy = DEFAULT_POLICY) {
  const recipientAllowed = policy.allowlistedPayees.map((value) => value.toLowerCase()).includes(String(proposal.recipient).toLowerCase());
  const withinLimit = Number(proposal.amountEth) > 0 && Number(proposal.amountEth) <= Number(policy.maxPaymentEth);
  return {
    allowed: recipientAllowed && withinLimit && policy.automaticExecution === false,
    recipientAllowed,
    withinLimit,
    requiresHumanApproval: policy.automaticExecution === false,
  };
}

export function createProofRecord({ proposalId, txHash, status }) {
  return { agent: "proof-keeper", proposalId, txHash, status, recordedAt: new Date().toISOString() };
}
