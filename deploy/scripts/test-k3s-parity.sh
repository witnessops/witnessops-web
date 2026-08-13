#!/usr/bin/env bash
# Unit tests for deploy/scripts/k3s-parity.sh (real shipped helpers).
# Run: bash deploy/scripts/test-k3s-parity.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARITY="${SCRIPT_DIR}/k3s-parity.sh"
K3S_LIB="${SCRIPT_DIR}/k3s-lib.sh"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROD_TEMPLATE="${REPO_ROOT}/deploy/k8s/deployment.yaml"
DEV_TEMPLATE="${REPO_ROOT}/deploy/k8s/dev-mesh-deployment.yaml"
APPLY_SCRIPT="${REPO_ROOT}/deploy/k8s/apply.sh"
DISK_HYGIENE_SCRIPT="${REPO_ROOT}/deploy/scripts/k3s-disk-hygiene.sh"
[[ -f "${PARITY}" ]] || { echo "missing ${PARITY}" >&2; exit 1; }
[[ -f "${K3S_LIB}" ]] || { echo "missing ${K3S_LIB}" >&2; exit 1; }

# Deliberately non-operational values exercise the same injected topology
# contract used by the live scripts without publishing private infrastructure.
export DEPLOY_SSH=deploy-host.private.example
export DEPLOY_NS=example-namespace
export PROD_DEPLOY=example-prod-deployment
export PROD_SERVICE=example-prod-service
export DEV_DEPLOY=example-dev-deployment
export APP_CONTAINER_NAME=example-app-container
export BASE_ENV_SECRET=example-runtime-secret
export ADMIN_OIDC_SECRET=example-identity-secret
export INTAKE_STORE_PVC=example-intake-pvc
export INTAKE_EVENTS_PVC=example-events-pvc
export MAIL_OUT_PVC=example-mail-pvc
export MESH_BIND_HOST=192.0.2.10
export MESH_BIND_PORT=3001
export MESH_DEV_URL=http://192.0.2.10:3001

rendered_test_dir="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-topology-test.XXXXXX")"
PROD_MANIFEST="${rendered_test_dir}/deployment.yaml"
DEV_MANIFEST="${rendered_test_dir}/dev-mesh-deployment.yaml"
IMAGE_PLACEHOLDER=docker.io/library/witnessops-web:test \
  node "${SCRIPT_DIR}/render-topology-template.mjs" \
    "${PROD_TEMPLATE}" "${PROD_MANIFEST}" \
    DEPLOY_NS PROD_DEPLOY APP_CONTAINER_NAME IMAGE_PLACEHOLDER \
    BASE_ENV_SECRET ADMIN_OIDC_SECRET INTAKE_STORE_PVC INTAKE_EVENTS_PVC MAIL_OUT_PVC
IMAGE_PLACEHOLDER=docker.io/library/witnessops-web:test \
  node "${SCRIPT_DIR}/render-topology-template.mjs" \
    "${DEV_TEMPLATE}" "${DEV_MANIFEST}" \
    DEPLOY_NS DEV_DEPLOY APP_CONTAINER_NAME IMAGE_PLACEHOLDER \
    BASE_ENV_SECRET ADMIN_OIDC_SECRET MESH_BIND_HOST MESH_BIND_PORT MESH_DEV_URL

fail=0
pass=0

assert_exit() {
  local want="$1"
  shift
  local got=0
  "$@" >/dev/null 2>&1 || got=$?
  if [[ "${got}" -eq "${want}" ]]; then
    pass=$((pass + 1))
    echo "PASS: $* (exit ${got})"
  else
    fail=$((fail + 1))
    echo "FAIL: $* (want exit ${want}, got ${got})" >&2
  fi
}

check_private_topology_denylist() {
  local denylist_file="$1"
  local private_token
  local grep_status
  local checked_tokens=0
  local private_topology_found=0

  [[ -f "${denylist_file}" ]] || return 2
  while IFS= read -r private_token || [[ -n "${private_token}" ]]; do
    [[ -n "${private_token}" ]] || continue
    [[ "${private_token}" != *$'\r'* ]] || return 2
    checked_tokens=$((checked_tokens + 1))
    if git -C "${REPO_ROOT}" grep -F -n -- "${private_token}" -- . \
      >/dev/null 2>&1; then
      private_topology_found=1
      echo "tracked private topology token is present" >&2
    else
      grep_status=$?
      [[ "${grep_status}" -eq 1 ]] || return 2
    fi
  done < "${denylist_file}"

  [[ "${checked_tokens}" -gt 0 ]] || return 2
  [[ "${private_topology_found}" -eq 0 ]]
}

