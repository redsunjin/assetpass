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

/**
 * The first screen is derived from verifiable application state. A missing
 * controller is never presented as an executable payment.
 */
export const JOURNEY_PHASES = Object.freeze(["prepare", "connect", "review", "execute", "receipt"]);

export function deriveJourney({ controllerAddress, account, policyRegistered, proposalStatus }) {
  if (!controllerAddress) return {
    id: "not-deployed", phase: "prepare", stateLabel: "테스트넷 준비 필요", title: "테스트넷 실행을 열기 전입니다.",
    copy: "잔액 부족을 감지해 보충 거래안을 만들 수 있지만, 실행 컨트랙트가 배포되기 전에는 어떤 지갑 송금도 열리지 않습니다.",
    primaryLabel: "준비 사항 보기", action: "deployment", setupRequired: true,
  };
  if (!account) return {
    id: "setup-required", phase: "connect", stateLabel: "자산 계정 연결 필요", title: "자산 계정을 먼저 연결하세요.",
    copy: "연결한 지갑의 GIWA 잔액과 정책을 확인한 뒤에만 거래안을 검토할 수 있습니다.",
    primaryLabel: "지갑 연결하기", action: "wallet", setupRequired: true,
  };
  if (!policyRegistered) return {
    id: "setup-required", phase: "connect", stateLabel: "통제 정책 등록 필요", title: "실행 전 통제 정책을 등록하세요.",
    copy: "허용된 수신 계정과 건당 한도가 온체인에 등록돼야 승인된 거래만 실행할 수 있습니다.",
    primaryLabel: "정책 등록하기", action: "policy", setupRequired: true,
  };
  if (proposalStatus === "executed") return {
    id: "execution-complete", phase: "receipt", stateLabel: "실행 완료", title: "실행 영수증을 확인하세요.",
    copy: "사람의 지갑이 승인한 거래만 제출됐습니다. GIWA Explorer에서 거래와 영수증을 대조할 수 있습니다.",
    primaryLabel: "영수증 보기", action: "receipt", setupRequired: false,
  };
  if (proposalStatus === "held") return {
    id: "approval-required", phase: "review", stateLabel: "거래안 보류", title: "보류한 거래안입니다.",
    copy: "자금은 이동하지 않았습니다. 다음 점검 결과를 보고 새 거래안을 검토할 수 있습니다.",
    primaryLabel: "지금 다시 점검", action: "watcher", setupRequired: false,
  };
  return {
    id: "approval-required", phase: "review", stateLabel: "승인 대기", title: "확인할 거래안 1건이 있습니다.",
    copy: "잔액 기준 미달로 만든 보충 거래안입니다. 수신자·금액·정책 통과 근거를 확인한 뒤에만 지갑으로 실행합니다.",
    primaryLabel: "거래안 검토하기", action: "proposal", setupRequired: false,
  };
}

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
