#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== agent harness =="

scripts/check.sh
scripts/smoke.sh

if [ -x scripts/coverage.sh ]; then
  scripts/coverage.sh
fi

echo "== harness complete =="