manifest_envfrom_contract() {
  local manifest="$1"
  awk '
    function indent(line, prefix) {
      prefix = line
      sub(/[^[:space:]].*$/, "", prefix)
      return length(prefix)
    }

    function scalar(line, value, first, last) {
      value = line
      sub(/^[^:]*:[[:space:]]*/, "", value)
      sub(/[[:space:]]*#.*$/, "", value)
      sub(/[[:space:]]*$/, "", value)
      first = substr(value, 1, 1)
      last = substr(value, length(value), 1)
      if (length(value) >= 2 && ((first == "\"" && last == "\"") || (first == "\047" && last == "\047"))) {
        value = substr(value, 2, length(value) - 2)
      }
      return value
    }

    function reset_item() {
      in_item = 0
      source_kind = ""
      source_name = ""
      source_prefix = ""
      source_optional = "false"
    }

    function emit_item() {
      if (!in_item) {
        return
      }
      if (source_kind == "") {
        source_kind = "unknown"
      }
      print source_kind ":" source_name "|prefix=" source_prefix "|optional=" source_optional
      reset_item()
    }

    /^[[:space:]]*envFrom:[[:space:]]*$/ {
      in_envfrom = 1
      envfrom_indent = indent($0)
      reset_item()
      next
    }

    in_envfrom {
      if ($0 ~ /^[[:space:]]*($|#)/) {
        next
      }
      if (indent($0) <= envfrom_indent) {
        emit_item()
        in_envfrom = 0
        next
      }

      content = $0
      sub(/^[[:space:]]*/, "", content)
      if (content ~ /^-[[:space:]]*/) {
        emit_item()
        in_item = 1
        sub(/^-[[:space:]]*/, "", content)
      }
      if (!in_item) {
        next
      }

      if (content ~ /^prefix:[[:space:]]*/) {
        source_prefix = scalar(content)
      } else if (content ~ /^secretRef:[[:space:]]*$/) {
        source_kind = "secret"
      } else if (content ~ /^configMapRef:[[:space:]]*$/) {
        source_kind = "configmap"
      } else if (content ~ /^name:[[:space:]]*/) {
        source_name = scalar(content)
      } else if (content ~ /^optional:[[:space:]]*/) {
        source_optional = scalar(content)
      }
    }

    END {
      if (in_envfrom) {
        emit_item()
      }
    }
  ' "${manifest}"
}

manifest_with_first_envfrom_prefix() {
  local manifest="$1"
  awk '
    /^[[:space:]]*envFrom:[[:space:]]*$/ { in_envfrom = 1 }
    in_envfrom && !changed && /^[[:space:]]*-[[:space:]]*secretRef:[[:space:]]*$/ {
      prefix = $0
      sub(/-.*/, "", prefix)
      print prefix "- prefix: WOPS_"
      print prefix "  secretRef:"
      changed = 1
      next
    }
    { print }
  ' "${manifest}"
}

manifest_with_first_envfrom_optional() {
  local manifest="$1"
  awk '
    /^[[:space:]]*envFrom:[[:space:]]*$/ { in_envfrom = 1 }
    in_envfrom && !changed && /^[[:space:]]*-[[:space:]]*secretRef:[[:space:]]*$/ {
      in_first_secret = 1
    }
    in_first_secret && !changed && /^[[:space:]]*name:[[:space:]]*example-runtime-secret[[:space:]]*$/ {
      print
      prefix = $0
      sub(/[^[:space:]].*$/, "", prefix)
      print prefix "optional: true"
      changed = 1
      in_first_secret = 0
      next
    }
    { print }
  ' "${manifest}"
}

sorted_unique_lines() {
  printf '%s\n' "$1" | sed '/^[[:space:]]*$/d' | LC_ALL=C sort -u
}

without_line() {
  local lines="$1"
  local remove="$2"
  printf '%s\n' "${lines}" | awk -v remove="${remove}" '$0 != remove'
}

assert_output() {
  local want="$1"
  shift
  local got
  got="$("$@")"
  if [[ "${got}" == "${want}" ]]; then
    pass=$((pass + 1))
    echo "PASS: $*"
  else
    fail=$((fail + 1))
    printf 'FAIL: %s\nwant:\n%s\ngot:\n%s\n' "$*" "${want}" "${got}" >&2
  fi
}

# --- compare-images (CLI drives shipped entrypoint) ---
assert_exit 0 bash "${PARITY}" compare-images \
  'docker.io/library/witnessops-web:main-abc-1' \
  'docker.io/library/witnessops-web:main-abc-1'

assert_exit 0 bash "${PARITY}" compare-images \
  'witnessops-web:main-abc-1' \
  'docker.io/library/witnessops-web:main-abc-1'

assert_exit 2 bash "${PARITY}" compare-images \
  'docker.io/library/witnessops-web:main-aaa' \
  'docker.io/library/witnessops-web:main-bbb'

assert_exit 1 bash "${PARITY}" compare-images \
  'docker.io/library/witnessops-web:main-aaa' \
  ''

# --- injected topology shape validation ---
assert_exit 0 bash -c 'source "$1"; validate_kubernetes_name example-prod' _ "${PARITY}"
assert_exit 1 bash -c 'source "$1"; validate_kubernetes_name "$2"' _ \
  "${PARITY}" $'example-prod\n---\nkind: ConfigMap'
assert_exit 1 bash -c 'source "$1"; validate_kubernetes_name "$2"' _ \
  "${PARITY}" 'example prod'
assert_exit 0 bash -c 'source "$1"; validate_ssh_target deploy-host.private.example' _ "${PARITY}"
assert_exit 1 bash -c 'source "$1"; validate_ssh_target "$2"' _ \
  "${PARITY}" 'deploy-host;touch-pwned'
assert_exit 0 bash -c 'source "$1"; validate_unprivileged_port 3001' _ "${PARITY}"
assert_exit 1 bash -c 'source "$1"; validate_unprivileged_port 22' _ "${PARITY}"

denylist_test_file="$(mktemp "${TMPDIR:-/tmp}/witnessops-private-denylist.XXXXXX")"
printf '%s' "not-tracked-private-token-${$}" > "${denylist_test_file}"
assert_exit 0 check_private_topology_denylist "${denylist_test_file}"
: > "${denylist_test_file}"
assert_exit 2 check_private_topology_denylist "${denylist_test_file}"
printf 'not-tracked-private-token-%s\r\n' "${$}" > "${denylist_test_file}"
assert_exit 2 check_private_topology_denylist "${denylist_test_file}"
denylist_repo_root="${REPO_ROOT}"
denylist_binary_repo="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-private-binary.XXXXXX")"
git -C "${denylist_binary_repo}" init -q
printf 'prefix\0tracked-binary-private-token\0suffix' \
  > "${denylist_binary_repo}/artifact.bin"
git -C "${denylist_binary_repo}" add artifact.bin
printf '%s\n' 'tracked-binary-private-token' > "${denylist_test_file}"
REPO_ROOT="${denylist_binary_repo}"
assert_exit 1 check_private_topology_denylist "${denylist_test_file}"
REPO_ROOT="${denylist_binary_repo}/missing"
assert_exit 2 check_private_topology_denylist "${denylist_test_file}"
REPO_ROOT="${denylist_repo_root}"
rm -rf "${denylist_binary_repo}"
rm -f "${denylist_test_file}"

disk_test_dir="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-disk-hygiene.XXXXXX")"
disk_fake_bin="${disk_test_dir}/bin"
mkdir "${disk_fake_bin}"
ln -s "$(command -v true)" "${disk_fake_bin}/ssh"
assert_exit 1 env \
  PATH="${disk_fake_bin}:${PATH}" \
  DEPLOY_SSH='deploy-host;invalid' \
  DEPLOY_NS=example-namespace \
  bash "${DISK_HYGIENE_SCRIPT}"
