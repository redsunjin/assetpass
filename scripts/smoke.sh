#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== smoke checks =="

if command -v forge >/dev/null 2>&1; then
  forge build
  forge test -vvv
else
  echo "SKIP: Foundry is not installed; contracts/test/AssetRegistry.t.sol was not compiled or executed."
fi
exit 0
