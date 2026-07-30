const config = window.ASSET_PASSPORT_CONFIG;
const state = { assets: [], selectedId: null, account: null };
const labels = { draft: "초안", review: "검토 진행", approved: "승인", disclosed: "공시", suspended: "중지", archived: "종료" };

const shortAddress = (value) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function renderSummary() {
  document.querySelector("#asset-count").textContent = state.assets.length;
  document.querySelector("#review-count").textContent = state.assets.filter(({ status }) => status === "review").length;
  document.querySelector("#blocked-count").textContent = state.assets.filter(({ status }) => status !== "disclosed").length;
}

function renderList() {
  const list = document.querySelector("#asset-list");
  list.replaceChildren(...state.assets.map((asset) => {
    const node = document.querySelector("#asset-template").content.firstElementChild.cloneNode(true);
    node.querySelector(".asset-id").textContent = asset.scenario;
    node.querySelector("strong").textContent = asset.name;
    node.querySelector("small").textContent = asset.question;
    const status = node.querySelector(".status");
    status.textContent = labels[asset.status] || asset.status;
    status.classList.add(asset.status);
    node.classList.toggle("selected", asset.id === state.selectedId);
    node.addEventListener("click", () => { state.selectedId = asset.id; renderList(); renderDetail(); });
    return node;
  }));
}

function renderTimeline(asset) {
  return `<ol class="timeline">${asset.timeline.map((item, index) => `<li><span class="timeline-index">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item.step)}</strong><span>${escapeHtml(item.actor)}</span><p>${escapeHtml(item.detail)}</p></div></li>`).join("")}</ol>`;
}

function renderDocuments(asset) {
  if (!asset.documents.length) return '<p class="empty-state">등록된 문서 해시가 없습니다. 이 상태에서는 검토와 공시가 시작되지 않습니다.</p>';
  return asset.documents.map((document) => `<div class="document"><div><strong>v${document.version} · ${escapeHtml(document.type)}</strong><span class="document-state">${document.status === "approved" ? "검토 승인" : "검토 전"}</span></div><p class="hash">SHA-256 ${escapeHtml(document.sha256)}</p><p>기록 시점: ${escapeHtml(document.submittedAt)} · 원본 파일은 저장하지 않음</p></div>`).join("");
}

function renderDetail() {
  const asset = state.assets.find(({ id }) => id === state.selectedId);
  const detail = document.querySelector("#asset-detail");
  if (!asset) { detail.innerHTML = '<p class="empty-state">시나리오를 선택하면 실제로 무엇을 검증하는지 확인할 수 있습니다.</p>'; return; }
  const signAction = asset.status === "review"
    ? '<div class="signature-area"><div><span class="eyebrow">선택 시연</span><h2>검토 의사 서명 미리보기</h2><p>지갑 개인키는 이 화면에 전달되지 않습니다. 이 서명은 화면 흐름 확인용이며, 실제 승인 증명은 배포 뒤 GIWA 트랜잭션과 이벤트로 확인합니다.</p></div><button id="sign-review" type="button">지갑으로 서명해 보기</button><div id="signature-result" class="signature-result"></div></div>'
    : "";
  detail.innerHTML = `<div class="panel-heading"><span>${escapeHtml(asset.id)}</span><span class="phase-chip">배포 후 검증</span></div><p class="scenario-label">${escapeHtml(asset.scenario)}</p><h2>${escapeHtml(asset.name)}</h2><p class="detail-lead">${escapeHtml(asset.description)}</p><div class="answer-card"><span>확인할 질문</span><strong>${escapeHtml(asset.question)}</strong><p>${escapeHtml(asset.answer)}</p></div><div class="meta-grid"><div><span>발행 주체</span>${escapeHtml(asset.issuer)}</div><div><span>현재 설계 상태</span>${labels[asset.status]}</div><div><span>공시 기준</span>${escapeHtml(asset.disclosurePlan)}</div><div><span>기록 네트워크</span>GIWA Sepolia</div></div><section class="detail-section"><div class="section-heading"><h2>배포 뒤 기록될 순서</h2><span>상태 전이 검증</span></div>${renderTimeline(asset)}</section><section class="detail-section"><div class="section-heading"><h2>문서 증빙</h2><span>원본은 오프체인</span></div>${renderDocuments(asset)}</section><section class="verification-card"><span>검증 방법</span><p>${escapeHtml(asset.verification)}</p><small>완료 기준: 화면 상태, 컨트랙트 조회 값, GIWA Explorer 이벤트가 서로 일치해야 합니다.</small></section>${signAction}`;
  document.querySelector("#sign-review")?.addEventListener("click", () => signReview(asset));
}

async function connectWallet() {
  const button = document.querySelector("#wallet-button");
  if (!window.ethereum) { button.textContent = "EVM 지갑 필요"; return; }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    await ensureGiwaSepolia();
    state.account = accounts[0];
    button.textContent = shortAddress(state.account);
  } catch (error) { button.textContent = "연결 실패"; console.error(error); }
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
  const message = `Asset Passport demo acknowledgement\nAsset: ${asset.id}\nScenario: ${asset.scenario}\nNetwork: GIWA Sepolia\nPurpose: UI flow preview only; not an on-chain approval or financial transaction.`;
  try {
    const signature = await window.ethereum.request({ method: "personal_sign", params: [message, state.account] });
    document.querySelector("#signature-result").textContent = `서명 미리보기 생성: ${shortAddress(signature)}`;
  } catch (error) { document.querySelector("#signature-result").textContent = "서명이 취소되었거나 실패했습니다."; console.error(error); }
}

async function init() {
  const response = await fetch("demo-assets.json");
  if (!response.ok) throw new Error("Demo asset data could not be loaded.");
  state.assets = await response.json();
  state.selectedId = state.assets[0]?.id ?? null;
  renderSummary(); renderList(); renderDetail();
}

document.querySelector("#wallet-button").addEventListener("click", connectWallet);
init().catch((error) => { document.querySelector("#asset-detail").textContent = "데모 데이터를 불러오지 못했습니다."; console.error(error); });
