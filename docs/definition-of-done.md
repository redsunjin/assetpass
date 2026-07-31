# Definition Of Done

## Goal

2026 GIWA GASOK에 Asset Passport를 제출하고, 2026-07-31까지 사람이 승인한 거래만 실행되는 안전한 AI 기반 온체인 AssetOps MVP를 완성한다.

## Method

gsd

## Required Local Validation

- `scripts/check.sh` verifies required project documents, AI agent manifest/authority boundaries, deterministic agent scenarios, contract safety markers, and UI syntax/flow markers.

## Smoke Validation

- `scripts/smoke.sh` compiles and runs Foundry contract tests when Foundry is installed.

## Completion Criteria

- The requested behavior is implemented.
- `scripts/agent-harness.sh` runs without unexpected failures, or skipped checks are explicitly reported.
- Core user flow is verified by automated or manual smoke testing.
- Worklog and status reflect the latest state.
- Final response includes changed files, validation results, and remaining risks.

## Detection Notes

- Foundry is available locally for contract compilation and tests.
- Method explicitly selected: gsd.