assert_exit 1 env \
  PATH="${disk_fake_bin}:${PATH}" \
  DEPLOY_SSH=deploy-host.private.example \
  DEPLOY_NS=$'example-namespace\n---' \
  bash "${DISK_HYGIENE_SCRIPT}"
assert_exit 1 env \
  PATH="${disk_fake_bin}:${PATH}" \
  DEPLOY_SSH=deploy-host.private.example \
  DEPLOY_NS=example-namespace \
  KEEP_IMAGES='4;invalid' \
  bash "${DISK_HYGIENE_SCRIPT}"
assert_exit 0 grep -Fq -- "kubectl -n '\${DEPLOY_NS}'" "${DISK_HYGIENE_SCRIPT}"
rm -rf "${disk_test_dir}"

# --- compare-css ---
assert_exit 0 bash "${PARITY}" compare-css 'css/aaa.css' 'css/aaa.css'
assert_exit 0 bash "${PARITY}" compare-css '' ''
assert_exit 2 bash "${PARITY}" compare-css 'css/aaa.css' 'css/bbb.css'
assert_exit 2 bash "${PARITY}" compare-css 'css/aaa.css' ''

# --- checked-in deployment secretRef parity ---
required_shared_envfrom=$'secret:example-runtime-secret|prefix=|optional=false\nsecret:example-identity-secret|prefix=|optional=false'
assert_output "${required_shared_envfrom}" manifest_envfrom_contract "${PROD_MANIFEST}"
assert_output "${required_shared_envfrom}" manifest_envfrom_contract "${DEV_MANIFEST}"

static_prefix_drift="$(manifest_with_first_envfrom_prefix "${PROD_MANIFEST}" \
  | manifest_envfrom_contract /dev/stdin)"
assert_output \
  $'secret:example-runtime-secret|prefix=WOPS_|optional=false\nsecret:example-identity-secret|prefix=|optional=false' \
  printf '%s' "${static_prefix_drift}"

static_optional_drift="$(manifest_with_first_envfrom_optional "${PROD_MANIFEST}" \
  | manifest_envfrom_contract /dev/stdin)"
assert_output \
  $'secret:example-runtime-secret|prefix=|optional=true\nsecret:example-identity-secret|prefix=|optional=false' \
  printf '%s' "${static_optional_drift}"

# --- sourced API (same file, real functions) ---
# shellcheck source=k3s-parity.sh
source "${PARITY}"
runtime_envfrom_contract=$'container:example-app-container\nsecret:example-runtime-secret|prefix=|optional=false\nsecret:example-identity-secret|prefix=|optional=false'
assert_output "${runtime_envfrom_contract}" expected_admin_runtime_envfrom_contract
assert_exit 0 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" "${runtime_envfrom_contract}"
assert_exit 2 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" \
  $'container:example-app-container\nsecret:example-identity-secret|prefix=|optional=false\nsecret:example-runtime-secret|prefix=|optional=false'
