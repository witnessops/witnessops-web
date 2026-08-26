#!/usr/bin/env bash
# Fair smoke: prod public vs mesh-dev must both return 200 and matching CSS when aligned.
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

preflight_prod_target_identity

print_status || true
smoke_pair
