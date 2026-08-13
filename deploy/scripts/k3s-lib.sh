#!/usr/bin/env bash
# Shared helpers for the private k3s prod / mesh-dev dual-lane deploy.
#
# Shared image always bakes NEXT_PUBLIC_OS_SITE_URL=https://witnessops.com so
# CSS/JS hashes match when both lanes run the same tag. Mesh-dev overrides
# PORT/HOSTNAME/VERIFY_BASE at runtime only.
#
# Private topology is injected by the operator environment. See
# deploy/topology.env.example for the required variable names and safe shapes.
# shellcheck disable=SC2034

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${REPO_ROOT}/deploy"
K8S_DIR="${DEPLOY_DIR}/k8s"

: "${DEPLOY_SSH:?set DEPLOY_SSH from private topology custody}"
: "${DEPLOY_NS:?set DEPLOY_NS from private topology custody}"
: "${PROD_DEPLOY:?set PROD_DEPLOY from private topology custody}"
: "${DEV_DEPLOY:?set DEV_DEPLOY from private topology custody}"
: "${MESH_DEV_URL:?set MESH_DEV_URL from private topology custody}"
: "${MESH_BIND_HOST:?set MESH_BIND_HOST from private topology custody}"
: "${MESH_BIND_PORT:?set MESH_BIND_PORT from private topology custody}"
: "${APP_CONTAINER_NAME:?set APP_CONTAINER_NAME from private topology custody}"
: "${BASE_ENV_SECRET:?set BASE_ENV_SECRET from private topology custody}"
: "${ADMIN_OIDC_SECRET:?set ADMIN_OIDC_SECRET from private topology custody}"
: "${INTAKE_STORE_PVC:?set INTAKE_STORE_PVC from private topology custody}"
: "${INTAKE_EVENTS_PVC:?set INTAKE_EVENTS_PVC from private topology custody}"
: "${MAIL_OUT_PVC:?set MAIL_OUT_PVC from private topology custody}"
PROD_URL="${PROD_URL:-https://witnessops.com}"
IMAGE_REPO="${IMAGE_REPO:-docker.io/library/witnessops-web}"

# Pure image/CSS compare helpers (unit-tested via deploy/scripts/test-k3s-parity.sh).
# shellcheck source=k3s-parity.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-parity.sh"

validate_private_topology() {
  local value
  validate_ssh_target "${DEPLOY_SSH}" \
    || die "DEPLOY_SSH has an invalid shape"
  for value in \
    "${DEPLOY_NS}" "${PROD_DEPLOY}" "${DEV_DEPLOY}" \
    "${APP_CONTAINER_NAME}" "${BASE_ENV_SECRET}" "${ADMIN_OIDC_SECRET}" \
    "${INTAKE_STORE_PVC}" "${INTAKE_EVENTS_PVC}" "${MAIL_OUT_PVC}"; do
    validate_kubernetes_name "${value}" \
      || die "private Kubernetes topology has an invalid name"
  done
  validate_bind_host "${MESH_BIND_HOST}" \
    || die "MESH_BIND_HOST has an invalid shape"
  validate_unprivileged_port "${MESH_BIND_PORT}" \
    || die "MESH_BIND_PORT must be an unprivileged TCP port"
  [[ "${MESH_DEV_URL}" == "http://${MESH_BIND_HOST}:${MESH_BIND_PORT}" ]] \
    || die "MESH_DEV_URL must exactly match the private bind host and port"
}

log() { printf '\033[1;34m[k3s-deploy]\033[0m %s\n' "$*" >&2; }
err() { printf '\033[1;31m[k3s-deploy:error]\033[0m %s\n' "$*" >&2; }
die() { err "$*"; exit 1; }

validate_private_topology

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

