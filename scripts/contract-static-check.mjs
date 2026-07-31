import { readFileSync } from "node:fs";

const source = readFileSync("contracts/src/AssetRegistry.sol", "utf8");
const controller = readFileSync("contracts/src/AssetPassportController.sol", "utf8");
const requiredMarkers = [
  "pragma solidity ^0.8.24;",
  "contract AssetRegistry",
  "function registerAsset",
  "function submitDocument",
  "function reviewLatestDocument",
  "function markDisclosed",
  "function attestDocument",
  "event AssetRegistered",
  "event DocumentSubmitted",
  "event DocumentReviewed",
  "event AssetStatusChanged",
  "mapping(bytes32 => Asset) private assets",
  "onlyIssuer",
  "onlyReviewer",
  "onlyAuditor",
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) throw new Error(`AssetRegistry missing: ${marker}`);
}

if (/\b(payable|transfer\(|send\(|selfdestruct\b|delegatecall\b)/.test(source)) {
  throw new Error("AssetRegistry must remain an evidence-only contract and cannot handle value or delegated execution.");
}

console.log("AssetRegistry static safety and interface checks passed.");

for (const marker of [
  "pragma solidity ^0.8.24;",
  "contract AssetPassportController",
  "function setPayeePolicy",
  "function executePayment",
  "event PaymentExecuted",
  "onlyOwner",
  "nonReentrant",
  "executedProposals[proposalHash] = true",
  "amount > policy.maxAmount",
]) {
  if (!controller.includes(marker)) throw new Error(`AssetPassportController missing: ${marker}`);
}
if (/delegatecall|selfdestruct/.test(controller)) {
  throw new Error("AssetPassportController cannot delegate execution or self-destruct.");
}
console.log("AssetPassportController static policy-gate checks passed.");
