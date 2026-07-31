import { DEFAULT_POLICY, planTopUp, runAssetWatcher } from "./agent-engine.mjs";

const config = window.ASSET_PASSPORT_CONFIG;
const DEMO_BALANCE = 0.0062;
const MIN_BALANCE = DEFAULT_POLICY.minimumBalanceEth;
const PROPOSAL = { amountEth: 0.001, recipient: "0x8A45D58f4f9D774A50E33D4C34eEDC1C7aA13E19", id: "gas-topup-20260731-001" };
const state = { account: null, balance: DEMO_BALANCE, proposal: "pending", aiProvider: localStorage.getItem("asset-passport-ai-provider") || "rules" };
const $ = (selector) => document.querySelector(selector);
const shortAddress = (value) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const formatEth = (value) => `${Number(value).toFixed(4)} ETH`;

function setResult(selector, text, tone = "") {
  const node = $(selector); node.textContent = text; node.className = `result ${tone}`;
}
function setView(view) {
  $(".shell").dataset.view = view;
  document.querySelectorAll(".view-tab").forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active); tab.setAttribute("aria-pressed", String(active));
  });
}
function renderAccount() {
  const connected = Boolean(state.account);
  $("#wallet-state").textContent = connected ? "연결됨" : "연결 전";
  $("#account-address").textContent = connected ? state.account : "지갑을 연결하면 실제 잔액을 확인합니다";
  $("#settings-account").textContent = connected ? state.account : "연결 전";
  $("#network-name").textContent = connected ? config.chain.chainName : "GIWA Sepolia 확인 전";
  $("#controller-address").textContent = config.controllerAddress || "테스트넷 배포 전";
  $("#wallet-balance").textContent = formatEth(state.balance);
  const percent = Math.min(100, Math.round((state.balance / MIN_BALANCE) * 100));
  $("#balance-meter").style.width = `${percent}%`;
}
function renderProposal() {
  const isPending = state.proposal === "pending";
  const isHeld = state.proposal === "held";
  $("#proposal-state").textContent = isPending ? "승인 필요" : isHeld ? "보류" : "실행 완료";
  $("#proposal-state").className = `chip ${isPending ? "warning" : isHeld ? "" : "success"}`;
  $("#hero-state").textContent = isPending ? "승인 대기" : isHeld ? "보류됨" : "실행 완료";
  $("#hero-state").className = `state ${isPending ? "waiting" : isHeld ? "hold" : "ready"}`;
  $("#proposal-count").textContent = isPending ? "1" : "0";
  $("#approve-proposal").disabled = !isPending;
  $("#reject-proposal").disabled = !isPending;
}
async function connectWallet() {
  if (!window.ethereum) { setResult("#proposal-result", "브라우저 지갑을 찾지 못했습니다. MetaMask 등 EVM 지갑이 필요합니다.", "error"); return; }
  try {
    const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
    try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: config.chain.chainId }] }); }
    catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [config.chain] });
    }
    state.account = account;
    const hexBalance = await window.ethereum.request({ method: "eth_getBalance", params: [account, "latest"] });
    state.balance = Number(BigInt(hexBalance)) / 1e18;
    renderAccount(); setResult("#proposal-result", "GIWA Sepolia 지갑을 연결했습니다. 실제 잔액을 다시 점검할 수 있습니다.", "success");
  } catch (error) { setResult("#proposal-result", `지갑 연결을 완료하지 못했습니다: ${error.message || error}`, "error"); }
}
function runWatcher() {
  const now = new Date();
  $("#last-scan").textContent = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} 점검`;
  const finding = runAssetWatcher({ balanceEth: state.balance });
  const planned = planTopUp({ finding, recipient: PROPOSAL.recipient, amountEth: PROPOSAL.amountEth, id: PROPOSAL.id });
  const low = finding.status === "finding";
  $("#watcher-status").textContent = low ? "수수료용 잔액이 설정 기준 아래입니다." : "잔액이 정책 기준을 충족합니다.";
  $("#balance-note").textContent = low ? "잔액이 기준보다 낮아 AI가 보충 거래를 제안했습니다." : "잔액이 기준을 충족해 새 보충 거래가 필요하지 않습니다.";
  if (planned.status === "ready-for-human") {
    state.proposal = "pending"; renderProposal();
    setResult("#proposal-result", "Asset Watcher가 부족을 감지했고, Transaction Planner가 정책 통과 거래안을 다시 만들었습니다.", "success");
  } else if (state.proposal === "pending") { state.proposal = "held"; renderProposal(); setResult("#proposal-result", "현재 잔액이 기준을 충족하므로 기존 보충 제안을 보류했습니다.", "success"); }
}
function proposalHash() {
  return `0x${Array.from(new TextEncoder().encode(`${PROPOSAL.id}:${PROPOSAL.recipient}:${PROPOSAL.amountEth}`)).map((n) => n.toString(16).padStart(2, "0")).join("").padEnd(64, "0").slice(0, 64)}`;
}
async function approveProposal() {
  if (!state.account) { await connectWallet(); if (!state.account) return; }
  if (!config.controllerAddress) {
    setResult("#proposal-result", "실행 컨트랙트가 아직 배포·연결되지 않았습니다. 이 데모는 거래안·정책 검사까지 제공하며, 실제 자금 실행은 테스트넷 배포 뒤에만 열립니다.", "error");
    return;
  }
  setResult("#proposal-result", "지갑에서 거래 내용을 확인하세요. AI는 이 거래를 실행할 권한이 없습니다.");
  // executePayment(address,uint256,bytes32,bytes32) is intentionally called only by the connected wallet.
  // The controller address remains empty until the tested GIWA deployment is recorded in config.js.
}
function holdProposal() {
  state.proposal = "held"; renderProposal(); setResult("#proposal-result", "제안을 보류했습니다. 자금은 이동하지 않았고, 다음 Watcher 점검에서 다시 판단합니다.", "success");
  $("#hero-copy").textContent = "보류된 거래안입니다. 정기 점검에서 자산 상태가 다시 기준 아래인지 확인합니다.";
}
function saveAiSettings() {
  const provider = $("#ai-provider").value; const model = $("#ai-model").value.trim(); const endpoint = $("#ai-endpoint").value.trim();
  if (provider === "ollama" && endpoint && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(endpoint)) {
    setResult("#ai-settings-result", "로컬 Ollama는 localhost 또는 127.0.0.1 주소만 등록할 수 있습니다.", "error"); return;
  }
  if (provider === "relay" && endpoint && !/^https:\/\//.test(endpoint)) {
    setResult("#ai-settings-result", "외부 AI는 브라우저 키를 쓰지 않는 HTTPS 보안 릴레이만 등록할 수 있습니다.", "error"); return;
  }
  localStorage.setItem("asset-passport-ai-provider", provider); localStorage.setItem("asset-passport-ai-model", model); localStorage.setItem("asset-passport-ai-endpoint", endpoint); state.aiProvider = provider;
  setResult("#ai-settings-result", `${$("#ai-provider").selectedOptions[0].textContent}${model ? ` · ${model}` : ""} 설정을 이 브라우저에 저장했습니다. AI는 제안·설명만 수행합니다.`, "success");
}
async function testAiConnection() {
  const provider = $("#ai-provider").value; const endpoint = $("#ai-endpoint").value.trim().replace(/\/$/, "");
  if (provider === "rules") { setResult("#ai-settings-result", "내장 규칙 엔진은 브라우저 안에서 동작합니다. 별도 네트워크 연결이 필요 없습니다.", "success"); return; }
  if (!endpoint) { setResult("#ai-settings-result", "먼저 AI 공급자 주소를 입력하세요.", "error"); return; }
  try {
    const url = provider === "ollama" ? `${endpoint}/api/tags` : endpoint;
    const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setResult("#ai-settings-result", "공급자 연결을 확인했습니다. 실제 제안 실행 전에도 정책 엔진과 사람 승인은 별도로 유지됩니다.", "success");
  } catch (error) { setResult("#ai-settings-result", `공급자 연결을 확인하지 못했습니다: ${error.message || error}`, "error"); }
}
function openSetup(section) {
  setView("settings");
  const target = section === "wallet" ? $("#settings-wallet-button") : section === "policy" ? $("#policy-settings") : $("#ai-settings");
  target?.scrollIntoView({ behavior: "smooth", block: "start" }); target?.focus?.({ preventScroll: true });
}
function initialize() {
  $("#proposal-amount").textContent = `${PROPOSAL.amountEth.toFixed(4)} Test ETH`;
  $("#proposal-recipient").textContent = shortAddress(PROPOSAL.recipient);
  $("#ai-provider").value = state.aiProvider; $("#ai-model").value = localStorage.getItem("asset-passport-ai-model") || ""; $("#ai-endpoint").value = localStorage.getItem("asset-passport-ai-endpoint") || "";
  renderAccount(); renderProposal();
  document.querySelectorAll(".view-tab").forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
  ["#wallet-button", "#settings-wallet-button"].forEach((selector) => $(selector).addEventListener("click", connectWallet));
  ["#run-watcher", "#watcher-run"].forEach((selector) => $(selector).addEventListener("click", runWatcher));
  $("#open-proposal").addEventListener("click", () => $("#proposal-card").scrollIntoView({ behavior: "smooth", block: "center" }));
  $("#approve-proposal").addEventListener("click", approveProposal); $("#reject-proposal").addEventListener("click", holdProposal); $("#save-ai-settings").addEventListener("click", saveAiSettings); $("#test-ai-connection").addEventListener("click", testAiConnection);
  document.querySelectorAll(".setup-link").forEach((button) => button.addEventListener("click", () => openSetup(button.dataset.setup)));
  window.ethereum?.on?.("accountsChanged", ([account]) => { state.account = account || null; renderAccount(); });
}
initialize();
