import { deriveJourney } from "../app/agent-engine.mjs";

const controller = "0x1111111111111111111111111111111111111111";
const account = "0x2222222222222222222222222222222222222222";
const otherAccount = "0x3333333333333333333333333333333333333333";

const cases = [
  [{ controllerAddress: "", account: null, policyRegistered: false, proposalStatus: "pending" }, "not-deployed", "prepare", "deployment"],
  [{ controllerAddress: controller, account: null, policyRegistered: false, proposalStatus: "pending" }, "setup-required", "connect", "wallet"],
  [{ controllerAddress: controller, account: otherAccount, controllerOwner: account, policyRegistered: false, proposalStatus: "pending" }, "owner-required", "connect", "wallet"],
  [{ controllerAddress: controller, account, policyRegistered: false, proposalStatus: "pending" }, "setup-required", "connect", "policy"],
  [{ controllerAddress: controller, account, policyRegistered: true, proposalStatus: "pending" }, "approval-required", "review", "proposal"],
  [{ controllerAddress: controller, account, policyRegistered: true, proposalStatus: "executed" }, "execution-complete", "receipt", "receipt"],
];

for (const [input, id, phase, action] of cases) {
  const result = deriveJourney(input);
  if (result.id !== id || result.phase !== phase || result.action !== action) {
    throw new Error(`Journey state mismatch for ${JSON.stringify(input)}: ${JSON.stringify(result)}`);
  }
}

console.log("AssetOps user-journey state scenarios passed.");