run_supply_chain_gate() {
  need python3
  local evidence_dir base_ref
  local -a gate_args

  evidence_dir="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-supply-chain-gate.XXXXXX")"
  base_ref="${SUPPLY_CHAIN_BASE_REF:-}"
  if [[ -z "${base_ref}" ]] && git -C "${REPO_ROOT}" rev-parse --verify "origin/main^{commit}" >/dev/null 2>&1; then
    base_ref="$(git -C "${REPO_ROOT}" merge-base HEAD origin/main)"
  elif [[ -z "${base_ref}" ]] && git -C "${REPO_ROOT}" rev-parse --verify "HEAD^" >/dev/null 2>&1; then
    base_ref="HEAD^"
  fi

  gate_args=(
    --repo-root "${REPO_ROOT}"
    --lockfile pnpm-lock.yaml
    --output-dir "${evidence_dir}"
  )
  if [[ -n "${base_ref}" ]]; then
    gate_args+=(--base-ref "${base_ref}")
  fi

  log "running Supply Chain Gate before remote build (evidence ${evidence_dir})"
  # build_shared_image is captured with command substitution, so stdout is a
  # data channel reserved for the single image reference. Keep gate evidence
  # visible to the operator without allowing it to corrupt that value.
  python3 "${REPO_ROOT}/tools/supply-chain-gate/supply_chain_gate.py" "${gate_args[@]}" >&2
}

# Keep ignored custody state out of both the remote release directory and the
# Docker builder. Keep this list aligned with the root .dockerignore.
build_context_exclusion_patterns() {
  printf '%s\n' \
    '/.env' \
    '/.env.*' \
    '/**/.env' \
    '/**/.env.*' \
    '/deploy/topology.env' \
    '/.witnessops-token-store/' \
    '/ops/receipts/' \
    '/var/' \
    '/.azure/' \
    '/infra/main.parameters.json' \
    '/.playwright-mcp/' \
    '/.playwright-cli/' \
    '/**/.playwright-cli/' \
    'audit-*.png' \
    '*-cards.png' \
    '/tmp/' \
    '/out/' \
    '/output/'
}

sync_build_context() {
  local source_dir="$1"
  local destination="$2"
  shift 2
  rsync -az --delete --delete-excluded \
    --exclude-from=<(build_context_exclusion_patterns) \
    --exclude node_modules \
    --exclude .next \
    --exclude .git \
    --exclude artifacts \
    --exclude '*.zip' \
    --exclude .turbo \
    --exclude coverage \
    "$@" \
    "${source_dir}" "${destination}"
}

