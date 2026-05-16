#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
API_DIR="$ROOT_DIR/services/api-gateway"
SKILL_DIR="$ROOT_DIR/.claude/skills/word-system-skill"
TSX="$API_DIR/node_modules/.bin/tsx"
TSC="$API_DIR/node_modules/.bin/tsc"

if [[ ! -x "$TSX" ]]; then
  echo "Missing tsx runtime at $TSX. Run npm install in $API_DIR first." >&2
  exit 1
fi

for test_file in "$SKILL_DIR"/tests/*.test.ts; do
  "$TSX" "$test_file"
done

"$TSC" \
  --noEmit \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --allowImportingTsExtensions \
  --skipLibCheck \
  "$SKILL_DIR"/src/*.ts \
  "$SKILL_DIR"/tests/*.test.ts

"$TSX" "$SKILL_DIR/src/regression-runner.ts"
