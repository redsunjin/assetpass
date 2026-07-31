const config = window.ASSET_PASSPORT_CONFIG;
const defaultAiSuppliers = [
  { id: "rules", name: "내장 증빙 규칙", kind: "rules", endpoint: "", model: "", status: "ready" },
  { id: "ollama-local", name: "내 컴퓨터의 Ollama", kind: "ollama", endpoint: "http://127.0.0.1:11434", model: "", status: "unverified" },
];
const state = { assets: [], selectedId: null, account: null, workflowStep: 0, ai: { activeId: "rules", suppliers: structuredClone(defaultAiSuppliers) } };
const labels = { draft: "초안", review: "검토 대기", approved: "승인", disclosed: "공개 가능", suspended: "중지", archived: "종료" };
const workflowStages = [
  { actor: "Issuer", title: "자료 등록: 원본은 밖에, 증빙값만 연결", description: "발행자는 원본 문서를 오프체인에 보관하고 문서 해시·버전·기준일을 등록합니다. 이 입력이 이후 모든 판단의 기준이 됩니다.", input: "문서 메타데이터 · 해시 · 버전", output: "점검할 공개 준비 자료", next: "AI 사전 점검", target: "#asset-list", openLabel: "등록 자료 보기" },
  { actor: "AI Release Copilot", title: "AI 사전 점검: 위험과 다음 행동을 제안", description: "규칙 엔진 또는 선택한 로컬 LLM이 버전·누락 증빙·이전 승인과의 연결을 살핍니다. AI는 승인하지 않고, 왜 막았는지만 설명합니다.", input: "자산 ID · 문서 버전 · 승인 상태", output: "차단 사유 · 다음 행동 제안", next: "사람의 승인", target: ".ai-card", openLabel: "AI 점검 결과 보기" },
  { actor: "Human reviewer", title: "사람의 승인: 원문 근거를 보고 책임 있게 결정", description: "검토자는 AI의 요약만 믿지 않고 원문 근거와 변경점을 확인합니다. 승인 의사는 책임자의 지갑 서명으로 남습니다.", input: "원문 근거 · AI 제안 · 책임 권한", output: "검토자 승인 의사", next: "GIWA 증명", target: "#sign-review", openLabel: "지갑 승인 화면 보기" },
  { actor: "GIWA Sepolia", title: "GIWA 증명: 승인된 최신 상태만 기록", description: "공시가 열리면 원본이 아니라 승인된 문서 해시·승인·상태 전이만 GIWA에 남습니다. 이 데모의 실제 트랜잭션은 테스트넷 배포 뒤 확인합니다.", input: "승인된 해시 · 역할별 결정", output: "트랜잭션 · 이벤트 이력", next: "공개 검증", target: "#control-room", openLabel: "운영 상태 보기" },
  { actor: "Partner / verifier", title: "공개 검증: 받은 파일과 증명 이력을 직접 대조", description: "파트너와 검증자는 파일의 SHA-256을 브라우저에서 계산해 기록값과 비교하고, GIWA 이력으로 공개 준비 상태를 확인합니다.", input: "받은 파일 · 공유 Passport", output: "일치 또는 재검토 필요", next: "처음으로", target: "#verify-file", openLabel: "파일 검증 화면 보기" },
];

