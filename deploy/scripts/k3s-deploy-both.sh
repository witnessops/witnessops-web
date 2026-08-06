#!/usr/bin/env bash
# Build ONE shared image from current HEAD and deploy to both:
#   - prod:  witnessops-web  (public via Caddy)
#   - dev:   witnessops-web-dev (mesh-only 10.44.0.2:3015)
#
# Usage:
#   ./k3s-deploy-both.sh
#   ./k3s-deploy-both.sh docker.io/library/witnessops-web:existing-tag
#   ALLOW_DIRTY=1 ./k3s-deploy-both.sh
#   DEPLOY_SSH=root@194.147.221.89 ./k3s-deploy-both.sh
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

IMAGE="${1:-}"
if [[ -z "${IMAGE}" ]]; then
  TAG="$(make_image_tag main)"
  IMAGE="$(build_shared_image "${TAG}")"
fi
log "shared IMAGE=${IMAGE}"

deploy_dev_image "${IMAGE}"
DEV_SUPPORT_STATUS="$(
  curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "${MESH_DEV_URL}/support" || true
)"
[[ "${DEV_SUPPORT_STATUS}" == "200" ]] \
  || die "dev support smoke returned HTTP ${DEV_SUPPORT_STATUS:-000} — production was not changed"
log "dev /support smoke OK (HTTP ${DEV_SUPPORT_STATUS})"
deploy_prod_image "${IMAGE}"
print_status
smoke_pair
log "both lanes on ${IMAGE}"
