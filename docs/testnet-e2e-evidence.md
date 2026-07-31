# GIWA Sepolia E2E 증빙

실행일: 2026-07-31  
네트워크: GIWA Sepolia (chain ID 91342)  
범위: 테스트 전용 지갑과 Test ETH만 사용

## Controller

- 주소: [`0x4fbD9a0458930A76d6ceCf3B572A093dD9E3dc5f`](https://sepolia-explorer.giwa.io/address/0x4fbD9a0458930A76d6ceCf3B572A093dD9E3dc5f)
- 배포: [`0xc3ce…38f0e`](https://sepolia-explorer.giwa.io/tx/0xc3ce52683a138dbb8bd92d54d7fe326a4afe9eb44adcd49e641dea2c78438f0e)
- 소유자: 테스트 전용 지갑 `0x2016…8C84`

## 실제 실행 순서

1. 허용 수신 계정 `0x8A45…3E19`와 건당 한도 `0.005 Test ETH`를 등록했다.  
   [`PayeePolicyUpdated`](https://sepolia-explorer.giwa.io/tx/0x46048e6a33866197c7c77e1dbd63cb5cd62336ce4a4dea4d67b5b1a0312ff512)
2. Controller에 `0.002 Test ETH`를 예치했다.  
   [`Funded`](https://sepolia-explorer.giwa.io/tx/0xa6beebbb2362efa80cbf44622cfd93bb3aa14eeb6c4e5a306b65d12cfb1ebfc7)
3. MVP 거래안과 같은 값으로 `0.001 Test ETH`를 실행했다.  
   [`PaymentExecuted`](https://sepolia-explorer.giwa.io/tx/0xfc67718e69ac3bdcba54b18057f39eb9b1c51099195b91328a8eccd47b989871)

## 대조 값

- proposal hash: `0x8d64734115b3ff2ebbf24d16337636a0854e5740cd1b4d66bcf4d872ab3ccb07`
- policy hash: `0x94ea950b679bdbe5e16a9036ef411219b8f295bfd1f6054620593cc04cee3f01`
- 수신자: `0x8A45D58f4f9D774A50E33D4C34eEDC1C7aA13E19`
- 실행 금액: `0.001 Test ETH`
- 같은 proposal hash를 다시 실행하는 체인 시뮬레이션은 `ProposalAlreadyExecuted`로 거절됐다.

이 실행은 테스트 전용 CLI 지갑으로 수행했다. 브라우저 지갑 팝업을 통한 수동 승인 경험은 공개 MVP에서 별도로 확인해야 한다.
