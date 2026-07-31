import { DEFAULT_POLICY, evaluateProposal, planTopUp, runAssetWatcher } from "../app/agent-engine.mjs";

const recipient = DEFAULT_POLICY.allowlistedPayees[0];
const finding = runAssetWatcher({ balanceEth: 0.0062 });
if (finding.status !== "finding" || finding.reason !== "minimum-balance-not-met") throw new Error("Watcher must detect a balance shortfall.");
const allowed = planTopUp({ finding, recipient, amountEth: 0.001, id: "test-topup" });
if (allowed.status !== "ready-for-human" || !allowed.policyResult.requiresHumanApproval) throw new Error("Planner must create a human-approved proposal.");
if (evaluateProposal({ recipient: "0x0000000000000000000000000000000000000001", amountEth: 0.001 }).allowed) throw new Error("Policy must reject a non-allowlisted payee.");
if (evaluateProposal({ recipient, amountEth: 0.006 }).allowed) throw new Error("Policy must reject an over-limit payment.");
if (runAssetWatcher({ balanceEth: 0.02 }).status !== "clear") throw new Error("Watcher must clear a sufficient balance.");
console.log("AssetOps agent engine scenarios passed.");
