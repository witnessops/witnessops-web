#!/usr/bin/env bash
# Free disk on the dual-lane k3s host so image deploys do not hit DiskPressure.
#
# Safe defaults: keep the newest KEEP_IMAGES witnessops-web tags, prune dangling
# images, vacuum journal, prune unused k3s containerd images.
#
# Usage (from laptop with SSH mesh):
#   bash deploy/scripts/k3s-disk-hygiene.sh
#   KEEP_IMAGES=5 DEPLOY_SSH=ops-dev-01 bash deploy/scripts/k3s-disk-hygiene.sh
#
# Does NOT delete the currently running deploy image tags if they match the
# newest KEEP_IMAGES list. Always re-run `pnpm deploy:k3s:both` after a full
# docker image wipe.
set -euo pipefail

DEPLOY_SSH="${DEPLOY_SSH:-ops-dev-01}"
KEEP_IMAGES="${KEEP_IMAGES:-4}"
MIN_FREE_GB="${MIN_FREE_GB:-20}"

ssh -o BatchMode=yes -o ConnectTimeout=25 "${DEPLOY_SSH}" "set -euo pipefail
KEEP_IMAGES='${KEEP_IMAGES}'
echo '=== disk before ==='
df -h /
echo '=== keep newest ${KEEP_IMAGES} witnessops-web tags ==='
mapfile -t ALL_TAGS < <(docker images docker.io/library/witnessops-web --format '{{.Tag}}' 2>/dev/null || true)
if [[ \${#ALL_TAGS[@]} -gt \${KEEP_IMAGES} ]]; then
  for tag in \"\${ALL_TAGS[@]:\${KEEP_IMAGES}}\"; do
    [[ -n \"\${tag}\" ]] || continue
    echo \"rmi witnessops-web:\${tag}\"
    docker rmi -f \"docker.io/library/witnessops-web:\${tag}\" 2>/dev/null || docker rmi -f \"witnessops-web:\${tag}\" 2>/dev/null || true
  done
fi
docker container prune -f >/dev/null 2>&1 || true
docker builder prune -af >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true
k3s crictl rmi --prune >/dev/null 2>&1 || true
journalctl --vacuum-size=200M >/dev/null 2>&1 || true
rm -rf /tmp/witnessops-web-build-* 2>/dev/null || true
kubectl -n witnessops delete pods --field-selector=status.phase=Succeeded --force --grace-period=0 2>/dev/null || true
kubectl -n witnessops delete pods --field-selector=status.phase=Failed --force --grace-period=0 2>/dev/null || true
echo '=== disk after ==='
df -h /
free_gb=\$(df -P / | awk 'NR==2 {printf \"%d\", \$4/1024/1024}')
echo \"free_gb=\${free_gb} min=${MIN_FREE_GB}\"
if [[ \"\${free_gb}\" -lt '${MIN_FREE_GB}' ]]; then
  echo \"WARN: free disk below ${MIN_FREE_GB}G — prune more or expand volume before deploy\" >&2
  exit 2
fi
dp=\$(kubectl get node -o jsonpath='{.items[0].status.conditions[?(@.type==\"DiskPressure\")].status}' 2>/dev/null || echo Unknown)
echo \"DiskPressure=\${dp}\"
if [[ \"\${dp}\" == \"True\" ]]; then
  echo \"WARN: kubelet still reports DiskPressure; wait or free more space\" >&2
  exit 3
fi
echo 'hygiene OK'
"
