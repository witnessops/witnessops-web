#!/usr/bin/env bash
# Free disk on the dual-lane k3s host so image deploys do not hit DiskPressure.
#
# Safe defaults: keep the newest KEEP_IMAGES witnessops-web tags, prune dangling
# images, vacuum journal, prune unused k3s containerd images.
#
# Usage (from laptop with SSH mesh):
#   bash deploy/scripts/k3s-disk-hygiene.sh
#   KEEP_IMAGES=5 DEPLOY_SSH=<private-target> DEPLOY_NS=<private-namespace> bash deploy/scripts/k3s-disk-hygiene.sh
#
# Does NOT delete the currently running deploy image tags if they match the
# newest KEEP_IMAGES list. Always re-run `pnpm deploy:k3s:both` after a full
# docker image wipe.
set -euo pipefail

: "${DEPLOY_SSH:?set DEPLOY_SSH from private topology custody}"
: "${PROD_TARGET_PROFILE:?set PROD_TARGET_PROFILE to the tracked production plane}"
: "${PROD_EXPECTED_HOSTNAME:?set PROD_EXPECTED_HOSTNAME from private topology custody}"
: "${PROD_EXPECTED_INSTANCE_ID:?set PROD_EXPECTED_INSTANCE_ID from private topology custody}"
: "${DEPLOY_NS:?set DEPLOY_NS from private topology custody}"
KEEP_IMAGES="${KEEP_IMAGES:-4}"
MIN_FREE_GB="${MIN_FREE_GB:-20}"
WITNESSOPS_PROD_TARGET_PROFILE="prod-aws-frankfurt"
WITNESSOPS_PROD_REGION="eu-central-1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=k3s-parity.sh
source "${SCRIPT_DIR}/k3s-parity.sh"
validate_ssh_target "${DEPLOY_SSH}" || {
  echo "k3s-disk-hygiene: invalid private SSH target" >&2
  exit 1
}
validate_kubernetes_name "${DEPLOY_NS}" || {
  echo "k3s-disk-hygiene: invalid private Kubernetes namespace" >&2
  exit 1
}
validate_bind_host "${PROD_EXPECTED_HOSTNAME}" || {
  echo "k3s-disk-hygiene: invalid expected production hostname" >&2
  exit 1
}
[[ "${PROD_EXPECTED_INSTANCE_ID}" =~ ^i-[0-9a-f]{8,32}$ ]] || {
  echo "k3s-disk-hygiene: invalid expected production instance identity" >&2
  exit 1
}
[[ "${KEEP_IMAGES}" =~ ^[0-9]+$ ]] && (( KEEP_IMAGES >= 1 && KEEP_IMAGES <= 100 )) || {
  echo "k3s-disk-hygiene: KEEP_IMAGES must be between 1 and 100" >&2
  exit 1
}
[[ "${MIN_FREE_GB}" =~ ^[0-9]+$ ]] && (( MIN_FREE_GB >= 1 && MIN_FREE_GB <= 10000 )) || {
  echo "k3s-disk-hygiene: MIN_FREE_GB must be between 1 and 10000" >&2
  exit 1
}

[[ "${PROD_TARGET_PROFILE}" == "${WITNESSOPS_PROD_TARGET_PROFILE}" ]] || {
  echo "k3s-disk-hygiene: refusing non-Frankfurt production target" >&2
  exit 1
}
observed_identity="$(
  ssh -o BatchMode=yes -o ConnectTimeout=25 "${DEPLOY_SSH}" bash -s <<'REMOTE'
set -eu
token="$(curl -fsS --connect-timeout 2 --max-time 5 -X PUT \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
  http://169.254.169.254/latest/api/token)"
hostname_value="$(hostname)"
instance_id="$(curl -fsS --connect-timeout 2 --max-time 5 \
  -H "X-aws-ec2-metadata-token: ${token}" \
  http://169.254.169.254/latest/meta-data/instance-id)"
region="$(curl -fsS --connect-timeout 2 --max-time 5 \
  -H "X-aws-ec2-metadata-token: ${token}" \
  http://169.254.169.254/latest/meta-data/placement/region)"
printf '%s|%s|%s' "${hostname_value}" "${instance_id}" "${region}"
REMOTE
)" || {
  echo "k3s-disk-hygiene: could not read production target identity" >&2
  exit 1
}
IFS='|' read -r observed_hostname observed_instance_id observed_region \
  <<<"${observed_identity}"
[[ "${observed_hostname}" == "${PROD_EXPECTED_HOSTNAME}" ]] || {
  echo "k3s-disk-hygiene: production target hostname mismatch" >&2
  exit 1
}
[[ "${observed_instance_id}" == "${PROD_EXPECTED_INSTANCE_ID}" ]] || {
  echo "k3s-disk-hygiene: production target instance identity mismatch" >&2
  exit 1
}
[[ "${observed_region}" == "${WITNESSOPS_PROD_REGION}" ]] || {
  echo "k3s-disk-hygiene: production target AWS region mismatch" >&2
  exit 1
}

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
kubectl -n '${DEPLOY_NS}' delete pods --field-selector=status.phase=Succeeded --force --grace-period=0 2>/dev/null || true
kubectl -n '${DEPLOY_NS}' delete pods --field-selector=status.phase=Failed --force --grace-period=0 2>/dev/null || true
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
