#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
caddy_file="${1:-$root_dir/deploy/Caddyfile.witnessops-canonical-host}"

if ! command -v caddy >/dev/null 2>&1; then
  echo "caddy is required to validate $caddy_file" >&2
  exit 1
fi

caddy validate --config "$caddy_file" --adapter caddyfile