assert_exit 2 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" \
  $'container:example-app-container\nsecret:example-runtime-secret|prefix=|optional=false'
assert_exit 2 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" \
  $'container:example-app-container\nsecret:example-runtime-secret|prefix=WOPS_|optional=false\nsecret:example-identity-secret|prefix=|optional=false'
assert_exit 2 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" \
  $'container:example-app-container\nsecret:example-runtime-secret|prefix=|optional=true\nsecret:example-identity-secret|prefix=|optional=false'
assert_exit 2 compare_runtime_envfrom_contract \
  "${required_shared_envfrom}" "${static_prefix_drift}"
assert_exit 2 compare_runtime_envfrom_contract \
  "${required_shared_envfrom}" "${static_optional_drift}"

required_oidc_keys="$(required_admin_oidc_key_names)"
expected_required_oidc_keys=$'WITNESSOPS_ADMIN_ROLE\nWITNESSOPS_ADMIN_SECRET\nWITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST\nWITNESSOPS_GOOGLE_OIDC_CLIENT_ID\nWITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET\nWITNESSOPS_GOOGLE_OIDC_REDIRECT_URI\nWITNESSOPS_GOOGLE_WORKSPACE_DOMAIN'
assert_output "${expected_required_oidc_keys}" sorted_unique_lines "${required_oidc_keys}"
assert_exit 0 validate_admin_oidc_key_names \
  "${required_oidc_keys}" \
  $'WITNESSOPS_ADMIN_OIDC_CLIENT_ID\nWITNESSOPS_GOOGLE_OIDC_CLIENT_ID'
assert_exit 2 validate_admin_oidc_key_names \
  "$(without_line "${required_oidc_keys}" WITNESSOPS_ADMIN_SECRET)"
assert_exit 2 validate_admin_oidc_key_names \
  "$(without_line "${required_oidc_keys}" WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN)"
assert_exit 0 validate_admin_role_value 'Founder'
assert_exit 0 validate_admin_role_value 'Delegated Operator'
assert_exit 0 validate_admin_role_value 'Administrator'
assert_exit 2 validate_admin_role_value ''
assert_exit 2 validate_admin_role_value 'admin'
assert_exit 0 validate_no_admin_oidc_env_shadows \
  $'PORT\nHOSTNAME\nWITNESSOPS_VERIFY_BASE_URL'
assert_exit 2 validate_no_admin_oidc_env_shadows \
  $'PORT\nWITNESSOPS_ADMIN_ROLE\nHOSTNAME'
if grep -Eq '^[[:space:]]*-[[:space:]]*name:[[:space:]]*WITNESSOPS_ADMIN_ROLE[[:space:]]*$' "${DEV_MANIFEST}"; then
  fail=$((fail + 1))
  echo "FAIL: mesh-dev manifest explicitly shadows the custodied admin role" >&2
else
  pass=$((pass + 1))
  echo "PASS: mesh-dev inherits the custodied admin role"
fi

# --- prod deploy preflight and atomic patch ---
# shellcheck source=k3s-lib.sh
source "${K3S_LIB}"
expected_build_context_exclusions=$'/.env\n/.env.*\n/**/.env\n/**/.env.*\n/deploy/topology.env\n/.witnessops-token-store/\n/ops/receipts/\n/var/\n/.azure/\n/infra/main.parameters.json\n/.playwright-mcp/\n/.playwright-cli/\n/**/.playwright-cli/\naudit-*.png\n*-cards.png\n/tmp/\n/out/\n/output/'
assert_output "${expected_build_context_exclusions}" build_context_exclusion_patterns
python3() {
  printf '%s\n' 'PASS packages=1 graph_sha256=test'
}
gate_success_stderr="$(mktemp "${TMPDIR:-/tmp}/witnessops-gate-success.XXXXXX")"
if [[ -z "$(run_supply_chain_gate 2>"${gate_success_stderr}")" ]] \
  && grep -Fq 'PASS packages=1 graph_sha256=test' "${gate_success_stderr}"; then
  pass=$((pass + 1))
  echo "PASS: supply-chain gate keeps stdout reserved and evidence visible on stderr"
else
  fail=$((fail + 1))
  echo "FAIL: supply-chain gate stdout/stderr contract is incorrect" >&2
fi
unset -f python3
gate_failure_dir="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-gate-failure.XXXXXX")"
gate_failure_trace="${gate_failure_dir}/mutation-trace"
gate_failure_stderr="${gate_failure_dir}/stderr"
gate_failure_status=0
gate_failure_output="$(
  run_supply_chain_gate() {
    printf '%s\n' 'forced gate failure' >&2
    return 7
  }
  sync_build_context() {
    printf '%s\n' sync_reached >>"${gate_failure_trace}"
  }
  remote() {
    printf '%s\n' remote_reached >>"${gate_failure_trace}"
  }
  require_clean_or_confirm() { :; }
  need() { :; }
  build_shared_image gate-failure-test 2>"${gate_failure_stderr}"
)" || gate_failure_status=$?
if [[ "${gate_failure_status}" -ne 0 ]] \
  && [[ -z "${gate_failure_output}" ]] \
  && [[ ! -e "${gate_failure_trace}" ]] \
  && grep -Fq 'forced gate failure' "${gate_failure_stderr}" \
  && grep -Fq 'Supply Chain Gate failed; refusing remote build' "${gate_failure_stderr}"; then
  pass=$((pass + 1))
  echo "PASS: failed supply-chain gate stops before sync inside command substitution"
