#!/usr/bin/env bash
# Run pnpm health inside Node 22 (default: node:22-alpine — matches deploy/Dockerfile.mesh).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${NODE22_BUILDER_IMAGE:-node:22-alpine}"
ALPINE_DEPS=''
if [[ "$IMAGE" == *alpine* ]]; then
  ALPINE_DEPS='apk add --no-cache libc6-compat python3 make g++ &&'
fi
PNPM_VERSION="${PNPM_VERSION:-9.15.4}"
CONTAINER_CMD="${CONTAINER_CMD:-docker}"

command -v "$CONTAINER_CMD" >/dev/null || {
  echo "health-on-node22: need $CONTAINER_CMD (or set CONTAINER_CMD=podman)" >&2
  exit 1
}

command -v python3 >/dev/null || {
  echo "health-on-node22: need python3 for the Supply Chain Gate" >&2
  exit 1
}

GATE_EVIDENCE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-supply-chain-gate.XXXXXX")"
GATE_ARGS=(
  --repo-root "$ROOT"
  --lockfile pnpm-lock.yaml
  --output-dir "$GATE_EVIDENCE_DIR"
)
if git -C "$ROOT" rev-parse --verify "HEAD^{commit}" >/dev/null 2>&1; then
  GATE_ARGS+=(--base-ref HEAD)
fi

echo "[health-on-node22] Supply Chain Gate evidence=$GATE_EVIDENCE_DIR"
python3 "$ROOT/tools/supply-chain-gate/supply_chain_gate.py" "${GATE_ARGS[@]}"

echo "[health-on-node22] image=$IMAGE repo=$ROOT"
"$CONTAINER_CMD" run --rm \
  -v "$ROOT:/app:rw" \
  -w /app \
  -e CI=1 \
  "$IMAGE" \
  bash -lc "
    set -euo pipefail
    ${ALPINE_DEPS}
    corepack enable
    corepack prepare pnpm@${PNPM_VERSION} --activate
    node -v
    pnpm -v
    pnpm install --frozen-lockfile
    pnpm health
  "
echo "[health-on-node22] OK"
