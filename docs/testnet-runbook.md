# GIWA Sepolia AssetOps 실행 런북

이 런북은 **테스트 전용 지갑과 GIWA Sepolia Test ETH만** 사용한다. 개인키·복구 구문·실제 자산을 채팅이나 브라우저 화면에 입력하지 않는다.

## 완료 장면

`Watcher 잔액 부족 감지 → Planner 거래안 → Policy Guard 통과 → 지갑 승인 → Controller 실행 → Explorer 영수증`

AI는 제안과 설명만 한다. 컨트랙트 소유자인 사람 지갑만 정책을 등록하고, 허용된 거래를 실행한다.

## 사전 조건

- GIWA Sepolia Test ETH가 든 새 테스트 전용 EVM 지갑 1개
- 테스트 전용 수신 지갑 1개 (`0x8A45D58f4f9D774A50E33D4C34eEDC1C7aA13E19`은 현재 데모 수신자)
- 공식 Faucet에서 받은 Test ETH만 사용
- `.env.example`을 `.env`로 복사하고 아래 값만 로컬에서 설정

```bash
PRIVATE_KEY=<test-only deployment wallet private key>
ASSET_PASSPORT_OWNER=<same test-only wallet address>
```

`PRIVATE_KEY`와 `.env`는 절대 커밋하지 않는다.

## 1. 로컬 검증과 드라이런

```bash
scripts/agent-harness.sh
set -a && source .env && set +a
forge script contracts/script/DeployAssetPassportController.s.sol:DeployAssetPassportController \
  --rpc-url https://sepolia-rpc.giwa.io
```

드라이런 출력에서 owner가 테스트 지갑인지, 배포 대상이 `AssetPassportController`인지 확인한다.

## 2. 배포 (명시적 승인 후에만)

```bash
set -a && source .env && set +a
forge script contracts/script/DeployAssetPassportController.s.sol:DeployAssetPassportController \
  --rpc-url https://sepolia-rpc.giwa.io --broadcast
```

배포 주소와 tx hash를 기록하고, 공개 주소만 `app/config.js`의 `controllerAddress`에 넣는다. `scripts/sync-public-demo.mjs`로 Pages 사본도 함께 갱신한다.

## 3. 사람 지갑으로 정책 등록

1. MVP를 열고 테스트 지갑을 GIWA Sepolia에 연결한다.
2. **통제 정책 · 연결**에서 `지갑으로 정책 등록`을 누른다.
3. 수신자와 건당 한도 `0.005 Test ETH`를 지갑에서 확인한다.
4. Explorer에서 `PayeePolicyUpdated` 이벤트를 확인한다.

이 호출은 owner만 가능하다. 실패하면 다른 지갑으로 정책을 바꾸지 말고, 연결한 지갑과 배포 때 지정한 owner 주소가 같은지 먼저 확인한다.

## 4. 컨트랙트에 Test ETH 예치

테스트 지갑에서 Controller 주소로 **0.002 Test ETH 이하**를 직접 전송한다. 이 금액은 데모 제안 `0.001 Test ETH` 1회와 여유분만을 위한 것이다. Explorer에서 `Funded` 이벤트와 잔액을 확인한다.

## 5. 거래안 실행과 영수증 대조

1. **자산 현황**에서 Watcher를 실행해 부족 감지와 거래안을 확인한다.
2. 수신자·금액·근거·정책 한도를 확인한 뒤 `내용 확인 후 지갑으로 실행`을 누른다.
3. 지갑 팝업에서 Controller 호출과 Test ETH 금액을 확인해 승인한다.
4. 화면의 Explorer 링크에서 `PaymentExecuted` 이벤트, proposal hash, policy hash, approver, recipient, amount를 대조한다.
5. 같은 proposal은 두 번 실행되지 않아야 한다. 두 번째 실행은 `ProposalAlreadyExecuted`으로 거절되는 것이 정상이다.

## 기록할 증빙

- Controller 배포 주소와 tx hash
- 정책 등록 tx hash
- Test ETH 예치 tx hash
- 실행 tx hash와 Explorer 링크
- MVP 화면에서 제안·정책·영수증이 같은 수신자와 금액을 가리키는 캡처

## 중단 기준

- 실제 자산이 든 지갑, 메인넷, 실제 ETH가 감지되면 즉시 중단한다.
- 수신자·한도·네트워크가 화면과 다르면 실행하지 않는다.
- LLM 연결이 실패해도 규칙 엔진과 사람 승인 경계는 유지된다. LLM 오류를 우회하려고 자동 실행을 켜지 않는다.
