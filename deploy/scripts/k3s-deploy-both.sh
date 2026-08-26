#!/usr/bin/env bash
# Build ONE shared image from current HEAD and deploy to both:
#   - prod: configured public deployment behind Caddy
#   - dev:  configured private mesh deployment
#
# Usage:
#   ./k3s-deploy-both.sh
#   ./k3s-deploy-both.sh docker.io/library/witnessops-web@sha256:<manifest-digest>
#   ALLOW_DIRTY=1 ./k3s-deploy-both.sh
# Required private topology variables are listed in deploy/topology.env.example.
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

# A dual-lane invocation must prove the Frankfurt production target before a
# build or mesh-dev mutation, even when an existing image is supplied.
preflight_prod_target_identity

IMAGE="${1:-}"
if [[ -z "${IMAGE}" ]]; then
  TAG="$(make_image_tag main)"
  IMAGE="$(build_shared_image "${TAG}")"
fi
log "shared IMAGE=${IMAGE}"

# A dual-lane deploy must fail before either lane mutates if the shared runtime
# Secrets are unavailable or the admin OIDC Secret is incomplete. The prod
# deploy retains its own preflight for safe standalone use.
preflight_remote_admin_secrets

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
