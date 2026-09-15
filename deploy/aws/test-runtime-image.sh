#!/usr/bin/env bash
# Runs only in the credential-free builder, before the tested image is archived.
set -euo pipefail
image="${1:?image required}"
# Docker containerd uses a manifest ID; classic stores may use a config ID.
# Keep the engine handle separate from OCI config identity validated by the caller.
image_id="$(docker image inspect "${image}" --format '{{.Id}}')"
[[ "$(docker image inspect "${image_id}" --format '{{.Os}}/{{.Architecture}}')" == linux/amd64 ]]
[[ "$(docker image inspect "${image_id}" --format '{{.Config.User}}')" == nextjs ]]
docker run --rm --network none --entrypoint /bin/sh "${image_id}" -eu -c '
  test "$(id -u)" = 1001
  for tool in npm npx pnpm pnpx corepack yarn yarnpkg; do
    if command -v "$tool"; then exit 1; fi
  done
  test ! -e /usr/local/lib/node_modules/npm
  test ! -e /usr/local/lib/node_modules/corepack
  node --version
  gws --version
'
container="$(docker run -d -p 127.0.0.1::3000 "${image_id}")"
trap 'docker rm -f "${container}" >/dev/null' EXIT
port="$(docker port "${container}" 3000/tcp | sed -n 's/^127\.0\.0\.1://p')"
[[ "${port}" =~ ^[0-9]+$ ]]
base="http://127.0.0.1:${port}"
for attempt in $(seq 1 60); do
  if curl -fsS "${base}/" >/dev/null; then break; fi
  sleep 1
done
for route in / /pl /catalog /review/request /verify /proofpack /images/karol-stefanski.jpg /review/sample-cases/ai-agent-action-proof-run /review/sample-cases/external-exposure-assessment; do
  test "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "${base}${route}")" = 200
done
# Existing redirect contracts; never follow the external status destination.
headers="$(mktemp)"
trap 'rm -f "${headers}"; docker rm -f "${container}" >/dev/null' EXIT
for pair in '/status https://status.vaultmesh.org/' '/contact /review/request'; do
  read -r route destination <<< "${pair}"
  test "$(curl --silent --show-error --dump-header "${headers}" --output /dev/null --write-out '%{http_code}' "${base}${route}")" = 308
  tr -d '\r' < "${headers}" | grep -Fxi "location: ${destination}" >/dev/null
done
# Existing local public raster, without widening remote image sources.
curl --fail --silent --show-error "${base}/_next/image?url=%2Fimages%2Fkarol-stefanski.jpg&w=64&q=75" >/dev/null
[[ "$(docker image inspect "${image}" --format '{{.Id}}')" == "${image_id}" ]]
printf 'RUNTIME_IMAGE_OK %s\n' "${image_id}"
