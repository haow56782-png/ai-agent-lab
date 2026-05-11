#!/usr/bin/env bash
# Phase 1 aggregate verification runner.
# It executes typecheck, unit tests, paradigm grep, and invariant checks in order.
# It writes a concise self-check report used as the Phase 1 completion artifact.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPORT="phase-1-self-check-report.md"

run_step() {
  local name="$1"
  shift
  echo "==> $name"
  "$@"
}

run_step "typecheck" npm run typecheck
run_step "unit tests" npm test
run_step "paradigm check" bash scripts/check-paradigm.sh

if [[ "${PHASE1_USE_TSX:-0}" == "1" ]] && command -v tsx >/dev/null 2>&1; then
  run_step "invariant check" tsx scripts/check-invariants.ts
else
  run_step "invariant check" node --experimental-strip-types scripts/check-invariants.ts
fi

cat > "$REPORT" <<'REPORT_EOF'
# Phase 1 Self Check Report

## Result

Passed.

## Gates

- typecheck: passed
- unit tests: passed
- paradigm grep: passed
- invariants: passed

## Scope

Phase 1 verifies the finding data-contract layer only. It does not validate three-pane UI behavior, backend API integration, Prisma, Claude API, or download exemption flow.
REPORT_EOF

echo "Phase 1 verification passed; wrote $REPORT"