const shortAddress = (value) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function renderWorkflow() {
  const stage = workflowStages[state.workflowStep];
  document.querySelector("#workflow-stage-index").textContent = `Step ${String(state.workflowStep + 1).padStart(2, "0")} · ${stage.actor}`;
  document.querySelector("#workflow-stage-title").textContent = stage.title;
  document.querySelector("#workflow-stage-description").textContent = stage.description;
  document.querySelector("#workflow-stage-input").textContent = stage.input;
  document.querySelector("#workflow-stage-output").textContent = stage.output;
  const panel = document.querySelector("#workflow-stage");
  panel.setAttribute("aria-labelledby", `workflow-tab-${state.workflowStep}`);
  document.querySelectorAll("[data-workflow-step]").forEach((tab) => {
    const active = Number(tab.dataset.workflowStep) === state.workflowStep;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  const previous = document.querySelector("#workflow-prev");
  const next = document.querySelector("#workflow-next");
  previous.disabled = state.workflowStep === 0;
  next.textContent = state.workflowStep === workflowStages.length - 1 ? "처음으로" : `다음: ${stage.next}`;
  document.querySelector("#workflow-open").textContent = stage.openLabel;
}

function setWorkflowStep(step) {
  state.workflowStep = (step + workflowStages.length) % workflowStages.length;
  renderWorkflow();
}

function openWorkflowScreen() {
  const target = document.querySelector(workflowStages[state.workflowStep].target) || document.querySelector("#asset-detail");
  target?.scrollIntoView({ behavior: "auto", block: "start" });
  target?.focus?.({ preventScroll: true });
}

function moveWorkflowTabByKeyboard(event) {
  const tabs = [...document.querySelectorAll("[data-workflow-step]")];
  const current = Number(event.currentTarget.dataset.workflowStep);
  let next = null;
  if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (current + 1) % tabs.length;
  if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (current - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = tabs.length - 1;
  if (next === null) return;
  event.preventDefault();
  setWorkflowStep(next);
  document.querySelector(`#workflow-tab-${next}`)?.focus();
}

function setAppMode(mode) {
  document.querySelector(".shell").dataset.appMode = mode;
  document.querySelectorAll(".app-mode-tab").forEach((button) => {
    const active = button.dataset.appMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (mode === "settings") document.querySelector("#control-room")?.scrollIntoView({ behavior: "auto", block: "start" });
}

function openGateAction(event) {
  const target = document.querySelector(event.currentTarget.dataset.target) || document.querySelector("#asset-detail");
  target?.scrollIntoView({ behavior: "auto", block: "start" });
  target?.focus?.({ preventScroll: true });
}

function renderGate(asset) {
  const blocked = asset.aiReview.decision === "block";
  const stateEl = document.querySelector("#gate-state");
  stateEl.textContent = blocked ? "공시 차단" : asset.aiReview.decision === "ready" ? "공개 가능" : "추가 자료 필요";
  stateEl.className = `gate-state ${asset.aiReview.decision}`;
  document.querySelector("#gate-title").textContent = blocked ? "지금 공개하면 안 되는 이유가 확인됐습니다." : asset.aiReview.decision === "ready" ? "필수 증빙과 사람의 승인이 연결됐습니다." : "공개 전에 먼저 채워야 할 증빙이 있습니다.";
  document.querySelector("#gate-reason").textContent = asset.aiReview.summary;
  document.querySelector("#issue-count").textContent = asset.aiReview.issues.length;
  document.querySelector("#rail-ai").textContent = blocked ? `${asset.aiReview.issues.length}개 위험 발견` : asset.aiReview.decision === "ready" ? "점검 완료" : "추가 증빙 요청";
  document.querySelector("#rail-human").textContent = asset.status === "review" ? "검토자 지갑 승인 필요" : asset.status === "disclosed" ? "승인 완료" : "증빙 준비 필요";
  document.querySelector("#rail-giwa").textContent = asset.status === "disclosed" ? "공개 상태 증명됨" : "사람 승인 뒤 기록";
  document.querySelector("#rail-public").textContent = asset.status === "disclosed" ? "해시 대조 가능" : "공개 전";
  document.querySelectorAll(".operation-rail li").forEach((node, index) => node.classList.toggle("active", index === 0 || (index === 1 && asset.status === "review") || (index > 1 && asset.status === "disclosed")));
  const primary = document.querySelector("#gate-primary");
  if (asset.status === "review") { primary.textContent = "검토자 승인으로 이동"; primary.dataset.target = "#sign-review"; }
  else if (asset.status === "disclosed") { primary.textContent = "공개 검증으로 이동"; primary.dataset.target = "#verify-file"; }
  else { primary.textContent = "자료 등록 상태 보기"; primary.dataset.target = "#asset-list"; }
  document.querySelector("#gate-evidence").dataset.target = ".ai-card";
}

function renderList() {
  const list = document.querySelector("#asset-list");
  list.replaceChildren(...state.assets.map((asset) => {
    const node = document.querySelector("#asset-template").content.firstElementChild.cloneNode(true);
    node.querySelector(".asset-id").textContent = asset.scenario;
    node.querySelector("strong").textContent = asset.name;
    node.querySelector("small").textContent = asset.aiReview.shortResult;
    const status = node.querySelector(".status");
    status.textContent = labels[asset.status] || asset.status;
    status.classList.add(asset.status);
    node.classList.toggle("selected", asset.id === state.selectedId);
    node.addEventListener("click", () => { state.selectedId = asset.id; renderList(); renderDetail(); });
    return node;
  }));
}

function renderIssues(asset) {
  return `<section class="ai-card"><div class="section-heading"><div><span class="eyebrow">AI Release Copilot</span><h2>${escapeHtml(asset.aiReview.title)}</h2></div><span class="ai-badge">제안 · 자동 결정 아님</span></div><p class="ai-summary">${escapeHtml(asset.aiReview.summary)}</p><ul class="issue-list">${asset.aiReview.issues.map((issue) => `<li><strong>${escapeHtml(issue.label)}</strong><span>${escapeHtml(issue.detail)}</span></li>`).join("")}</ul><div class="next-action"><span>AI가 제안하는 다음 행동</span><strong>${escapeHtml(asset.aiReview.nextAction)}</strong></div><small>이 결과는 가상 시나리오의 문서 메타데이터·버전·승인 상태를 바탕으로 만든 데모입니다. 실제 서비스에서는 원문 근거와 함께 검토자에게 제시됩니다.</small></section>`;
}

function renderTimeline(asset) {
  return `<ol class="timeline">${asset.timeline.map((item, index) => `<li><span class="timeline-index">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item.step)}</strong><span>${escapeHtml(item.actor)}</span><p>${escapeHtml(item.detail)}</p></div></li>`).join("")}</ol>`;
}

function renderDocuments(asset) {
  if (!asset.documents.length) return '<p class="empty-state">등록된 문서 해시가 없습니다. AI도 완성도를 제안할 수는 있지만, 사람의 검토와 공시는 시작되지 않습니다.</p>';
  return asset.documents.map((document) => `<div class="document"><div><strong>v${document.version} · ${escapeHtml(document.type)}</strong><span class="document-state">${document.status === "approved" ? "사람 검토 완료" : "검토 대기"}</span></div><p class="hash">SHA-256 ${escapeHtml(document.sha256)}</p><p>기록 시점: ${escapeHtml(document.submittedAt)} · 원본 파일은 저장하지 않음</p></div>`).join("");
}

function renderVerifier(asset) {
  const document = asset.documents[0];
  if (!document) return "";
  const sampleBase = window.ASSET_PASSPORT_SAMPLE_BASE ? new URL(window.ASSET_PASSPORT_SAMPLE_BASE, window.location.href).href : window.location.href;
  const sampleFile = new URL(asset.sampleFile || "#", sampleBase).href;
  return `<section class="file-verifier"><div><span class="eyebrow">Public verification</span><h2>파일 해시를 직접 대조해 보기</h2><p>가상 샘플 문서를 선택하면 브라우저 안에서 SHA-256을 계산해 기록된 값과 비교합니다. 파일은 업로드되거나 전송되지 않습니다.</p><a href="${escapeHtml(sampleFile)}" download>가상 샘플 문서 받기</a></div><label class="file-input">파일 선택<input id="verify-file" type="file" accept=".txt,.pdf,.doc,.docx" /></label><div id="hash-result" class="hash-result" aria-live="polite"></div></section>`;
}

function renderDetail() {
  const asset = state.assets.find(({ id }) => id === state.selectedId);
  const detail = document.querySelector("#asset-detail");
  if (!asset) return;
  renderGate(asset);
  const signAction = asset.status === "review"
    ? '<div class="signature-area"><div><span class="eyebrow">Human approval</span><h2>검토자의 승인 의사 서명</h2><p>AI 경고를 해소했다고 판단한 책임자만 서명합니다. 이 버튼은 지갑 흐름 확인용 미리보기이며, 실제 승인은 배포 후 GIWA 트랜잭션과 이벤트로 확인합니다.</p></div><button id="sign-review" type="button">지갑으로 승인 의사 서명</button><div id="signature-result" class="signature-result"></div></div>'
    : "";
  detail.innerHTML = `<div class="panel-heading"><span>${escapeHtml(asset.id)}</span><span class="phase-chip">배포 후 온체인 검증</span></div><p class="scenario-label">${escapeHtml(asset.scenario)}</p><h2>${escapeHtml(asset.name)}</h2><p class="detail-lead">${escapeHtml(asset.description)}</p>${renderIssues(asset)}<div class="meta-grid"><div><span>발행 주체</span>${escapeHtml(asset.issuer)}</div><div><span>현재 Release Gate</span>${escapeHtml(labels[asset.status])}</div><div><span>공시 기준</span>${escapeHtml(asset.disclosurePlan)}</div><div><span>기록 네트워크</span>GIWA Sepolia</div></div><section class="detail-section"><div class="section-heading"><h2>사람과 체인이 이어받는 순서</h2><span>Approval-first</span></div>${renderTimeline(asset)}</section><section class="detail-section"><div class="section-heading"><h2>증빙 해시</h2><span>원본은 오프체인</span></div>${renderDocuments(asset)}</section>${renderVerifier(asset)}<section class="verification-card"><span>실제 테스트넷 완료 기준</span><p>${escapeHtml(asset.verification)}</p><small>화면 상태, 컨트랙트 조회 값, GIWA Explorer 이벤트가 서로 일치해야 합니다.</small></section>${signAction}`;
  document.querySelector("#sign-review")?.addEventListener("click", () => signReview(asset));
  document.querySelector("#verify-file")?.addEventListener("change", (event) => verifyFile(event, asset));
}

async function verifyFile(event, asset) {
  const file = event.target.files?.[0];
  const result = document.querySelector("#hash-result");
  if (!file) return;
  result.textContent = "해시 계산 중…";
  if (!window.crypto?.subtle) { result.textContent = "이 브라우저는 파일 해시 계산을 지원하지 않습니다."; return; }
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const matches = hash === asset.documents[0].sha256;
  result.className = `hash-result ${matches ? "match" : "mismatch"}`;
  result.textContent = matches ? `일치: ${file.name}은 기록된 v${asset.documents[0].version} 증빙과 같습니다.` : `불일치: ${file.name}은 기록된 최신 증빙과 다릅니다. 공개 전 재검토가 필요합니다.`;
}

async function connectWallet() {
  const button = document.querySelector("#wallet-button");
  if (!window.ethereum) { button.textContent = "EVM 지갑 필요"; return; }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    await ensureGiwaSepolia();
    state.account = accounts[0];
    button.textContent = shortAddress(state.account);
    updateWalletManager();
  } catch (error) { button.textContent = "연결 실패"; console.error(error); }
}

function updateWalletManager() {
  const stateEl = document.querySelector("#wallet-state");
  const accountEl = document.querySelector("#wallet-account");
  const networkEl = document.querySelector("#wallet-network");
  if (!state.account) {
    stateEl.textContent = "연결 전";
    accountEl.textContent = "연결하면 표시됩니다";
    networkEl.textContent = "GIWA Sepolia 확인 전";
    return;
  }
  stateEl.textContent = "연결됨";
  stateEl.className = "control-state ready";
  accountEl.textContent = shortAddress(state.account);
  networkEl.textContent = "GIWA Sepolia · Chain 91342";
}

async function ensureGiwaSepolia() {
  try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: config.chain.chainId }] }); }
  catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [config.chain] });
  }
}

