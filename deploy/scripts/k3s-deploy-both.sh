#!/usr/bin/env bash
# Build ONE shared image from current HEAD and deploy to both:
#   - prod:  witnessops-web  (public via Caddy)
#   - dev:   witnessops-web-dev (mesh-only 10.44.0.2:3015)
#
# Usage:
#   ./k3s-deploy-both.sh
#   ALLOW_DIRTY=1 ./k3s-deploy-both.sh
#   DEPLOY_SSH=root@194.147.221.89 ./k3s-deploy-both.sh
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

TAG="$(make_image_tag main)"
IMAGE="$(build_shared_image "${TAG}")"
log "shared IMAGE=${IMAGE}"

deploy_prod_image "${IMAGE}"
deploy_dev_image "${IMAGE}"
print_status
smoke_pair
log "both lanes on ${IMAGE}"
