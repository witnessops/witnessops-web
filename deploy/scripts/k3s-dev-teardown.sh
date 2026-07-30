#!/usr/bin/env bash
# Remove mesh-dev deployment only (prod untouched).
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

log "deleting ${DEPLOY_NS}/${DEV_DEPLOY}"
remote "kubectl -n '${DEPLOY_NS}' delete deploy '${DEV_DEPLOY}' --ignore-not-found"
log "done"
