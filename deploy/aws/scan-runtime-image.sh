#!/usr/bin/env bash
# Independent npm + OS scan of the exact local image, before archive transfer.
set -euo pipefail
image="${1:?OCI archive required}"
out="${2:?output directory required}"
mkdir -p "${out}"
tools="$(mktemp -d)"
trap 'rm -rf "${tools}"' EXIT
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  https://github.com/aquasecurity/trivy/releases/download/v0.74.0/trivy_0.74.0_Linux-64bit.tar.gz \
  -o "${tools}/trivy.tar.gz"
printf '%s  %s\n' 2ae6fe3ee734b7fdf11335663e18c75ea12dccc76062f09f164a3b0f8be4371a "${tools}/trivy.tar.gz" | sha256sum -c -
tar -xzf "${tools}/trivy.tar.gz" -C "${tools}" trivy
# Trivy reads OCI layouts, not OCI tar archives. Import without rebuilding and
# require the same manifest before scanning its directory representation.
bash deploy/aws/install-regctl.sh "${tools}"
"${tools}/regctl" image import "ocidir://${tools}/image:scanned" "${image}"
expected_manifest="$(python3 deploy/aws/inspect-oci-image.py "${image}" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>console.log(JSON.parse(s).image_digest))')"
[[ "$("${tools}/regctl" image digest "ocidir://${tools}/image:scanned")" == "${expected_manifest}" ]]
# Empty config and ignore file: retain all severities and unfixed findings.
printf '{}\n' > "${tools}/trivy.yaml"
"${tools}/trivy" image --config "${tools}/trivy.yaml" --input "${tools}/image" \
  --scanners vuln --ignorefile /dev/null --format json \
  --output "${out}/trivy.json"
node deploy/aws/validate-trivy-image.mjs "${out}/trivy.json" \
  "$(python3 deploy/aws/inspect-oci-image.py "${image}" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>console.log(JSON.parse(s).config_digest))')"
