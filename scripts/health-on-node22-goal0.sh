#!/usr/bin/env bash
# Historical optional remote Node 22 staging helper; topology remains private.
set -euo pipefail
BASTION_WRAPPER="${BASTION_WRAPPER:?set BASTION_WRAPPER from private topology custody}"
REMOTE_HEALTH_REPO="${REMOTE_HEALTH_REPO:?set REMOTE_HEALTH_REPO from private topology custody}"

[[ -x "$BASTION_WRAPPER" ]] || {
  echo "health-on-node22-remote: wrapper is missing or not executable" >&2
  exit 1
}
[[ "${REMOTE_HEALTH_REPO}" =~ ^/[A-Za-z0-9._/-]+$ ]] || {
  echo "health-on-node22-remote: invalid repository path" >&2
  exit 1
}

REMOTE="cd '${REMOTE_HEALTH_REPO}' && bash scripts/health-on-node22.sh"
echo "[health-on-node22-remote] running configured repository health"
"$BASTION_WRAPPER" bash -lc "$REMOTE"
