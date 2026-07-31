# Asset Passport

Asset Passport는 AI가 온체인 자산 상태를 정기 점검하고 거래안을 만들면, **사람의 지갑 승인이 있어야만** GIWA에서 실행·증명되는 AI 기반 자산 통제(Asset Control) 도구다.

이 프로젝트는 2026 GIWA GASOK을 위한 테스트넷 MVP다. 기존 RWA 공시 Release Gate 가설에서 피벗해, AI 시대의 온체인 거래 통제라는 더 좁고 검증 가능한 문제에 집중한다.

## 첫 시연

`Asset Watcher`가 운영 지갑의 Test ETH 잔액 부족을 감지 → `Transaction Planner`가 허용된 보충 지갑으로 `0.001 Test ETH` 거래를 제안 → `Policy Guard`가 수신자와 한도를 검사 → 사람이 지갑으로 실행 → `Proof Keeper`가 GIWA tx hash를 영수증으로 대조한다.

AI는 개인키를 보유하거나 자동 이체하지 않는다. LLM은 설명과 제안을 보조하고, 정책 검사와 최종 실행은 규칙 엔진과 사람 지갑이 통제한다.

## 왜 GIWA인가

승인 대상 자체가 온체인 자산 거래이기 때문이다. 제안 해시·정책 해시·지갑 서명·실제 자산 이동을 같은 체인에서 대조할 수 있다. 일반적인 사내 결재·ERP를 블록체인에 억지로 올리는 제품은 아니다.

## 사용자 가설

- 초기: Web3 프로젝트, DAO, RWA 운영팀의 재무·운영 담당자
- 확장: 토큰화 자산의 정산·분배·지급을 운영하는 기업

풀 ERP, 법정화폐 회계, 세무·법률 판단, 투자 권유, 실제 자산 수탁은 범위 밖이다.

## 문서

- [AssetOps 제품 명세](docs/asset-passport-assetops-spec.md)
- [기존 RWA Release Gate 정의](docs/asset-passport-service-definition.md) — 피벗 전 가설 보관용
- [MVP 정렬 분석](docs/mvp-product-alignment-analysis.md) — 피벗 전 분석 보관용
- [GIWA 개발 노트](docs/giwa-developer-notes.md)

## 폴더

```text
contracts/       테스트넷용 정책 기반 Test ETH 실행 컨트랙트와 기존 증빙 Registry
app/             자산운영 콘솔 UI
docs/            제품 정의·제출·검증 문서
scripts/         하네스 및 로컬 검증 스크립트
```

## 현재 상태

로컬 MVP는 AI 에이전트 역할·거래 제안·정책 경계·지갑 연결 UX와 `AssetPassportController` 컨트랙트 테스트를 포함한다. 실제 GIWA 실행은 테스트넷 배포 주소를 `app/config.js`에 기록한 뒤에만 열어야 한다. 개인키나 실제 자금은 절대 사용하지 않는다.
