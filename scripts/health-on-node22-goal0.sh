#!/usr/bin/env bash
# Run health-on-node22.sh on goal0-edge-01 via bastion (different node than fleet VM).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
LANE_TOP="${LANE_TOP:-$(cd "$HERE/../../../.." && pwd)}"
if [[ ! -x "$LANE_TOP/working/scripts/goal0-ssh-via-bastion.sh" ]]; then
  LANE_TOP="${HOME}/DEV/OffSec"
fi
BASTION_WRAPPER="${BASTION_WRAPPER:-$LANE_TOP/working/scripts/goal0-ssh-via-bastion.sh}"
REPO_ON_GOAL0="${REPO_ON_GOAL0:-/opt/goal0/sources/witnessops-web}"

[[ -x "$BASTION_WRAPPER" ]] || {
  echo "health-on-node22-goal0: missing $BASTION_WRAPPER" >&2
  exit 1
}

REMOTE="cd '$REPO_ON_GOAL0' && bash scripts/health-on-node22.sh"
echo "[health-on-node22-goal0] $REPO_ON_GOAL0"
"$BASTION_WRAPPER" bash -lc "$REMOTE"