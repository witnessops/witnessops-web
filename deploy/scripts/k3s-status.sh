#!/usr/bin/env bash
# Show prod + mesh-dev deployment image/ready state and run smoke_pair.
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

preflight_prod_target_identity

print_status || true
echo "---"
log "public production URL configured"
log "private mesh URL configured"
log "private SSH target configured"
smoke_pair || exit $?