else
  fail=$((fail + 1))
  echo "FAIL: failed supply-chain gate did not stop the captured build" >&2
fi
for docker_exclusion in \
  '.env' '.env.*' '**/.env' '**/.env.*' 'deploy/topology.env' \
  '.witnessops-token-store' 'ops/receipts' 'var' '.azure' \
  'infra/main.parameters.json' '.playwright-mcp' '.playwright-cli' \
  '**/.playwright-cli' 'audit-*.png' '**/audit-*.png' \
  '*-cards.png' '**/*-cards.png'; do
  if grep -Fqx -- "${docker_exclusion}" "${REPO_ROOT}/.dockerignore"; then
    pass=$((pass + 1))
    echo "PASS: Docker context excludes ${docker_exclusion}"
  else
    fail=$((fail + 1))
    echo "FAIL: Docker context does not exclude ${docker_exclusion}" >&2
  fi
done
build_context_source="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-build-context-source.XXXXXX")"
build_context_target="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-build-context-target.XXXXXX")"
mkdir -p \
  "${build_context_source}/deploy" \
  "${build_context_source}/.witnessops-token-store" \
  "${build_context_source}/ops/receipts" \
  "${build_context_source}/var" \
  "${build_context_source}/nested/.playwright-cli"
touch \
  "${build_context_source}/safe.txt" \
  "${build_context_source}/.env" \
  "${build_context_source}/deploy/topology.env" \
  "${build_context_source}/.witnessops-token-store/customer.json" \
  "${build_context_source}/ops/receipts/private.json" \
  "${build_context_source}/var/operator-state.json" \
  "${build_context_source}/nested/.env.local" \
  "${build_context_source}/nested/.playwright-cli/session.json" \
  "${build_context_source}/audit-private.png" \
  "${build_context_source}/nested/operator-cards.png"
sync_build_context "${build_context_source}/" "${build_context_target}/"
if [[ -f "${build_context_target}/safe.txt" ]] \
  && [[ ! -e "${build_context_target}/.env" ]] \
  && [[ ! -e "${build_context_target}/deploy/topology.env" ]] \
  && [[ ! -e "${build_context_target}/.witnessops-token-store" ]] \
  && [[ ! -e "${build_context_target}/ops/receipts" ]] \
  && [[ ! -e "${build_context_target}/var" ]] \
  && [[ ! -e "${build_context_target}/nested/.env.local" ]] \
  && [[ ! -e "${build_context_target}/nested/.playwright-cli" ]] \
  && [[ ! -e "${build_context_target}/audit-private.png" ]] \
  && [[ ! -e "${build_context_target}/nested/operator-cards.png" ]]; then
  pass=$((pass + 1))
  echo "PASS: remote build-context sync excludes custody sentinels"
else
  fail=$((fail + 1))
  echo "FAIL: remote build-context sync copied a custody sentinel" >&2
fi
rm -rf -- "${build_context_source}" "${build_context_target}"
image='docker.io/library/witnessops-web:main-test-20260806T000000Z'
expected_patch='[{"op":"test","path":"/spec/template/spec/containers/0/name","value":"example-app-container"},{"op":"add","path":"/spec/template/spec/containers/0/envFrom","value":[{"secretRef":{"name":"example-runtime-secret"}},{"secretRef":{"name":"example-identity-secret"}}]},{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"docker.io/library/witnessops-web:main-test-20260806T000000Z"}]'
assert_output "${expected_patch}" prod_deployment_json_patch "${image}"
assert_exit 1 prod_deployment_json_patch 'bad image ref'
expected_role_migration_patch='[{"op":"test","path":"/spec/template/spec/containers/0/name","value":"example-app-container"},{"op":"test","path":"/spec/template/spec/containers/0/env/1/name","value":"WITNESSOPS_ADMIN_ROLE"},{"op":"test","path":"/spec/template/spec/containers/0/env/1/value","value":"Founder"},{"op":"remove","path":"/spec/template/spec/containers/0/env/1"},{"op":"add","path":"/spec/template/spec/containers/0/envFrom","value":[{"secretRef":{"name":"example-runtime-secret"}},{"secretRef":{"name":"example-identity-secret"}}]},{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"docker.io/library/witnessops-web:main-test-20260806T000000Z"}]'
assert_output "${expected_role_migration_patch}" prod_deployment_json_patch \
  "${image}" $'PORT\nWITNESSOPS_ADMIN_ROLE\nHOSTNAME' Founder
assert_exit 2 prod_deployment_json_patch \
  "${image}" $'PORT\nWITNESSOPS_ADMIN_ROLE\nHOSTNAME'
