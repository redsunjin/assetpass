import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("data/agent-manifest.json", "utf8"));
const expected = {
  "asset-watcher": "observe",
  "transaction-planner": "propose",
  "proof-keeper": "verify",
};

if (manifest.executionRule !== "AI may propose and verify; only a connected human wallet may execute.") {
  throw new Error("Agent execution boundary must require a connected human wallet.");
}
if (manifest.policy.automaticExecution !== false) throw new Error("Automatic execution must stay disabled.");
if (!(manifest.policy.minimumBalanceEth > 0 && manifest.policy.maxPaymentEth > 0)) throw new Error("Agent policy requires positive limits.");
for (const [id, authority] of Object.entries(expected)) {
  const agent = manifest.agents.find((entry) => entry.id === id);
  if (!agent || agent.authority !== authority || !agent.cadence || !agent.inputs?.length || !agent.outputs?.length) {
    throw new Error(`Agent manifest is incomplete: ${id}`);
  }
}
console.log("AssetOps agent manifest and execution boundary checks passed.");
