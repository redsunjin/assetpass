# GIWA 개발 노트

2026-07-21에 공식 문서로 확인한 Asset Passport MVP의 개발 기준이다. 네트워크와 SDK 정보는 배포 직전에 공식 문서에서 다시 확인한다.

## 공식 개발 진입점

- 문서 홈: <https://docs.giwa.io>
- 전체 문서 색인: <https://docs.giwa.io/llms.txt>
- 체인 연결: <https://docs.giwa.io/get-started/connect-to-giwa>
- 테스트 ETH Faucet: <https://docs.giwa.io/get-started/faucets>
- 스마트 컨트랙트 개발 안내: <https://docs.giwa.io/get-started/smart-contract/develop>
- Foundry: <https://docs.giwa.io/get-started/smart-contract/develop/foundry>
- Hardhat: <https://docs.giwa.io/get-started/smart-contract/develop/hardhat>
- Remix: <https://docs.giwa.io/get-started/smart-contract/develop/remix-ide>
- 온체인 검증(DoJang/OnchainVerifiable): <https://docs.giwa.io/get-started/smart-contract/onchainverifiable>
- 테스트넷 컨트랙트 주소: <https://docs.giwa.io/network-information/contracts>

## 테스트넷 설정

| 항목 | 값 |
|---|---|
| 이름 | GIWA Sepolia |
| Chain ID | `91342` |
| RPC | `https://sepolia-rpc.giwa.io` |
| Flashblocks RPC | `https://sepolia-rpc-flashblocks.giwa.io` |
| 통화 | Test ETH |
| Explorer | <https://sepolia-explorer.giwa.io> |

공용 RPC에는 rate limit이 있으므로 MVP 배포와 데모에는 적합하지만 운영 서비스의 유일한 RPC로 쓰지 않는다.

## 도구 선택

GIWA는 EVM 호환 L2다. 공식 문서는 Foundry, Hardhat, Remix를 직접 지원 경로로 제시한다. 별도 GIWA 전용 프론트엔드 SDK가 필수라는 문서는 확인되지 않았으므로, 앱은 표준 EVM 라이브러리(`viem` + `wagmi` 또는 `ethers`)로 구성한다.

- 컨트랙트와 테스트: **Foundry**
- 웹 앱: **TypeScript + viem + wagmi**
- 지갑/테스트넷 데모: **MetaMask + GIWA Sepolia**

## 지갑 관련 정정

공식 체인 연결 문서상 GIWA Wallet은 아직 개발 중이다. 따라서 현재 MVP는 GIWA Wallet 인앱 탑재나 실제 GIWA Wallet 서명을 약속하지 않는다. 대신 `GIWA 호환 EVM 지갑으로 검증·서명 가능한 UX`를 구현하고, GIWA Wallet 공개 후 자연스러운 연동 후보임을 설명한다.

## OnchainVerifiable의 사용 원칙

GIWA에는 `OnchainVerifier`가 배포되어 있고, 특정 지갑의 검증 상태를 조회하는 `isVerified` 기능이 있다. Asset Passport MVP는 실명·투자자 적격성·KYC를 다루지 않으므로 이를 MVP의 의존성으로 쓰지 않는다. 외부 파일럿에서 법무·개인정보 검토를 거친 뒤 역할 기반 접근 제어 후보로만 검토한다.
