import { DEFAULT_POLICY, JOURNEY_PHASES, deriveJourney, planTopUp, runAssetWatcher } from "./agent-engine.mjs";

const config = window.ASSET_PASSPORT_CONFIG;
const DEMO_BALANCE = 0.0062;
const MIN_BALANCE = DEFAULT_POLICY.minimumBalanceEth;
const PROPOSAL = { amountEth: 0.001, recipient: "0x8A45D58f4f9D774A50E33D4C34eEDC1C7aA13E19", id: "gas-topup-20260731-002" };
const state = { account: null, controllerOwner: null, balance: DEMO_BALANCE, proposal: "pending", policyRegistered: false, aiProvider: localStorage.getItem("asset-passport-ai-provider") || "rules" };
const $ = (selector) => document.querySelector(selector);
const shortAddress = (value) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const formatEth = (value) => `${Number(value).toFixed(4)} ETH`;
const CONTROLLER_CALLS = Object.freeze({
  // executePayment(address,uint256,bytes32,bytes32)
  executePayment: "0x28565f9e",
  // setPayeePolicy(address,bool,uint96)
  setPayeePolicy: "0x8e20dd4f",
  // payeePolicies(address)
  payeePolicies: "0x2eb172d7",
  // owner()
  owner: "0x8da5cb5b",
});

