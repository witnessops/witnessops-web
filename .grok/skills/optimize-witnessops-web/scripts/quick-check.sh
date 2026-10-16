#!/usr/bin/env bash
# Fast optimization/regression check after proof or verify/mesh-gate edits.
# Failures stay visible: proof:test stderr is not discarded, and a failing
# proof:test does not fall through to a smaller subset.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"
if ! node --import tsx -e "0" 2>/dev/null; then
  echo "quick-check: run 'pnpm install' (or corepack + pnpm) so tsx is available" >&2
  exit 1
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "quick-check: host Node $(node -v) — OK for targeted tests; run pnpm health:node22 or goal0 mesh build for release (see docs/NODE22-BUILDER.md)" >&2
fi
PNPM=(pnpm)
if ! command -v pnpm >/dev/null 2>&1; then
  PNPM=(npx --yes pnpm@9.15.4)
fi
"${PNPM[@]}" proof:test
APP="$ROOT/apps/witnessops-web"
export TSX_TSCONFIG_PATH=tsconfig.test.json
(
  cd "$APP"
  node --import tsx --test \
    src/app/api/verify/route.test.ts \
    src/app/api/mesh-gate/route.test.ts
)
echo "quick-check: OK"