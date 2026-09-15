#!/usr/bin/env bash
# Registry transport only; never installed in the application image.
set -euo pipefail
out="${1:?private tools directory required}"
mkdir -p "${out}"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  https://github.com/regclient/regclient/releases/download/v0.11.6/regctl-linux-amd64 \
  -o "${out}/regctl"
printf '%s  %s\n' 8e0e62a497fcdb8048d18aa927a139613176ba0531f412bc541044e28f9856bd "${out}/regctl" | sha256sum -c -
chmod 700 "${out}/regctl"
