#!/usr/bin/env bash
# Shared helpers for k3s prod / mesh-dev dual-lane deploy.
#
# Lanes (same host ops-dev-01, same k3s namespace witnessops):
#   prod  → deployment witnessops-web      public via Caddy → 127.0.0.1:3000
#   dev   → deployment witnessops-web-dev  mesh-only hostNetwork 10.44.0.2:3015
#
# Shared image always bakes NEXT_PUBLIC_OS_SITE_URL=https://witnessops.com so
# CSS/JS hashes match when both lanes run the same tag. Mesh-dev overrides
# PORT/HOSTNAME/VERIFY_BASE at runtime only.
#
# Env overrides:
#   DEPLOY_SSH=ops-dev-01                 # or root@194.147.221.89 if WG/SSH mesh is down
#   ALLOW_DIRTY=1                         # allow build from dirty working tree
#   MESH_DEV_URL=http://10.44.0.2:3015
#   PROD_URL=https://witnessops.com
# shellcheck disable=SC2034

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${REPO_ROOT}/deploy"
K8S_DIR="${DEPLOY_DIR}/k8s"

# Default SSH host uses mesh jump (ops-dev-01 via wg-edge-01). If WireGuard is
# down, use the public IP: DEPLOY_SSH=root@194.147.221.89
DEPLOY_SSH="${DEPLOY_SSH:-ops-dev-01}"
DEPLOY_NS="${DEPLOY_NS:-witnessops}"
PROD_DEPLOY="${PROD_DEPLOY:-witnessops-web}"
DEV_DEPLOY="${DEV_DEPLOY:-witnessops-web-dev}"
MESH_DEV_URL="${MESH_DEV_URL:-http://10.44.0.2:3015}"
PROD_URL="${PROD_URL:-https://witnessops.com}"
IMAGE_REPO="${IMAGE_REPO:-docker.io/library/witnessops-web}"

# Pure image/CSS compare helpers (unit-tested via deploy/scripts/test-k3s-parity.sh).
# shellcheck source=k3s-parity.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-parity.sh"

