# Asset Passport

AI가 공시 전 위험을 먼저 제안하고, 사람이 승인한 최신 공개 상태만 GIWA에 증명하는 **RWA AI Release Gate**다. 2026 GIWA GASOK의 `DeFi / RWA` 및 `GIWA-native Ideas` 트랙 제출을 위한 프로젝트다.

## 문제

RWA의 신뢰 문제는 토큰을 발행하는 데서 끝나지 않는다. 공시 직전에는 문서가 바뀌고 검토가 늦어지며, 이전 버전에 묶인 승인이 그대로 남을 수 있다. Asset Passport는 AI가 그 위험과 다음 행동을 먼저 제안하고, 책임자가 지갑으로 승인한 사실만 변경 추적 가능하게 만든다.

## MVP 범위

- 가상 자산 3건의 등록과 라이프사이클 상태 관리
- 문서 버전과 SHA-256 해시 기록
- AI Release Copilot의 공시 위험·증빙 누락·승인 연결 사전 점검 제안
- 관리자 콘솔: 지갑·역할·GIWA 네트워크 상태, AI 제공 방식, 에이전트 책임 범위, 공개 절차 단계 표시
- 선택적 로컬 Ollama 사전 점검: 원본 문서 없이 메타데이터만 `localhost`로 전송 (외부 AI는 보안 릴레이 전까지 비활성)
- 발행자·검토자·감사자 역할의 지갑 서명/승인 이력
- GIWA 테스트넷 Asset Registry에 자산 ID·문서 해시·상태 변경 이력 기록
- 지갑 연결 사용자의 공개 검증 화면과 공시 캘린더

## 명시적 비범위

- 실제 자산 발행, 판매, 매매, 투자 권유
- 자금 보관·이체·배당 지급·수익률 표시
- 실명 투자자 데이터 또는 실제 계약서 처리
- 투자자 적격성·법적 공시 완전성·규제 준수의 자동 판정 또는 보장
- AI의 자동 승인·자동 공시·법률 판단

이 프로젝트는 법률 자문이나 금융서비스가 아니라, 샘플 데이터 기반의 운영·증빙 소프트웨어 데모다.

## 빠른 길잡이

- [GASOK 지원 브리프](docs/gasok-application-brief.md)
- [제품 명세](docs/product-spec.md)
- [MVP 실행 계획](docs/mvp-plan.md)
- [제출 체크리스트](docs/submission-checklist.md)
- [GIWA 개발 노트](docs/giwa-developer-notes.md)
- [Definition of Done](docs/definition-of-done.md)

## 폴더

```text
contracts/       GIWA 테스트넷 Asset Registry 스마트컨트랙트
app/             운영 콘솔 및 공개 검증 UI
docs/            지원서, 제품, 검증 문서
data/            명확히 가상임을 표시한 데모 자산 데이터
scripts/         하네스 및 로컬 검증 스크립트
```

## 현재 상태

최소 `AssetRegistry`와 자기완결형 Foundry 테스트, AI 위험 제안 → 사람의 지갑 승인 → GIWA 증명으로 이어지는 의존성 없는 브라우저 데모를 추가했다. 다음 구현 단위는 GIWA Sepolia에 Registry를 배포하고, 배포 주소를 연결한 뒤 가상 자산의 차단·승인·공개·검증 이력을 초기화하는 일이다.