async function signReview(asset) {
  if (!state.account) await connectWallet();
  if (!state.account) return;
  const message = `Asset Passport human approval preview\nAsset: ${asset.id}\nAI recommendation: ${asset.aiReview.nextAction}\nNetwork: GIWA Sepolia\nPurpose: demo-only approval flow; not an on-chain approval or financial transaction.`;
  try {
    const signature = await window.ethereum.request({ method: "personal_sign", params: [message, state.account] });
    document.querySelector("#signature-result").textContent = `승인 의사 서명 미리보기 생성: ${shortAddress(signature)}`;
  } catch (error) { document.querySelector("#signature-result").textContent = "서명이 취소되었거나 실패했습니다."; console.error(error); }
}

function activeAiSupplier() { return state.ai.suppliers.find(({ id }) => id === state.ai.activeId) || state.ai.suppliers[0]; }
function supplierKindLabel(kind) { return ({ rules: "내장 규칙", ollama: "로컬 Ollama", relay: "HTTPS 보안 릴레이" })[kind] || kind; }
function persistAiSettings() { localStorage.setItem("asset-passport-ai-settings", JSON.stringify(state.ai)); }

function renderAiSupplierOptions() {
  const select = document.querySelector("#ai-provider");
  select.replaceChildren(...state.ai.suppliers.map((supplier) => {
    const option = document.createElement("option");
    option.value = supplier.id;
    option.textContent = `${supplier.name} · ${supplierKindLabel(supplier.kind)}`;
    return option;
  }));
  select.value = state.ai.activeId;
}

