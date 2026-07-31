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
for (const marker of ["eth_requestAccounts", "wallet_switchEthereumChain", "eth_sendTransaction", "executePayment(address,uint256,bytes32,bytes32)", "setPayeePolicy(address,bool,uint96)", "Asset Watcher", "Transaction Planner", "Proof Keeper", "Policy Guard", "지갑으로 실행", "controllerAddress", "agent-engine.mjs", "공급자 주소", "테스트넷 준비 필요", "실행을 열기 전 준비", "GIWA Explorer에서 거래 확인", "data-journey-phase", "deriveJourney", "사람이 승인하지 않은 거래는 실행되지 않도록 한다"]) {
  if (!`${files.html}\n${files.js}`.includes(marker)) throw new Error(`UI flow missing: ${marker}`);
}
if (!files.config.includes("0x164ce") || !files.config.includes("sepolia-rpc.giwa.io")) {
  throw new Error("GIWA Sepolia network configuration is incomplete.");
}
console.log("Static Asset Passport UI checks passed.");
