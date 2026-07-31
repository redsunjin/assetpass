# Agent Status

- Goal: 2026 GIWA GASOK에 Asset Passport를 제출하고, 2026-07-31까지 사람이 승인한 거래만 실행되는 안전한 AI 기반 온체인 AssetOps MVP를 완성한다.
- Phase: locally validated AssetOps agent-control demo and policy-gated contract ready for testnet deployment
- Detected mode: Foundry project + dependency-free browser UI
- Method: gsd
- Next action: deploy the tested `AssetPassportController` only after explicit authorization, set an allowlisted payee/limit, then connect a GIWA test transaction and Proof Keeper receipt.
- Latest validation: `scripts/agent-harness.sh` passed with 6/6 Foundry tests, agent-manifest authority checks, deterministic Watcher/Planner policy scenarios, and static UI checks.
- Blockers: local Ollama inference previously returned HTTP 500 because macOS `MTLCompilerService` was unavailable. The demo keeps LLM optional; policy evaluation is deterministic. Test ETH and explicit authorization are required before any GIWA Sepolia deployment or on-chain execution.