assert_exit 2 prod_deployment_json_patch \
  "${image}" $'WITNESSOPS_ADMIN_ROLE\nWITNESSOPS_ADMIN_ROLE' Founder
assert_exit 2 prod_deployment_json_patch \
  "${image}" $'PORT\nWITNESSOPS_ADMIN_SECRET'

remote_mode="ok"
remote_log="$(mktemp "${TMPDIR:-/tmp}/witnessops-k3s-remote.XXXXXX")"
apply_log="$(mktemp "${TMPDIR:-/tmp}/witnessops-k3s-apply.XXXXXX")"
trap 'rm -rf "${rendered_test_dir}" "${gate_failure_dir}"; rm -f "${gate_success_stderr}" "${remote_log}" "${apply_log}"' EXIT

remote() {
  local command_text="$*"
  printf '%s\n' "${command_text}" >> "${remote_log}"
  if [[ "${command_text}" == *"encoded="*"WITNESSOPS_ADMIN_ROLE"* ]]; then
    if [[ "${remote_mode}" == "invalid-role" ]]; then
      printf '%s' 'invalid'
    else
      printf '%s' 'Founder'
    fi
  elif [[ "${command_text}" == *"get secret"*"example-identity-secret"* ]]; then
    if [[ "${remote_mode}" == "missing-key" ]]; then
      without_line "${required_oidc_keys}" WITNESSOPS_ADMIN_SECRET
    else
      printf '%s\n' "${required_oidc_keys}"
    fi
  elif [[ "${command_text}" == *"get deploy"*"go-template"* ]]; then
    if [[ "${command_text}" == *"range .env}"* ]]; then
      if [[ "${remote_mode}" == "runtime-role-shadow" || "${remote_mode}" == "smoke-role-shadow" ]]; then
        printf '%s\n' $'PORT\nWITNESSOPS_ADMIN_ROLE'
      elif [[ "${remote_mode}" == "migratable-role-shadow" ]]; then
        if [[ "$(grep -Fc 'range .env}' "${remote_log}" || true)" -eq 1 ]]; then
          printf '%s\n' $'PORT\nWITNESSOPS_ADMIN_ROLE\nHOSTNAME'
        else
          printf '%s\n' $'PORT\nHOSTNAME'
        fi
      else
        printf '%s\n' $'PORT\nHOSTNAME'
      fi
    else
      case "${remote_mode}" in
        runtime-prefix-drift|smoke-prefix-drift)
        printf '%s\n' $'container:example-app-container\nsecret:example-runtime-secret|prefix=WOPS_|optional=false\nsecret:example-identity-secret|prefix=|optional=false'
        ;;
        runtime-optional-drift|smoke-optional-drift)
        printf '%s\n' $'container:example-app-container\nsecret:example-runtime-secret|prefix=|optional=true\nsecret:example-identity-secret|prefix=|optional=false'
        ;;
        *)
        printf '%s\n' "${runtime_envfrom_contract}"
        ;;
      esac
    fi
  fi
}

rsync() {
  printf 'rsync %s\n' "$*" >> "${remote_log}"
}

curl() {
  printf 'curl %s\n' "$*" >> "${remote_log}"
  return 0
}

remote_mode="ok"
: > "${remote_log}"
deployment_explicit_env_key_names "${PROD_DEPLOY}" >/dev/null
if grep -Fq 'with index .spec.template.spec.containers 0' "${remote_log}"; then
  pass=$((pass + 1))
  echo "PASS: explicit env inspection is scoped to the patched container"
else
  fail=$((fail + 1))
  echo "FAIL: explicit env inspection is not scoped to container zero" >&2
fi

remote_mode="ok"
: > "${remote_log}"
if (deploy_prod_image 'bad image ref') >/dev/null 2>&1; then
  fail=$((fail + 1))
  echo "FAIL: deploy_prod_image accepted invalid image ref" >&2
else
  pass=$((pass + 1))
  echo "PASS: deploy_prod_image rejects invalid image ref before remote preflight"
fi
if [[ -s "${remote_log}" ]]; then
  fail=$((fail + 1))
  echo "FAIL: deploy_prod_image made remote calls for invalid image ref" >&2
else
  pass=$((pass + 1))
  echo "PASS: deploy_prod_image makes no remote calls for invalid image ref"
fi

remote_mode="missing-key"
: > "${remote_log}"
if (deploy_prod_image "${image}") >/dev/null 2>&1; then
  fail=$((fail + 1))
  echo "FAIL: deploy_prod_image accepted incomplete OIDC secret" >&2
else
  pass=$((pass + 1))
  echo "PASS: deploy_prod_image rejects incomplete OIDC secret"
fi
if grep -q 'kubectl .* patch ' "${remote_log}"; then
  fail=$((fail + 1))
  echo "FAIL: deploy_prod_image patched before preflight passed" >&2
else
  pass=$((pass + 1))
  echo "PASS: deploy_prod_image does not mutate before preflight"
fi

remote_mode="invalid-role"
: > "${remote_log}"
if (deploy_prod_image "${image}") >/dev/null 2>&1; then
  fail=$((fail + 1))
  echo "FAIL: deploy_prod_image accepted an unsupported admin role" >&2
