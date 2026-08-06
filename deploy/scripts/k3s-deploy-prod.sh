#!/usr/bin/env bash
# Deploy an image (or build first) to production k3s deployment witnessops-web.
#
# Usage:
#   ./k3s-deploy-prod.sh                 # build shared image, deploy prod
#   ./k3s-deploy-prod.sh IMAGE_REF       # deploy existing imported image
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

IMAGE="${1:-}"
if [[ -z "${IMAGE}" ]]; then
  TAG="$(make_image_tag main)"
  IMAGE="$(build_shared_image "${TAG}")"
fi

deploy_prod_image "${IMAGE}"
log "prod URL ${PROD_URL}"
PROD_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "${PROD_URL}/" || true)"
[[ "${PROD_CODE}" == "200" ]] || die "prod smoke failed (${PROD_CODE:-request error})"
log "prod_home=${PROD_CODE}"
log "done ${IMAGE}"
