#!/usr/bin/env bash
# Start the public site once. package.json already binds 127.0.0.1:3001.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if (echo >/dev/tcp/127.0.0.1/3001) >/dev/null 2>&1; then
  echo "dev server already listening on 127.0.0.1:3001"
  exit 0
fi
exec pnpm --filter witnessops-web dev