else
  pass=$((pass + 1))
  echo "PASS: deploy_prod_image rejects an unsupported admin role"
fi
if grep -q 'kubectl .* patch ' "${remote_log}"; then
  fail=$((fail + 1))
  echo "FAIL: deploy_prod_image patched before role preflight passed" >&2
else
  pass=$((pass + 1))
  echo "PASS: deploy_prod_image validates role before mutation"
fi

remote_mode="ok"
: > "${remote_log}"
if deploy_prod_image "${image}" >/dev/null 2>&1; then
  pass=$((pass + 1))
  echo "PASS: deploy_prod_image applies preflighted atomic patch"
else
  fail=$((fail + 1))
  echo "FAIL: deploy_prod_image rejected valid preflight" >&2
fi

remote_mode="migratable-role-shadow"
: > "${remote_log}"
if deploy_prod_image "${image}" >/dev/null 2>&1 \
  && grep -q '"op":"remove","path":"/spec/template/spec/containers/0/env/1"' "${remote_log}"; then
  pass=$((pass + 1))
  echo "PASS: prod deploy atomically migrates the legacy explicit admin role"
else
  fail=$((fail + 1))
  echo "FAIL: prod deploy did not migrate the legacy explicit admin role" >&2
fi
if grep -q 'kubectl .* patch ' "${remote_log}" \
  && ! grep -q 'set image' "${remote_log}"; then
  pass=$((pass + 1))
  echo "PASS: prod deploy uses patch, not image-only mutation"
else
  fail=$((fail + 1))
  echo "FAIL: prod deploy did not use the atomic patch" >&2
fi

for drift_mode in runtime-prefix-drift runtime-optional-drift runtime-role-shadow; do
  remote_mode="${drift_mode}"
  : > "${remote_log}"
  if (deploy_prod_image "${image}") >/dev/null 2>&1; then
    fail=$((fail + 1))
    echo "FAIL: deploy_prod_image accepted post-patch ${drift_mode}" >&2
  else
    pass=$((pass + 1))
    echo "PASS: deploy_prod_image rejects post-patch ${drift_mode}"
  fi
  if grep -q 'kubectl .* patch ' "${remote_log}"; then
    pass=$((pass + 1))
    echo "PASS: ${drift_mode} is detected by post-patch runtime inspection"
  else
    fail=$((fail + 1))
    echo "FAIL: ${drift_mode} failed before the atomic patch was exercised" >&2
  fi
done

remote_mode="smoke-optional-drift"
: > "${remote_log}"
if (smoke_pair) >/dev/null 2>&1; then
  fail=$((fail + 1))
  echo "FAIL: smoke_pair accepted runtime envFrom optional drift" >&2
else
  pass=$((pass + 1))
  echo "PASS: smoke_pair rejects runtime envFrom optional drift"
fi
if grep -q '^curl ' "${remote_log}"; then
  fail=$((fail + 1))
  echo "FAIL: smoke_pair reached HTTP before rejecting envFrom drift" >&2
else
  pass=$((pass + 1))
  echo "PASS: smoke_pair rejects envFrom drift before HTTP checks"
fi

remote_mode="smoke-role-shadow"
: > "${remote_log}"
if (smoke_pair) >/dev/null 2>&1; then
  fail=$((fail + 1))
  echo "FAIL: smoke_pair accepted an explicit admin-role shadow" >&2
else
  pass=$((pass + 1))
  echo "PASS: smoke_pair rejects an explicit admin-role shadow"
fi
if grep -q '^curl ' "${remote_log}"; then
  fail=$((fail + 1))
  echo "FAIL: smoke_pair reached HTTP before rejecting the admin-role shadow" >&2
else
  pass=$((pass + 1))
  echo "PASS: smoke_pair rejects the admin-role shadow before HTTP checks"
fi

remote_mode="ok"
: > "${remote_log}"
if (deploy_dev_image 'bad image ref') >/dev/null 2>&1; then
  fail=$((fail + 1))
  echo "FAIL: deploy_dev_image accepted invalid image ref" >&2
else
  pass=$((pass + 1))
  echo "PASS: deploy_dev_image rejects invalid image ref"
fi
if [[ -s "${remote_log}" ]]; then
  fail=$((fail + 1))
  echo "FAIL: deploy_dev_image performed rsync/remote work before image validation" >&2
else
  pass=$((pass + 1))
  echo "PASS: deploy_dev_image validates image before rsync/remote work"
fi