function word(value) { return String(value).replace(/^0x/, "").padStart(64, "0"); }
function addressWord(value) { return word(String(value).toLowerCase()); }
function uintWord(value) { return word(BigInt(value).toString(16)); }
function boolWord(value) { return word(value ? "1" : "0"); }
function encodeCall(selector, values) { return `${selector}${values.join("")}`; }
function toWei(eth) { return BigInt(Math.round(Number(eth) * 1e18)); }
function explorerTxUrl(txHash) { return `${config.chain.blockExplorerUrls[0].replace(/\/$/, "")}/tx/${txHash}`; }
function isControllerOwner() { return Boolean(state.account && state.controllerOwner && state.account.toLowerCase() === state.controllerOwner.toLowerCase()); }
async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

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
function currentJourney() {
  return deriveJourney({
    controllerAddress: config.controllerAddress,
    account: state.account,
    controllerOwner: state.controllerOwner,
    policyRegistered: state.policyRegistered,
    proposalStatus: state.proposal,
  });
}
function scrollTo(target, block = "start") {
  target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block });
}
function renderJourney() {
  const journey = currentJourney();
  const phaseIndex = JOURNEY_PHASES.indexOf(journey.phase);
  $("#hero-state").textContent = journey.stateLabel;
  $("#hero-state").className = `state ${journey.id === "execution-complete" ? "ready" : journey.action === "watcher" ? "hold" : "waiting"}`;
  $("#hero-title").textContent = journey.title;
  $("#hero-copy").textContent = journey.copy;
  $("#hero-primary-action").textContent = journey.primaryLabel;
  $("#onboarding").hidden = !journey.setupRequired;
  document.querySelectorAll("[data-journey-phase]").forEach((step) => {
    const stepIndex = JOURNEY_PHASES.indexOf(step.dataset.journeyPhase);
    step.classList.toggle("complete", stepIndex < phaseIndex);
    step.classList.toggle("current", stepIndex === phaseIndex);
    step.setAttribute("aria-current", stepIndex === phaseIndex ? "step" : "false");
  });
}
function handleJourneyAction() {
  const journey = currentJourney();
  if (journey.action === "proposal") { scrollTo($("#proposal-card"), "center"); return; }
  if (journey.action === "receipt") { scrollTo($(".receipt"), "center"); return; }
  if (journey.action === "watcher") { runWatcher(); return; }
  openSetup(journey.action);
}
function renderAccount() {
  const connected = Boolean(state.account);
  $("#wallet-state").textContent = connected ? "연결됨" : "연결 전";
  $("#account-address").textContent = connected ? state.account : "지갑을 연결하면 실제 잔액을 확인합니다";
  $("#settings-account").textContent = connected ? state.account : "연결 전";
  $("#network-name").textContent = connected ? config.chain.chainName : "GIWA Sepolia 확인 전";
  $("#controller-address").textContent = config.controllerAddress || "연결 전";
  $("#controller-owner").textContent = state.controllerOwner
    ? isControllerOwner() ? "현재 연결 지갑" : `승인 지갑 ${shortAddress(state.controllerOwner)}`
    : "연결 후 조회";
  $("#wallet-balance").textContent = formatEth(state.balance);
  const percent = Math.min(100, Math.round((state.balance / MIN_BALANCE) * 100));
  $("#balance-meter").style.width = `${percent}%`;
}
function renderProposal() {
  const journey = currentJourney();
  const isPending = state.proposal === "pending";
  const isHeld = state.proposal === "held";
  $("#proposal-state").textContent = journey.stateLabel;
  $("#proposal-state").className = `chip ${journey.id === "execution-complete" ? "success" : journey.action === "watcher" ? "" : "warning"}`;
  $("#proposal-count").textContent = isPending ? "1" : "0";
  $("#approve-proposal").textContent = journey.action === "proposal" ? "내용 확인 후 지갑으로 실행" : journey.primaryLabel;
  $("#approve-proposal").disabled = false;
  $("#reject-proposal").hidden = journey.action !== "proposal";
  $("#reject-proposal").disabled = !isPending;
  const policyReady = Boolean(config.controllerAddress && state.policyRegistered);
  $("#policy-check-state").textContent = policyReady ? "Policy Guard · 정책 검사 통과" : "Policy Guard · 실행 전 점검";
  $("#policy-check-detail").textContent = policyReady
    ? "승인된 수신 계정 · 건당 한도 0.005 ETH 충족"
    : "컨트랙트 연결과 정책 등록 전에는 온체인 정책을 검증하지 않습니다.";
  renderJourney();
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
    await refreshControllerOwner();
    renderAccount(); await refreshOnchainPolicy(); renderProposal();
    setResult("#proposal-result", isControllerOwner()
      ? "GIWA Sepolia 승인 지갑을 연결했습니다. 실제 잔액과 온체인 정책을 다시 점검할 수 있습니다."
      : "GIWA Sepolia 지갑을 연결했습니다. 이 컨트랙트는 등록된 승인 지갑만 정책 등록과 거래 실행을 할 수 있습니다.", "success");
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
function policySnapshot() {
  return JSON.stringify({
    payee: PROPOSAL.recipient.toLowerCase(),
    maximumAmountWei: toWei(DEFAULT_POLICY.maxPaymentEth).toString(),
    automaticExecution: DEFAULT_POLICY.automaticExecution,
  });
}
function proposalSnapshot() {
  return JSON.stringify({
    id: PROPOSAL.id,
    recipient: PROPOSAL.recipient.toLowerCase(),
    amountWei: toWei(PROPOSAL.amountEth).toString(),
    reason: "minimum-balance-not-met",
  });
}
async function waitForReceipt(txHash) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const receipt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] });
    if (receipt?.blockNumber) return receipt;
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }
  return null;
}
function renderReceipt(txHash, receipt) {
  const explorer = $("#receipt-explorer");
  $("#receipt-state").textContent = receipt?.status === "0x1" ? "실행 확인" : "지갑 제출됨";
  $("#receipt-state").className = "chip success";
  $("#execution-time").textContent = new Date().toTimeString().slice(0, 5);
  $("#execution-title").textContent = receipt?.status === "0x1" ? "지갑 승인 거래 실행 확인" : "지갑이 거래를 제출함";
  $("#execution-detail").textContent = receipt?.status === "0x1"
    ? "Proof Keeper가 GIWA 영수증을 확인했습니다. 제안·정책 해시와 실제 실행을 Explorer에서 대조할 수 있습니다."
    : "네트워크 확인을 기다리고 있습니다. Explorer에서 tx hash와 실행 결과를 직접 대조할 수 있습니다.";
  explorer.href = explorerTxUrl(txHash); explorer.hidden = false;
  $("#proof-status").textContent = receipt?.status === "0x1" ? "GIWA 실행 영수증을 확인했습니다." : "GIWA 거래 제출 후 영수증을 기다립니다.";
}
async function refreshOnchainPolicy() {
  if (!state.account || !config.controllerAddress || !window.ethereum) {
    state.policyRegistered = false;
    renderJourney();
    return;
  }
  try {
    const data = encodeCall(CONTROLLER_CALLS.payeePolicies, [addressWord(PROPOSAL.recipient)]);
    const result = await window.ethereum.request({ method: "eth_call", params: [{ to: config.controllerAddress, data }, "latest"] });
    const allowed = BigInt(`0x${result.slice(2, 66)}`) === 1n;
    const maxAmount = BigInt(`0x${result.slice(66, 130)}`);
    state.policyRegistered = allowed && isControllerOwner();
    $("#policy-contract-state").textContent = !allowed ? "수신 계정 등록 필요"
      : !isControllerOwner() ? "등록됨 · 승인 지갑 연결 필요"
      : `등록됨 · ${formatEth(Number(maxAmount) / 1e18)}`;
  } catch {
    state.policyRegistered = false;
    $("#policy-contract-state").textContent = "온체인 정책 조회 실패";
  }
  renderProposal();
}
async function refreshControllerOwner() {
  if (!config.controllerAddress || !window.ethereum) { state.controllerOwner = null; return; }
  try {
    const result = await window.ethereum.request({ method: "eth_call", params: [{ to: config.controllerAddress, data: CONTROLLER_CALLS.owner }, "latest"] });
    state.controllerOwner = `0x${result.slice(-40)}`;
  } catch {
    state.controllerOwner = null;
  }
}
async function registerPolicy() {
  if (!state.account) { await connectWallet(); if (!state.account) return; }
  if (!config.controllerAddress) { setResult("#policy-result", "실행 컨트랙트를 GIWA Sepolia에 배포·연결한 뒤 정책을 등록할 수 있습니다.", "error"); return; }
  if (!isControllerOwner()) { setResult("#policy-result", "등록된 Controller owner 지갑으로 바꾼 뒤 정책을 등록하세요.", "error"); return; }
  const data = encodeCall(CONTROLLER_CALLS.setPayeePolicy, [addressWord(PROPOSAL.recipient), boolWord(true), uintWord(toWei(DEFAULT_POLICY.maxPaymentEth))]);
  try {
    setResult("#policy-result", "지갑에서 수신 계정과 0.005 Test ETH 한도를 확인하세요.");
    const txHash = await window.ethereum.request({ method: "eth_sendTransaction", params: [{ from: state.account, to: config.controllerAddress, data }] });
    const receipt = await waitForReceipt(txHash);
    if (receipt?.status === "0x0") throw new Error("정책 등록 거래가 체인에서 실패했습니다.");
    await refreshOnchainPolicy(); renderProposal();
    setResult("#policy-result", `정책 등록 거래를 제출했습니다. ${receipt ? "GIWA에서 확인됐습니다." : "Explorer에서 확인하세요."}`, "success");
  } catch (error) { setResult("#policy-result", `정책 등록을 완료하지 못했습니다: ${error.message || error}`, "error"); }
}
async function approveProposal() {
  if (!state.account) { await connectWallet(); if (!state.account) return; }
  if (!config.controllerAddress) {
    setResult("#proposal-result", "이 화면에서 실행 컨트랙트 주소를 찾지 못했습니다. 주소를 확인하기 전에는 거래를 실행하지 않습니다.", "error");
    return;
  }
  if (!isControllerOwner()) { setResult("#proposal-result", "등록된 Controller owner 지갑만 이 거래를 실행할 수 있습니다. 지갑 계정을 확인하세요.", "error"); return; }
  const finding = runAssetWatcher({ balanceEth: state.balance });
  const planned = planTopUp({ finding, recipient: PROPOSAL.recipient, amountEth: PROPOSAL.amountEth, id: PROPOSAL.id });
  if (planned.status !== "ready-for-human") { setResult("#proposal-result", "현재 제안은 정책 검사를 통과하지 않아 실행하지 않았습니다.", "error"); return; }
  try {
    const [immutableProposalHash, immutablePolicyHash] = await Promise.all([sha256Hex(proposalSnapshot()), sha256Hex(policySnapshot())]);
    const data = encodeCall(CONTROLLER_CALLS.executePayment, [addressWord(PROPOSAL.recipient), uintWord(toWei(PROPOSAL.amountEth)), word(immutableProposalHash), word(immutablePolicyHash)]);
    setResult("#proposal-result", "지갑에서 수신자·금액·네트워크 수수료를 확인하세요. AI는 이 거래를 실행할 권한이 없습니다.");
    const txHash = await window.ethereum.request({ method: "eth_sendTransaction", params: [{ from: state.account, to: config.controllerAddress, data }] });
    const receipt = await waitForReceipt(txHash);
    if (receipt?.status === "0x0") throw new Error("거래가 체인에서 실패했습니다. 수신 계정 정책과 컨트랙트 잔액을 확인하세요.");
    state.proposal = "executed"; renderProposal(); renderReceipt(txHash, receipt);
    setResult("#proposal-result", `지갑이 거래를 제출했습니다. ${receipt ? "GIWA 영수증을 확인했습니다." : "Explorer에서 확인하세요."}`, "success");
  } catch (error) { setResult("#proposal-result", `거래를 실행하지 않았습니다: ${error.message || error}`, "error"); }
}
function holdProposal() {
  state.proposal = "held"; renderProposal(); setResult("#proposal-result", "제안을 보류했습니다. 자금은 이동하지 않았고, 다음 Watcher 점검에서 다시 판단합니다.", "success");
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
  const target = section === "wallet" ? $("#settings-wallet-button") : section === "policy" ? $("#policy-settings") : section === "deployment" ? $("#controller-address") : $("#ai-settings");
  scrollTo(target); target?.focus?.({ preventScroll: true });
}
function initialize() {
  $("#proposal-amount").textContent = `${PROPOSAL.amountEth.toFixed(4)} Test ETH`;
  $("#proposal-recipient").textContent = shortAddress(PROPOSAL.recipient);
  $("#ai-provider").value = state.aiProvider; $("#ai-model").value = localStorage.getItem("asset-passport-ai-model") || ""; $("#ai-endpoint").value = localStorage.getItem("asset-passport-ai-endpoint") || "";
  renderAccount(); renderProposal();
  document.querySelectorAll(".view-tab").forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
  ["#wallet-button", "#settings-wallet-button"].forEach((selector) => $(selector).addEventListener("click", connectWallet));
  ["#run-watcher", "#watcher-run"].forEach((selector) => $(selector).addEventListener("click", runWatcher));
  $("#hero-primary-action").addEventListener("click", handleJourneyAction);
  $("#approve-proposal").addEventListener("click", () => currentJourney().action === "proposal" ? approveProposal() : handleJourneyAction());
  $("#reject-proposal").addEventListener("click", holdProposal); $("#register-policy").addEventListener("click", registerPolicy); $("#save-ai-settings").addEventListener("click", saveAiSettings); $("#test-ai-connection").addEventListener("click", testAiConnection);
  document.querySelectorAll(".setup-link").forEach((button) => button.addEventListener("click", () => openSetup(button.dataset.setup)));
  window.ethereum?.on?.("accountsChanged", async ([account]) => {
    state.account = account || null;
    await refreshControllerOwner();
    renderAccount(); await refreshOnchainPolicy(); renderProposal();
  });
}
initialize();
