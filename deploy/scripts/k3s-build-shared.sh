#!/usr/bin/env bash
# Build one shared image from current HEAD and import into ops-dev-01 k3s.
# Does not deploy.
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

PURPOSE="${1:-main}"
TAG="$(make_image_tag "${PURPOSE}")"
IMAGE="$(build_shared_image "${TAG}")"
log "IMAGE=${IMAGE}"
printf '%s\n' "${IMAGE}"
