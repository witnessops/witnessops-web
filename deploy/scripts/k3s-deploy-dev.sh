#!/usr/bin/env bash
# Deploy the configured mesh-only development lane.
#
# Usage:
#   ./k3s-deploy-dev.sh                 # build shared image, deploy dev
#   ./k3s-deploy-dev.sh IMAGE_REF       # deploy existing imported image
#
# Requires the custodied private network path for local smoke.
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

IMAGE="${1:-}"
if [[ -z "${IMAGE}" ]]; then
  TAG="$(make_image_tag main)"
  IMAGE="$(build_shared_image "${TAG}")"
fi

deploy_dev_image "${IMAGE}"
log "dev URL ${MESH_DEV_URL}"
DEV_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "${MESH_DEV_URL}/" || true)"
[[ "${DEV_CODE}" == "200" ]] \
  || die "dev smoke failed (${DEV_CODE:-request error}) — confirm the private network path is active"
log "dev_home=${DEV_CODE}"
log "done ${IMAGE}"
