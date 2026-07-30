#!/usr/bin/env bash
# Deploy mesh-only dev (10.44.0.2:3015) to k3s deployment witnessops-web-dev.
#
# Usage:
#   ./k3s-deploy-dev.sh                 # build shared image, deploy dev
#   ./k3s-deploy-dev.sh IMAGE_REF       # deploy existing imported image
#
# Requires WireGuard mesh for local smoke (10.44.0.2). Hub must allow peer TCP:
#   ufw route allow in on wg0 out on wg0 from 10.44.0.0/24 to 10.44.0.0/24
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
curl -sS -o /dev/null -w "dev_home=%{http_code}\n" --max-time 15 "${MESH_DEV_URL}/" \
  || die "dev smoke failed — ensure WG is up (sudo wg-quick up wg-edge-01) and hub mesh-peer rule is present"
log "done ${IMAGE}"