# --- legacy apply path preflights before its first mutation ---
kubectl() {
  printf '%s\n' "$*" >> "${KUBECTL_TEST_LOG}"
  if [[ "$*" == *"jsonpath={.data.WITNESSOPS_ADMIN_ROLE}"* ]]; then
    if [[ "${KUBECTL_TEST_MODE}" == "invalid-role" ]]; then
      printf '%s' 'aW52YWxpZA=='
    else
      printf '%s' 'Rm91bmRlcg=='
    fi
  elif [[ "$*" == *"get secret example-identity-secret"* ]]; then
    if [[ "${KUBECTL_TEST_MODE}" == "missing-key" ]]; then
      printf '%s\n' "${KUBECTL_REQUIRED_OIDC_KEYS%$'\nWITNESSOPS_GOOGLE_WORKSPACE_DOMAIN'}"
    else
      printf '%s\n' "${KUBECTL_REQUIRED_OIDC_KEYS}"
    fi
  elif [[ "$*" == *"apply -f -"* ]]; then
    command cat >/dev/null
  fi
}
export -f kubectl
export -f curl
export KUBECTL_TEST_LOG="${apply_log}"
export KUBECTL_REQUIRED_OIDC_KEYS="${required_oidc_keys}"
export remote_log
export KUBECTL_TEST_MODE="missing-key"
apply_output=''
: > "${apply_log}"
if apply_output="$(WITNESSOPS_WEB_ENV_FILE="${PARITY}" \
  WITNESSOPS_WEB_IMAGE="${image}" \
  bash "${APPLY_SCRIPT}" 2>&1)"; then
  fail=$((fail + 1))
  echo "FAIL: apply.sh accepted incomplete OIDC secret" >&2
else
  pass=$((pass + 1))
  echo "PASS: apply.sh rejects incomplete OIDC secret"
fi
if grep -Eq '(^| )(apply|create|patch)( |$)' "${apply_log}"; then
  fail=$((fail + 1))
  echo "FAIL: apply.sh mutated before OIDC preflight passed" >&2
else
  pass=$((pass + 1))
  echo "PASS: apply.sh preflight runs before mutation"
fi

export DEPLOY_NS=$'example-namespace\n---\nkind: ConfigMap'
: > "${apply_log}"
if apply_output="$(WITNESSOPS_WEB_ENV_FILE="${PARITY}" \
  WITNESSOPS_WEB_IMAGE="${image}" \
  bash "${APPLY_SCRIPT}" 2>&1)"; then
  fail=$((fail + 1))
  echo "FAIL: apply.sh accepted injected topology" >&2
else
  pass=$((pass + 1))
  echo "PASS: apply.sh rejects injected topology"
fi
if [[ -s "${apply_log}" ]]; then
  fail=$((fail + 1))
  echo "FAIL: apply.sh contacted kubectl for injected topology" >&2
else
  pass=$((pass + 1))
  echo "PASS: apply.sh rejects injected topology before kubectl"
fi
export DEPLOY_NS=example-namespace

export KUBECTL_TEST_MODE="ok"
: > "${apply_log}"
if apply_output="$(WITNESSOPS_WEB_ENV_FILE="${PARITY}" \
  WITNESSOPS_WEB_IMAGE="${image}" \
  bash "${APPLY_SCRIPT}" 2>&1)"; then
  pass=$((pass + 1))
  echo "PASS: apply.sh accepts complete OIDC key-name preflight"
else
  fail=$((fail + 1))
  echo "FAIL: apply.sh rejected complete OIDC key-name preflight" >&2
  printf '%s\n' "${apply_output}" >&2
fi
if grep -Eq '(^| )(apply|create)( |$)' "${apply_log}"; then
  pass=$((pass + 1))
  echo "PASS: apply.sh mutates only after valid OIDC preflight"
else
  fail=$((fail + 1))
  echo "FAIL: apply.sh did not continue after valid OIDC preflight" >&2
fi
if compare_image_refs \
  'docker.io/library/witnessops-web:shared-1' \
  'docker.io/library/witnessops-web:shared-1'; then
  pass=$((pass + 1))
  echo "PASS: sourced compare_image_refs equal"
else
  fail=$((fail + 1))
  echo "FAIL: sourced compare_image_refs equal" >&2
fi

got=0
compare_image_refs \
  'docker.io/library/witnessops-web:shared-1' \
  'docker.io/library/witnessops-web:shared-2' || got=$?
if [[ "${got}" -eq 2 ]]; then
  pass=$((pass + 1))
  echo "PASS: sourced compare_image_refs mismatch exit 2"
else
  fail=$((fail + 1))
  echo "FAIL: sourced mismatch exit want 2 got ${got}" >&2
fi

# An optional operator-custodied file can hold one exact private token per line.
# The public repository must never contain the denylist or a reversible encoding
# of it. Public CI still verifies the sanitized example contract when no private
# file is supplied.
if [[ -n "${PRIVATE_TOPOLOGY_DENYLIST_FILE:-}" ]]; then
  if check_private_topology_denylist "${PRIVATE_TOPOLOGY_DENYLIST_FILE}"; then
    pass=$((pass + 1))
    echo "PASS: tracked public files contain no operator-custodied private topology tokens"
  else
    fail=$((fail + 1))
  fi
elif grep -Fq -- 'deploy-host.private.example' \
  "${REPO_ROOT}/deploy/topology.env.example" \
  && grep -Fq -- '192.0.2.10' \
    "${REPO_ROOT}/deploy/topology.env.example"; then
  pass=$((pass + 1))
  echo "PASS: public topology contract uses non-operational examples"
else
  fail=$((fail + 1))
  echo "FAIL: public topology example contract is missing" >&2
fi

echo "---"
echo "passed=${pass} failed=${fail}"
[[ "${fail}" -eq 0 ]]