log() { printf '\033[1;34m[k3s-deploy]\033[0m %s\n' "$*" >&2; }
err() { printf '\033[1;31m[k3s-deploy:error]\033[0m %s\n' "$*" >&2; }
die() { err "$*"; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

remote() {
  # shellcheck disable=SC2029
  ssh -o BatchMode=yes -o ConnectTimeout=20 "${DEPLOY_SSH}" "$@"
}

require_clean_or_confirm() {
  if [[ "${ALLOW_DIRTY:-0}" == "1" ]]; then
    log "ALLOW_DIRTY=1 — continuing with dirty tree"
    return 0
  fi
  if [[ -n "$(git -C "${REPO_ROOT}" status --porcelain)" ]]; then
    die "working tree is dirty; commit/stash or set ALLOW_DIRTY=1"
  fi
}

git_head_short() {
  git -C "${REPO_ROOT}" rev-parse --short HEAD
}

make_image_tag() {
  local purpose="${1:-main}"
  local head ts
  head="$(git_head_short)"
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  printf '%s-%s-%s' "${purpose}" "${head}" "${ts}"
}

image_ref() {
  printf '%s:%s' "${IMAGE_REPO}" "$1"
}

build_shared_image() {
  local tag="$1"
  local image remote_dir head
  image="$(image_ref "${tag}")"
  head="$(git_head_short)"
  remote_dir="/tmp/witnessops-web-build-${tag}"

  need ssh
  need rsync
  need git

  log "building shared image ${image} from HEAD ${head}"
  require_clean_or_confirm

  rsync -az --delete \
    --exclude node_modules \
    --exclude .next \
    --exclude .git \
    --exclude artifacts \
    --exclude '*.zip' \
    --exclude .turbo \
    --exclude coverage \
    -e "ssh -o BatchMode=yes -o ConnectTimeout=20" \
    "${REPO_ROOT}/" "${DEPLOY_SSH}:${remote_dir}/"

  remote "set -euo pipefail
    cd '${remote_dir}'
    test -f deploy/Dockerfile.mesh
    # Shared image always bakes prod public origin. Mesh-dev overrides PORT/HOSTNAME/VERIFY at runtime.
    cat > deploy/Dockerfile.shared <<'DF'
ARG NODE22_BUILDER_IMAGE=node:22-alpine
ARG NODE22_RUNTIME_IMAGE=node:22-alpine
ARG GWS_VERSION=0.22.5
ARG GWS_TARGET=x86_64-unknown-linux-musl
ARG GWS_SHA256=4db473dde4b1ab872e4ff35d769b0d4af1f1a6441a605e79d5cf8ada9c87e920
FROM \${NODE22_BUILDER_IMAGE} AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
ENV NEXT_PUBLIC_OS_SITE_URL=https://witnessops.com
ENV WITNESSOPS_VERIFY_BASE_URL=https://witnessops.com
RUN pnpm install --frozen-lockfile && pnpm build
FROM \${NODE22_RUNTIME_IMAGE} AS runtime
ARG GWS_VERSION
ARG GWS_TARGET
ARG GWS_SHA256
RUN apk add --no-cache libc6-compat ca-certificates curl \\
  && curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \\
    \"https://github.com/googleworkspace/cli/releases/download/v\${GWS_VERSION}/google-workspace-cli-\${GWS_TARGET}.tar.gz\" \\
    --output /tmp/gws.tar.gz \\
  && echo \"\${GWS_SHA256}  /tmp/gws.tar.gz\" | sha256sum -c - \\
  && tar -xzf /tmp/gws.tar.gz -C /tmp \\
  && install -m 0755 /tmp/gws /usr/local/bin/gws \\
  && rm -f /tmp/gws.tar.gz /tmp/gws \\
  && apk del curl
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_OS_SITE_URL=https://witnessops.com
ENV WITNESSOPS_VERIFY_BASE_URL=https://witnessops.com
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/apps/witnessops-web/.next/standalone ./
COPY --from=builder /app/apps/witnessops-web/.next/static ./apps/witnessops-web/.next/static
COPY --from=builder /app/apps/witnessops-web/public ./apps/witnessops-web/public
RUN mkdir -p apps/witnessops-web/.next/cache \\
  && chown -R nextjs:nodejs apps/witnessops-web/.next/cache apps/witnessops-web/.next/server/app
USER nextjs
EXPOSE 3000
CMD [\"node\", \"apps/witnessops-web/server.js\"]
DF
    # Keep all remote build/import output on the remote process only; do not
    # print the image ref from ssh stdout (callers use the local printf below).
    docker build -f deploy/Dockerfile.shared -t '${image}' . >&2
    docker image inspect '${image}' --format 'id={{.Id}}' >&2
    docker save '${image}' | k3s ctr images import - >&2
    printf '%s\n' '${image}' > /tmp/witnessops-web-last-built-image.txt
    printf '%s\n' '${head}' > /tmp/witnessops-web-last-built-head.txt
  " >/dev/null

  log "built and imported ${image}"
  # sole stdout line for local capture by deploy scripts
  printf '%s\n' "${image}"
}

deploy_prod_image() {
  local image="$1"
  log "deploying PROD ${PROD_DEPLOY} -> ${image}"
  remote "set -euo pipefail
    kubectl -n '${DEPLOY_NS}' get deploy '${PROD_DEPLOY}' -o jsonpath='{.spec.template.spec.containers[0].image}' > /tmp/witnessops-web-prev-image.txt
    echo PREV_PROD=\$(cat /tmp/witnessops-web-prev-image.txt)
    kubectl -n '${DEPLOY_NS}' set image deployment/${PROD_DEPLOY} witnessops-web='${image}'
    kubectl -n '${DEPLOY_NS}' rollout status deployment/${PROD_DEPLOY} --timeout=180s
    kubectl -n '${DEPLOY_NS}' get deploy ${PROD_DEPLOY} -o wide
  "
}

deploy_dev_image() {
  local image="$1"
  local template="${K8S_DIR}/dev-mesh-deployment.yaml"
  local rendered remote_yaml
  [[ -f "${template}" ]] || die "missing ${template}"
  need rsync

  log "deploying DEV ${DEV_DEPLOY} -> ${image} (mesh ${MESH_DEV_URL})"
  # Render locally (avoid quoting traps of embedding YAML inside remote ssh string).
  rendered="$(mktemp "${TMPDIR:-/tmp}/witnessops-web-dev-deploy.XXXXXX.yaml")"
  # shellcheck disable=SC2064
  trap "rm -f '${rendered}'" RETURN
  sed "s|IMAGE_PLACEHOLDER|${image}|g" "${template}" > "${rendered}"
  grep -q "${image}" "${rendered}" || die "image substitution failed in ${rendered}"
  remote_yaml="/tmp/witnessops-web-dev-deploy.yaml"
  rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=20" \
    "${rendered}" "${DEPLOY_SSH}:${remote_yaml}"
  remote "set -euo pipefail
    kubectl apply -f '${remote_yaml}'
    kubectl -n '${DEPLOY_NS}' rollout status deployment/${DEV_DEPLOY} --timeout=180s
    kubectl -n '${DEPLOY_NS}' get deploy,pods -l app=${DEV_DEPLOY} -o wide
    ss -lntp | grep 3015 || true
  "
}

# Fetch container image refs for both lanes (stdout: two lines prod\ndev).
lane_image_refs() {
  remote "kubectl -n '${DEPLOY_NS}' get deploy '${PROD_DEPLOY}' -o jsonpath='{.spec.template.spec.containers[0].image}{\"\\n\"}'
    kubectl -n '${DEPLOY_NS}' get deploy '${DEV_DEPLOY}' -o jsonpath='{.spec.template.spec.containers[0].image}{\"\\n\"}'"
}

smoke_pair() {
  need curl
  local prod_code dev_code prod_css dev_css prod_image dev_image
  local images_out

  # 1) Image-ref equality (enforced — fails even when CSS coincidentally matches).
  images_out="$(lane_image_refs 2>/dev/null || true)"
  prod_image="$(printf '%s\n' "${images_out}" | sed -n '1p')"
  dev_image="$(printf '%s\n' "${images_out}" | sed -n '2p')"
  log "smoke image prod=${prod_image:-<missing>}"
  log "smoke image dev=${dev_image:-<missing>}"
  local image_rc=0
  compare_image_refs "${prod_image}" "${dev_image}" || image_rc=$?
  if [[ "${image_rc}" -ne 0 ]]; then
    err "dual-lane image drift (exit ${image_rc}) — run pnpm deploy:k3s:both to realign"
    return "${image_rc}"
  fi
  log "smoke images match"

  # 2) HTTP + CSS parity on the buyer home path.
  prod_code="$(curl -sS -o /tmp/wo-prod.html -w '%{http_code}' --max-time 15 "${PROD_URL}/" || echo 000)"
  dev_code="$(curl -sS -o /tmp/wo-dev.html -w '%{http_code}' --max-time 15 "${MESH_DEV_URL}/" || echo 000)"
  prod_css="$(grep -oE 'css/[a-f0-9]+\.css' /tmp/wo-prod.html 2>/dev/null | head -1 || true)"
  dev_css="$(grep -oE 'css/[a-f0-9]+\.css' /tmp/wo-dev.html 2>/dev/null | head -1 || true)"

  log "smoke prod=${prod_code} css=${prod_css}"
  log "smoke dev=${dev_code} css=${dev_css}"

  [[ "${prod_code}" == "200" ]] || die "prod smoke failed (${prod_code})"
  [[ "${dev_code}" == "200" ]] || die "dev smoke failed (${dev_code}) — is WireGuard up? try: sudo wg-quick up wg-edge-01"
  if ! compare_css_refs "${prod_css}" "${dev_css}"; then
    err "CSS mismatch prod=${prod_css} dev=${dev_css}"
    return 2
  fi
  log "smoke OK (HTTP 200 both; image match; CSS match)"
}

print_status() {
  remote "kubectl -n '${DEPLOY_NS}' get deploy ${PROD_DEPLOY} ${DEV_DEPLOY} -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,READY:.status.readyReplicas 2>/dev/null || kubectl -n '${DEPLOY_NS}' get deploy ${PROD_DEPLOY} -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,READY:.status.readyReplicas"
}
