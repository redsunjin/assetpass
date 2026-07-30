#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== local checks =="

required_files=(
  README.md
  docs/gasok-application-brief.md
  docs/product-spec.md
  docs/mvp-plan.md
  docs/submission-checklist.md
  docs/giwa-developer-notes.md
  data/demo-assets.json
)

for file in "${required_files[@]}"; do
  test -f "$file"
done

node -e '
  const fs = require("fs");
  const assets = JSON.parse(fs.readFileSync("data/demo-assets.json", "utf8"));
  if (!Array.isArray(assets) || assets.length !== 3) throw new Error("Expected three demo assets");
  for (const asset of assets) {
    if (!asset.id || !asset.name || !asset.notice?.includes("데모용 가상 자산")) {
      throw new Error("Each demo asset needs an id, name, and demo-only notice");
    }
  }
'

rg -q "투자 권유" README.md docs/product-spec.md docs/gasok-application-brief.md
node scripts/contract-static-check.mjs
node --check app/app.js
node scripts/ui-static-check.mjs
test -f .env.example
test -f contracts/script/DeployAssetRegistry.s.sol
test -f contracts/script/InitializeDemoAssets.s.sol
test -f docs/testnet-runbook.md
echo "Project metadata and demo-data checks passed."
exit 0