build_shared_image() {
  local tag="$1"
  local image remote_dir head
  image="$(image_ref "${tag}")"
  head="$(git_head_short)"
  remote_dir="/tmp/witnessops-web-build-${tag}"

  [[ "${tag}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] \
    || die "image tag has an invalid shape"
  validate_container_image_ref "${image}" \
    || die "shared image reference has an invalid shape"

  need ssh
  need rsync
  need node
  need git

  log "building shared image ${image} from HEAD ${head}"
  require_clean_or_confirm
  # build_shared_image runs inside command substitution in every build
  # entrypoint. Bash does not reliably preserve errexit in that context, so
  # make this release gate explicit and fail before any remote synchronization.
  if ! run_supply_chain_gate; then
    die "Supply Chain Gate failed; refusing remote build"
  fi

  if ! sync_build_context \
    "${REPO_ROOT}/" "${DEPLOY_SSH}:${remote_dir}/" \
    -e "ssh -o BatchMode=yes -o ConnectTimeout=20"; then
    remote "rm -rf -- '${remote_dir}'" >/dev/null 2>&1 || true
    die "failed to synchronize the remote build context"
  fi

  remote "set -euo pipefail
    cleanup_build_context() {
      cd /
      rm -rf -- '${remote_dir}'
    }
    trap cleanup_build_context EXIT
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
RUN chmod -R a+rX apps/witnessops-web/public \\
  && mkdir -p apps/witnessops-web/.next/cache \\
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

prod_deployment_json_patch() {
  local image explicit_keys admin_role key index role_index
  image="${1:-}"
  explicit_keys="${2:-}"
  admin_role="${3:-}"
  validate_container_image_ref "${image}" || return 1
  index=0
  role_index=""
  while IFS= read -r key; do
    [[ -n "${key}" ]] || continue
    case "${key}" in
      WITNESSOPS_ADMIN_ROLE)
        [[ -z "${role_index}" ]] || {
          printf 'duplicate explicit admin role entries\n' >&2
          return 2
        }
        role_index="${index}"
        ;;
      WITNESSOPS_ADMIN_SECRET|WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST|WITNESSOPS_GOOGLE_OIDC_CLIENT_ID|WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET|WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI|WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN)
        printf 'explicit env shadows protected admin OIDC key: %s\n' "${key}" >&2
        return 2
        ;;
    esac
    index=$((index + 1))
  done <<<"${explicit_keys}"

  printf '%s' '[{"op":"test","path":"/spec/template/spec/containers/0/name","value":"'
  printf '%s' "${APP_CONTAINER_NAME}"
  printf '%s' '"}'
  if [[ -n "${role_index}" ]]; then
    validate_admin_role_value "${admin_role}" || return 2
    printf '%s' ',{"op":"test","path":"/spec/template/spec/containers/0/env/'
    printf '%s' "${role_index}"
    printf '%s' '/name","value":"WITNESSOPS_ADMIN_ROLE"},{"op":"test","path":"/spec/template/spec/containers/0/env/'
    printf '%s' "${role_index}"
    printf '%s' '/value","value":"'
    printf '%s' "${admin_role}"
    printf '%s' '"},{"op":"remove","path":"/spec/template/spec/containers/0/env/'
    printf '%s' "${role_index}"
    printf '%s' '"}'
  fi
  printf '%s' ',{"op":"add","path":"/spec/template/spec/containers/0/envFrom","value":[{"secretRef":{"name":"'
  printf '%s' "${BASE_ENV_SECRET}"
  printf '%s' '"}},{"secretRef":{"name":"'
  printf '%s' "${ADMIN_OIDC_SECRET}"
  printf '%s' '"}}]},{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"'
  printf '%s' "${image}"
  printf '%s' '"}]'
}

preflight_remote_admin_secrets() {
  local oidc_key_names admin_role
  PREFLIGHT_ADMIN_ROLE=""

  if ! remote "kubectl -n '${DEPLOY_NS}' get secret '${BASE_ENV_SECRET}' -o name >/dev/null"; then
    die "required runtime secret is unavailable: ${BASE_ENV_SECRET}"
  fi

  oidc_key_names="$(remote "kubectl -n '${DEPLOY_NS}' get secret '${ADMIN_OIDC_SECRET}' -o go-template='{{range \$key, \$_ := .data}}{{printf \"%s\\n\" \$key}}{{end}}'")" \
    || die "required admin OIDC secret is unavailable: ${ADMIN_OIDC_SECRET}"

  if ! validate_admin_oidc_key_names "${oidc_key_names}"; then
    die "admin OIDC secret preflight failed (key names only)"
  fi

  admin_role="$(remote "set -euo pipefail
    encoded=\$(kubectl -n '${DEPLOY_NS}' get secret '${ADMIN_OIDC_SECRET}' -o jsonpath='{.data.WITNESSOPS_ADMIN_ROLE}')
    role=\$(printf '%s' \"\${encoded}\" | base64 -d)
    printf '%s' \"\${role}\"
  ")" || {
    die "admin role preflight failed"
  }
  validate_admin_role_value "${admin_role}" || die "admin role preflight failed"
  PREFLIGHT_ADMIN_ROLE="${admin_role}"
}

deployment_envfrom_contract() {
  local deployment
  deployment="${1:-}"
  [[ -n "${deployment}" ]] || return 1
  remote "kubectl -n '${DEPLOY_NS}' get deploy '${deployment}' -o go-template='{{range .spec.template.spec.containers}}{{printf \"container:%s\\n\" .name}}{{range .envFrom}}{{if .secretRef}}{{printf \"secret:%s|prefix=\" .secretRef.name}}{{if .prefix}}{{printf \"%s\" .prefix}}{{end}}{{printf \"|optional=\"}}{{with .secretRef.optional}}{{.}}{{else}}false{{end}}{{printf \"\\n\"}}{{else if .configMapRef}}{{printf \"configmap:%s|prefix=\" .configMapRef.name}}{{if .prefix}}{{printf \"%s\" .prefix}}{{end}}{{printf \"|optional=\"}}{{with .configMapRef.optional}}{{.}}{{else}}false{{end}}{{printf \"\\n\"}}{{else}}{{printf \"unknown:|prefix=|optional=false\\n\"}}{{end}}{{end}}{{end}}'"
}

deployment_explicit_env_key_names() {
  local deployment
  deployment="${1:-}"
  [[ -n "${deployment}" ]] || return 1
  remote "kubectl -n '${DEPLOY_NS}' get deploy '${deployment}' -o go-template='{{with index .spec.template.spec.containers 0}}{{range .env}}{{printf \"%s\\n\" .name}}{{end}}{{end}}'"
}

assert_remote_deployment_envfrom() {
  local deployment expected actual rc
  deployment="${1:-}"
  expected="$(expected_admin_runtime_envfrom_contract)"
  actual="$(deployment_envfrom_contract "${deployment}")" \
    || die "could not inspect runtime envFrom contract for ${deployment}"
  rc=0
  compare_runtime_envfrom_contract "${expected}" "${actual}" || rc=$?
  if [[ "${rc}" -ne 0 ]]; then
    die "runtime envFrom drift for ${deployment} (exit ${rc})"
  fi
  log "runtime envFrom contract matches for ${deployment}"
}

assert_remote_no_admin_oidc_env_shadows() {
  local deployment explicit_keys
  deployment="${1:-}"
  explicit_keys="$(deployment_explicit_env_key_names "${deployment}")" \
    || die "could not inspect explicit runtime env for ${deployment}"
  if ! validate_no_admin_oidc_env_shadows "${explicit_keys}"; then
    die "explicit runtime env shadows admin OIDC secret for ${deployment}"
  fi
  log "runtime env does not shadow admin OIDC secret for ${deployment}"
}

deploy_prod_image() {
  local image patch explicit_keys admin_role
  image="${1:-}"
  validate_container_image_ref "${image}" \
    || die "refusing invalid production image reference"
  preflight_remote_admin_secrets
  admin_role="${PREFLIGHT_ADMIN_ROLE}"
  explicit_keys="$(deployment_explicit_env_key_names "${PROD_DEPLOY}")" \
    || die "could not inspect explicit runtime env for ${PROD_DEPLOY}"
  patch="$(prod_deployment_json_patch "${image}" "${explicit_keys}" "${admin_role}")" \
    || die "refusing protected production env shadow"
  if grep -Fq 'WITNESSOPS_ADMIN_ROLE' <<<"${explicit_keys}"; then
    log "migrating legacy explicit admin role to protected Secret custody"
  fi
  log "deploying PROD ${PROD_DEPLOY} -> ${image}"
  remote "set -euo pipefail
    kubectl -n '${DEPLOY_NS}' get deploy '${PROD_DEPLOY}' -o jsonpath='{.spec.template.spec.containers[0].image}' > /tmp/witnessops-web-prev-image.txt
    echo PREV_PROD=\$(cat /tmp/witnessops-web-prev-image.txt)
    kubectl -n '${DEPLOY_NS}' patch deployment/${PROD_DEPLOY} --type=json --patch='${patch}'
    kubectl -n '${DEPLOY_NS}' rollout status deployment/${PROD_DEPLOY} --timeout=180s
    kubectl -n '${DEPLOY_NS}' get deploy ${PROD_DEPLOY} -o wide
  "
  assert_remote_deployment_envfrom "${PROD_DEPLOY}"
  assert_remote_no_admin_oidc_env_shadows "${PROD_DEPLOY}"
}

deploy_dev_image() {
  local image
  image="${1:-}"
  validate_container_image_ref "${image}" \
    || die "refusing invalid development image reference"

  local template="${K8S_DIR}/dev-mesh-deployment.yaml"
  local rendered remote_yaml
  [[ -f "${template}" ]] || die "missing ${template}"
  need rsync

  log "deploying DEV ${DEV_DEPLOY} -> ${image} (mesh ${MESH_DEV_URL})"
  # Render locally (avoid quoting traps of embedding YAML inside remote ssh string).
  rendered="$(mktemp "${TMPDIR:-/tmp}/witnessops-dev-deploy.XXXXXX.yaml")"
  # shellcheck disable=SC2064
  trap "rm -f '${rendered}'" RETURN
  IMAGE_PLACEHOLDER="${image}" node \
    "${DEPLOY_DIR}/scripts/render-topology-template.mjs" \
    "${template}" "${rendered}" \
    IMAGE_PLACEHOLDER DEPLOY_NS DEV_DEPLOY APP_CONTAINER_NAME \
    BASE_ENV_SECRET ADMIN_OIDC_SECRET MESH_BIND_HOST MESH_BIND_PORT MESH_DEV_URL
  grep -q "${image}" "${rendered}" || die "image substitution failed in ${rendered}"
  remote_yaml="/tmp/witnessops-dev-deploy.yaml"
  rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=20" \
    "${rendered}" "${DEPLOY_SSH}:${remote_yaml}"
  remote "set -euo pipefail
    kubectl apply -f '${remote_yaml}'
    kubectl -n '${DEPLOY_NS}' rollout status deployment/${DEV_DEPLOY} --timeout=180s
    kubectl -n '${DEPLOY_NS}' get deploy,pods -l app=${DEV_DEPLOY} -o wide
    ss -lntp | grep -- '${MESH_BIND_PORT}' || true
  "
  assert_remote_deployment_envfrom "${DEV_DEPLOY}"
  assert_remote_no_admin_oidc_env_shadows "${DEV_DEPLOY}"
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

  # 1) Exact ordered runtime secret-ref contract for both lanes.
  assert_remote_deployment_envfrom "${PROD_DEPLOY}"
  assert_remote_deployment_envfrom "${DEV_DEPLOY}"
  assert_remote_no_admin_oidc_env_shadows "${PROD_DEPLOY}"
  assert_remote_no_admin_oidc_env_shadows "${DEV_DEPLOY}"

  # 2) Image-ref equality (enforced — fails even when CSS coincidentally matches).
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

  # 3) HTTP + CSS parity on the buyer home path.
  prod_code="$(curl -sS -o /tmp/wo-prod.html -w '%{http_code}' --max-time 15 "${PROD_URL}/" || echo 000)"
  dev_code="$(curl -sS -o /tmp/wo-dev.html -w '%{http_code}' --max-time 15 "${MESH_DEV_URL}/" || echo 000)"
  prod_css="$(grep -oE 'css/[a-f0-9]+\.css' /tmp/wo-prod.html 2>/dev/null | head -1 || true)"
  dev_css="$(grep -oE 'css/[a-f0-9]+\.css' /tmp/wo-dev.html 2>/dev/null | head -1 || true)"

  log "smoke prod=${prod_code} css=${prod_css}"
  log "smoke dev=${dev_code} css=${dev_css}"

  [[ "${prod_code}" == "200" ]] || die "prod smoke failed (${prod_code})"
  [[ "${dev_code}" == "200" ]] || die "dev smoke failed (${dev_code}) — confirm the private network path is active"
  if ! compare_css_refs "${prod_css}" "${dev_css}"; then
    err "CSS mismatch prod=${prod_css} dev=${dev_css}"
    return 2
  fi
  log "smoke OK (runtime envFrom, HTTP 200, image, and CSS match)"
}

print_status() {
  remote "kubectl -n '${DEPLOY_NS}' get deploy ${PROD_DEPLOY} ${DEV_DEPLOY} -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,READY:.status.readyReplicas 2>/dev/null || kubectl -n '${DEPLOY_NS}' get deploy ${PROD_DEPLOY} -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,READY:.status.readyReplicas"
}
