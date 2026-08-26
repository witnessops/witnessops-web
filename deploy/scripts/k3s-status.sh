#!/usr/bin/env bash
# Show prod + mesh-dev deployment image/ready state and run smoke_pair.
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

preflight_prod_target_identity

print_status || true
echo "---"
log "PROD_URL=${PROD_URL}"
log "MESH_DEV_URL=${MESH_DEV_URL}"
log "DEPLOY_SSH=${DEPLOY_SSH}"
smoke_pair || exit $?