function renderAiSupplierList() {
  const list = document.querySelector("#ai-supplier-list");
  list.replaceChildren(...state.ai.suppliers.map((supplier) => {
    const item = document.createElement("div");
    const active = supplier.id === state.ai.activeId;
    item.className = `ai-supplier-item ${active ? "active" : ""}`;
    item.innerHTML = `<div><strong>${escapeHtml(supplier.name)}</strong><small>${escapeHtml(supplierKindLabel(supplier.kind))} · ${supplier.status === "ready" ? "연결 확인" : supplier.status === "failed" ? "연결 실패" : supplier.kind === "rules" ? "사용 가능" : "연결 확인 전"}</small></div><button class="secondary-button" type="button">${active ? "사용 중" : "사용"}</button>`;
    item.querySelector("button").disabled = active;
    item.querySelector("button").addEventListener("click", () => selectAiSupplier(supplier.id));
    return item;
  }));
}

function syncActiveAiInputs() {
  const supplier = activeAiSupplier();
  document.querySelector("#ai-provider").value = supplier.id;
  const endpoint = document.querySelector("#ai-endpoint");
  const model = document.querySelector("#ai-model");
  endpoint.value = supplier.endpoint || "";
  model.value = supplier.model || "";
  endpoint.disabled = supplier.kind === "rules";
  model.disabled = supplier.kind === "rules";
}

