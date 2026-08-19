#!/usr/bin/env bash
# Run pnpm health inside the same digest-pinned Node 22 base as deployment.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${NODE22_BUILDER_IMAGE:-node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32}"
# shellcheck source=../deploy/scripts/k3s-parity.sh
source "${ROOT}/deploy/scripts/k3s-parity.sh"
if ! validate_digest_container_image_ref "${IMAGE}"; then
  echo "health-on-node22: NODE22_BUILDER_IMAGE must be digest-qualified" >&2
  exit 1
fi
ALPINE_MODE=0
if [[ "$IMAGE" == *alpine* ]]; then
  ALPINE_MODE=1
fi
PNPM_VERSION="${PNPM_VERSION:-9.15.4}"
if [[ ! "${PNPM_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "health-on-node22: PNPM_VERSION must be a numeric semantic version" >&2
  exit 1
fi
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
GATE_BASE_REF="${SUPPLY_CHAIN_BASE_REF:-}"
if [[ -z "$GATE_BASE_REF" ]] && git -C "$ROOT" rev-parse --verify "origin/main^{commit}" >/dev/null 2>&1; then
  GATE_BASE_REF="$(git -C "$ROOT" merge-base HEAD origin/main)"
elif [[ -z "$GATE_BASE_REF" ]] && git -C "$ROOT" rev-parse --verify "HEAD^" >/dev/null 2>&1; then
  GATE_BASE_REF="HEAD^"
fi
if [[ -n "$GATE_BASE_REF" ]]; then
  GATE_ARGS+=(--base-ref "$GATE_BASE_REF")
fi

echo "[health-on-node22] Supply Chain Gate evidence=$GATE_EVIDENCE_DIR"
python3 "$ROOT/tools/supply-chain-gate/supply_chain_gate.py" "${GATE_ARGS[@]}"

echo "[health-on-node22] image=$IMAGE repo=$ROOT"
"$CONTAINER_CMD" run --rm \
  -v "$ROOT:/app:rw" \
  -w /app \
  -e CI=1 \
  -e "WOPS_PNPM_VERSION=${PNPM_VERSION}" \
  -e "WOPS_INSTALL_ALPINE_DEPS=${ALPINE_MODE}" \
  -- "$IMAGE" \
  sh -lc '
    set -eu
    if [ "$WOPS_INSTALL_ALPINE_DEPS" = "1" ]; then
      apk add --no-cache libc6-compat python3 make g++
    fi
    corepack enable
    corepack prepare "pnpm@${WOPS_PNPM_VERSION}" --activate
    node -v
    pnpm -v
    pnpm install --frozen-lockfile
    pnpm health
  '
echo "[health-on-node22] OK"
