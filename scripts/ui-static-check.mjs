import { readFileSync } from "node:fs";

const files = {
  html: readFileSync("app/index.html", "utf8"),
  js: readFileSync("app/app.js", "utf8"),
  css: readFileSync("app/styles.css", "utf8"),
  config: readFileSync("app/config.js", "utf8"),
};

for (const [name, source] of Object.entries(files)) {
  if (!source.trim()) throw new Error(`UI file is empty: ${name}`);
}
for (const marker of ["eth_requestAccounts", "wallet_switchEthereumChain", "Asset Watcher", "Transaction Planner", "Proof Keeper", "Policy Guard", "AI transaction proposal", "지갑으로 실행", "controllerAddress"]) {
  if (!`${files.html}\n${files.js}`.includes(marker)) throw new Error(`UI flow missing: ${marker}`);
}
if (!files.config.includes("0x164ce") || !files.config.includes("sepolia-rpc.giwa.io")) {
  throw new Error("GIWA Sepolia network configuration is incomplete.");
}
console.log("Static Asset Passport UI checks passed.");