function selectAiSupplier(id) {
  state.ai.activeId = id;
  persistAiSettings();
  syncActiveAiInputs();
  updateAiManager();
}

function loadAiSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("asset-passport-ai-settings") || "{}");
    if (Array.isArray(saved.suppliers) && saved.suppliers.length) {
      state.ai = { activeId: saved.activeId, suppliers: saved.suppliers };
    } else if (saved.provider === "ollama") {
      const supplier = state.ai.suppliers.find(({ id }) => id === "ollama-local");
      supplier.endpoint = saved.endpoint || supplier.endpoint;
      supplier.model = saved.model || "";
      state.ai.activeId = supplier.id;
    }
  } catch (error) { console.warn("Could not load local AI settings", error); }
  if (!state.ai.suppliers.some(({ id }) => id === state.ai.activeId)) state.ai.activeId = state.ai.suppliers[0].id;
  renderAiSupplierOptions(); syncActiveAiInputs(); updateAiManager();
}

function updateAiManager(message) {
  const supplier = activeAiSupplier();
  const stateEl = document.querySelector("#ai-state");
  stateEl.textContent = supplier.kind === "rules" ? "규칙 엔진" : supplier.kind === "ollama" ? "로컬 LLM" : "보안 릴레이";
  stateEl.className = `control-state ${supplier.kind === "rules" ? "" : "local"}`;
  document.querySelector("#ai-supplier").textContent = supplier.kind === "rules" ? "내장 증빙 규칙 · LLM 미사용" : `${supplier.name} · ${supplierKindLabel(supplier.kind)}`;
  document.querySelector("#ai-data-scope").textContent = supplier.kind === "rules" ? "문서 메타데이터·버전·승인 상태" : "문서 메타데이터·버전·승인 상태만";
  document.querySelector("#ai-route").textContent = supplier.kind === "rules" ? "브라우저 내부 · 네트워크 전송 없음" : supplier.kind === "ollama" ? "브라우저 → localhost Ollama" : "브라우저 → HTTPS 보안 릴레이";
  renderAiSupplierList();
  if (message) document.querySelector("#ai-run-result").textContent = message;
}

