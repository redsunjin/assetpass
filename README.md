# Asset Passport

GIWA Chain 위에서 토큰화 자산의 문서 해시, 검토 서명, 상태 이력, 공시 일정을 검증하는 **RWA 운영·증빙 레이어**다. 2026 GIWA GASOK의 `DeFi / RWA` 및 `GIWA-native Ideas` 트랙 제출을 위한 프로젝트다.

## 문제

RWA의 신뢰 문제는 토큰을 발행하는 데서 끝나지 않는다. 발행·운용·법무·감사·보유자가 서로 다른 문서의 최신성, 승인 책임, 공시 상태를 확인해야 한다. Asset Passport는 이 운영 증빙을 변경 추적 가능하게 만들고, GIWA Wallet 사용자가 읽기 전용으로 검증하게 한다.

## MVP 범위

- 가상 자산 3건의 등록과 라이프사이클 상태 관리
- 문서 버전과 SHA-256 해시 기록
- 발행자·검토자·감사자 역할의 지갑 서명/승인 이력
- GIWA 테스트넷 Asset Registry에 자산 ID·문서 해시·상태 변경 이력 기록
- 지갑 연결 사용자의 공개 검증 화면과 공시 캘린더

## 명시적 비범위

- 실제 자산 발행, 판매, 매매, 투자 권유
- 자금 보관·이체·배당 지급·수익률 표시
- 실명 투자자 데이터 또는 실제 계약서 처리
- 투자자 적격성·법적 공시 완전성·규제 준수의 자동 판정 또는 보장

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

최소 `AssetRegistry`와 자기완결형 Foundry 테스트, 의존성 없는 목록·상세·공시 일정·EVM 지갑 서명 미리보기 UI를 추가했다. 다음 구현 단위는 GIWA Sepolia에 Registry를 배포하고, 배포 주소를 연결한 뒤 3개 가상 자산을 초기화하는 일이다.
