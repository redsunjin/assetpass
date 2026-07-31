#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== local checks =="

required_files=(
  README.md
  docs/asset-passport-assetops-spec.md
  data/agent-manifest.json
  docs/gasok-application-brief.md
  docs/product-spec.md
  docs/mvp-plan.md
  docs/submission-checklist.md
  docs/giwa-developer-notes.md
)

for file in "${required_files[@]}"; do
  test -f "$file"
done

rg -q "Asset Watcher" README.md docs/asset-passport-assetops-spec.md app/index.html
rg -q "자동 이체" README.md docs/asset-passport-assetops-spec.md
node scripts/contract-static-check.mjs
node scripts/agent-contract-check.mjs
node scripts/agent-engine-test.mjs
node scripts/journey-state-test.mjs
node --check app/app.js
node --check app/agent-engine.mjs
node scripts/ui-static-check.mjs
node scripts/sync-public-demo.mjs --check
test -f .env.example
test -f contracts/src/AssetPassportController.sol
test -f contracts/test/AssetPassportController.t.sol
test -f contracts/script/DeployAssetPassportController.s.sol
test -f app/assets/assetops-icons.svg
test -f docs/testnet-runbook.md
echo "Project metadata and demo-data checks passed."
exit 0