function validateAiSupplier(supplier) {
  if (supplier.kind === "rules") return;
  if (!supplier.endpoint) throw new Error("연결 주소를 입력하세요.");
  const url = new URL(supplier.endpoint);
  if (supplier.kind === "ollama" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) throw new Error("로컬 Ollama는 localhost 주소만 허용합니다.");
  if (supplier.kind === "relay" && url.protocol !== "https:") throw new Error("외부 AI 보안 릴레이는 HTTPS 주소만 허용합니다.");
}

function supplierUrl(supplier, path) {
  validateAiSupplier(supplier);
  const base = supplier.endpoint.endsWith("/") ? supplier.endpoint : `${supplier.endpoint}/`;
  return new URL(path.replace(/^\//, ""), base).toString();
}

function saveAiSettings(message = "현재 공급자 프로필을 이 브라우저에 저장했습니다. API 키·원본 문서는 저장하지 않습니다.") {
  const supplier = activeAiSupplier();
  supplier.endpoint = document.querySelector("#ai-endpoint").value.trim();
  supplier.model = document.querySelector("#ai-model").value.trim();
  try { validateAiSupplier(supplier); } catch (error) { updateAiManager(error.message); return false; }
  persistAiSettings();
  updateAiManager(message);
  return true;
}

function registerAiSupplier() {
  const name = document.querySelector("#new-ai-supplier-name").value.trim();
  const kind = document.querySelector("#new-ai-supplier-kind").value;
  const endpoint = document.querySelector("#new-ai-supplier-endpoint").value.trim();
  const model = document.querySelector("#new-ai-supplier-model").value.trim();
  if (!name) { updateAiManager("공급자 이름을 입력하세요."); return; }
  const supplier = { id: `supplier-${Date.now()}`, name, kind, endpoint, model, status: "unverified" };
  try { validateAiSupplier(supplier); } catch (error) { updateAiManager(error.message); return; }
  state.ai.suppliers.push(supplier);
  state.ai.activeId = supplier.id;
  persistAiSettings(); renderAiSupplierOptions(); syncActiveAiInputs(); updateAiManager(`${name} 공급자 프로필을 등록했습니다. 이제 ‘공급자 연결 확인’으로 실제 연결을 확인하세요.`);
  ["#new-ai-supplier-name", "#new-ai-supplier-endpoint", "#new-ai-supplier-model"].forEach((selector) => { document.querySelector(selector).value = ""; });
}

async function testAiConnection() {
  const supplier = activeAiSupplier();
  if (supplier.kind === "rules") { updateAiManager("내장 증빙 규칙은 이 브라우저에서 바로 동작합니다. LLM을 쓰려면 등록한 공급자 프로필을 선택하세요."); return; }
  if (!saveAiSettings()) return;
  const result = document.querySelector("#ai-run-result");
  result.textContent = `${supplier.name} 연결 확인 중…`;
  try {
    const response = await fetch(supplierUrl(supplier, supplier.kind === "ollama" ? "api/tags" : "models"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const models = supplier.kind === "ollama" ? payload.models?.map(({ name }) => name).filter(Boolean) || [] : payload.data?.map(({ id }) => id).filter(Boolean) || [];
    if (!supplier.model && models[0]) { supplier.model = models[0]; document.querySelector("#ai-model").value = supplier.model; persistAiSettings(); }
    supplier.status = "ready";
    updateAiManager(models.length ? `${supplier.name} 연결됨 · 사용 가능한 모델: ${models.slice(0, 3).join(", ")}` : `${supplier.name} 연결됨 · 모델 목록은 공급자 정책상 제공되지 않습니다.`);
  } catch (error) { supplier.status = "failed"; updateAiManager(`${supplier.name} 연결 실패: ${error.message}`); }
}

async function runAiPreflight() {
  const asset = state.assets.find(({ id }) => id === state.selectedId);
  const result = document.querySelector("#ai-run-result");
  const supplier = activeAiSupplier();
  if (!asset) return;
  if (supplier.kind === "rules") { result.textContent = `Release Scout 완료: ${asset.aiReview.summary} 다음 행동: ${asset.aiReview.nextAction}`; return; }
  if (!saveAiSettings()) return;
  if (!supplier.model) { result.textContent = "먼저 모델 이름을 입력하거나 공급자 연결 확인으로 감지하세요."; return; }
  result.textContent = `${supplier.name}이 문서 원본 없이 메타데이터·버전·승인 상태를 점검 중…`;
  const metadata = { assetId: asset.id, assetName: asset.name, document: asset.documents.map(({ version, type, status }) => ({ version, type, status })), currentGate: labels[asset.status], detectedIssues: asset.aiReview.issues };
  const messages = [{ role: "system", content: "You are a release-risk assistant. Write concise Korean. Never approve or provide legal advice. State that a human wallet approval is required." }, { role: "user", content: `Analyze only this metadata, not source documents: ${JSON.stringify(metadata)}` }];
  try {
    const ollama = supplier.kind === "ollama";
    const response = await fetch(supplierUrl(supplier, ollama ? "api/chat" : "chat/completions"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ollama ? { model: supplier.model, stream: false, messages } : { model: supplier.model, messages }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const draft = ollama ? payload.message?.content?.trim() : payload.choices?.[0]?.message?.content?.trim();
    if (!draft) throw new Error("응답 본문이 없습니다.");
    result.textContent = `${supplier.name} 사전점검 초안: ${draft}`;
  } catch (error) { result.textContent = `${supplier.name} 점검 실패: ${error.message}`; }
}

async function init() {
  const response = await fetch(window.ASSET_PASSPORT_DATA_URL || "../data/demo-assets.json");
  if (!response.ok) throw new Error("Demo asset data could not be loaded.");
  state.assets = await response.json();
  state.selectedId = state.assets[0]?.id ?? null;
  loadAiSettings(); updateWalletManager(); renderWorkflow(); renderList(); renderDetail();
}

document.querySelector("#wallet-button").addEventListener("click", connectWallet);
document.querySelector("#manager-wallet-button").addEventListener("click", connectWallet);
document.querySelectorAll(".app-mode-tab").forEach((button) => button.addEventListener("click", () => setAppMode(button.dataset.appMode)));
document.querySelector("#gate-primary").addEventListener("click", openGateAction);
document.querySelector("#gate-evidence").addEventListener("click", openGateAction);
document.querySelectorAll("[data-workflow-step]").forEach((tab) => {
  tab.addEventListener("click", () => setWorkflowStep(Number(tab.dataset.workflowStep)));
  tab.addEventListener("keydown", moveWorkflowTabByKeyboard);
});
document.querySelector("#workflow-prev").addEventListener("click", () => setWorkflowStep(Math.max(0, state.workflowStep - 1)));
document.querySelector("#workflow-next").addEventListener("click", () => setWorkflowStep(state.workflowStep === workflowStages.length - 1 ? 0 : state.workflowStep + 1));
document.querySelector("#workflow-open").addEventListener("click", openWorkflowScreen);
document.querySelector("#ai-provider").addEventListener("change", (event) => selectAiSupplier(event.target.value));
document.querySelector("#save-ai-settings").addEventListener("click", saveAiSettings);
document.querySelector("#test-ai-connection").addEventListener("click", testAiConnection);
document.querySelector("#run-ai-preflight").addEventListener("click", runAiPreflight);
document.querySelector("#register-ai-supplier").addEventListener("click", registerAiSupplier);
init().catch((error) => { document.querySelector("#asset-detail").textContent = "데모 데이터를 불러오지 못했습니다."; console.error(error); });
