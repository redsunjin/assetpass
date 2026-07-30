const config = window.ASSET_PASSPORT_CONFIG;
const state = { assets: [], selectedId: null, account: null };
const labels = { draft: "초안", review: "검토 대기", approved: "승인", disclosed: "공시 완료", suspended: "중지", archived: "종료" };

const shortAddress = (value) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const formatDate = (value) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function renderSummary() {
  document.querySelector("#asset-count").textContent = state.assets.length;
  document.querySelector("#review-count").textContent = state.assets.filter(({ status }) => status === "review").length;
  document.querySelector("#disclosed-count").textContent = state.assets.filter(({ status }) => status === "disclosed").length;
}

function renderList() {
  const list = document.querySelector("#asset-list");
  list.replaceChildren(...state.assets.map((asset) => {
    const node = document.querySelector("#asset-template").content.firstElementChild.cloneNode(true);
    node.querySelector(".asset-id").textContent = asset.id;
    node.querySelector("strong").textContent = asset.name;
    const status = node.querySelector(".status");
    status.textContent = labels[asset.status] || asset.status;
    status.classList.add(asset.status);
    node.classList.toggle("selected", asset.id === state.selectedId);
    node.addEventListener("click", () => { state.selectedId = asset.id; renderList(); renderDetail(); });
    return node;
  }));
}

function renderDetail() {
  const asset = state.assets.find(({ id }) => id === state.selectedId);
  const detail = document.querySelector("#asset-detail");
  if (!asset) { detail.innerHTML = '<p class="empty-state">자산을 선택하면 최신 증빙을 확인할 수 있습니다.</p>'; return; }
  const documents = asset.documents.length
    ? asset.documents.map((document) => `<div class="document"><strong>v${document.version} · ${document.type}</strong><p class="hash">SHA-256 ${document.sha256}</p><p>${document.status === "approved" ? "검토 승인" : "검토 대기"} · 제출 ${formatDate(document.submittedAt)}</p></div>`).join("")
    : '<p class="empty-state">아직 등록된 문서 해시가 없습니다.</p>';
  const signAction = asset.status === "review"
    ? '<div class="signature-area"><h2>검토자 서명 미리보기</h2><p>지갑의 개인키는 앱에 전달되지 않습니다. 이 서명은 컨트랙트 배포 전 데모 확인용이며, 온체인 승인 트랜잭션은 아닙니다.</p><button id="sign-review" type="button">검토 의사 서명</button><div id="signature-result" class="signature-result"></div></div>'
    : "";
  detail.innerHTML = `<div class="panel-heading"><span>${asset.id}</span><span class="status ${asset.status}">${labels[asset.status]}</span></div><h2>${asset.name}</h2><p>${asset.description}</p><div class="meta-grid"><div><span>발행 주체 (데모)</span>${asset.issuer}</div><div><span>공시 예정</span>${formatDate(asset.disclosureDueAt)}</div><div><span>자산 유형</span>${asset.type}</div><div><span>네트워크</span>GIWA Sepolia</div></div><h2>문서 증빙</h2>${documents}${signAction}`;
  document.querySelector("#sign-review")?.addEventListener("click", () => signReview(asset));
}

function renderCalendar() {
  const target = document.querySelector("#disclosure-calendar");
  target.replaceChildren(...[...state.assets].sort((a, b) => new Date(a.disclosureDueAt) - new Date(b.disclosureDueAt)).map((asset) => {
    const row = document.createElement("div"); row.className = "calendar-row";
    row.innerHTML = `<span><strong>${asset.name}</strong><br><small>${asset.id}</small></span><time>${formatDate(asset.disclosureDueAt)}</time>`;
    return row;
  }));
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
  const message = `Asset Passport demo review\nAsset: ${asset.id}\nDocument: v${asset.documents.at(-1)?.version ?? 0}\nNetwork: GIWA Sepolia\nPurpose: demo-only review acknowledgement; not a financial transaction.`;
  try {
    const signature = await window.ethereum.request({ method: "personal_sign", params: [message, state.account] });
    document.querySelector("#signature-result").textContent = `서명 생성: ${signature}`;
  } catch (error) { document.querySelector("#signature-result").textContent = "서명이 취소되었거나 실패했습니다."; console.error(error); }
}

async function init() {
  const response = await fetch("../data/demo-assets.json");
  if (!response.ok) throw new Error("Demo asset data could not be loaded.");
  state.assets = await response.json();
  state.selectedId = state.assets[0]?.id ?? null;
  renderSummary(); renderList(); renderDetail(); renderCalendar();
}

document.querySelector("#wallet-button").addEventListener("click", connectWallet);
init().catch((error) => { document.querySelector("#asset-detail").textContent = "데모 데이터를 불러오지 못했습니다."; console.error(error); });
