#!/usr/bin/env bash
# Phase 1 paradigm grep: fail fast when core code reintroduces page-centric state.
# This script checks the new data-contract layer, not historical UI debt.
# It is intentionally small so it can run in local dev and CI.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ERRORS=0

check_absent() {
  local pattern="$1"
  local target="$2"
  local message="$3"
  if rg -n "$pattern" "$target" >/tmp/phase1-paradigm-hit.txt 2>/dev/null; then
    echo "ERROR: $message"
    cat /tmp/phase1-paradigm-hit.txt
    ERRORS=$((ERRORS + 1))
  fi
}

check_absent "currentPage|activeRuleId|ruleActions" "src/core/finding src/core/rule" "core finding/rule code must not own legacy UI state"
check_absent "rulePath.*page|page.*rulePath" "src/core/finding src/core/rule" "rulePath must not be inferred from page"
check_absent "from ['\\\"].*components|from ['\\\"].*screens|from ['\\\"].*api" "src/core/finding src/core/rule" "core finding/rule code must not depend on UI screens/components/api"

if [[ "$ERRORS" -gt 0 ]]; then
  exit 1
fi

echo "Phase 1 paradigm check passed"

