#!/usr/bin/env bash
# Unit tests for deploy/scripts/k3s-parity.sh (real shipped helpers).
# Run: bash deploy/scripts/test-k3s-parity.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARITY="${SCRIPT_DIR}/k3s-parity.sh"
K3S_LIB="${SCRIPT_DIR}/k3s-lib.sh"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROD_MANIFEST="${REPO_ROOT}/deploy/k8s/deployment.yaml"
DEV_MANIFEST="${REPO_ROOT}/deploy/k8s/dev-mesh-deployment.yaml"
APPLY_SCRIPT="${REPO_ROOT}/deploy/k8s/apply.sh"
[[ -f "${PARITY}" ]] || { echo "missing ${PARITY}" >&2; exit 1; }
[[ -f "${K3S_LIB}" ]] || { echo "missing ${K3S_LIB}" >&2; exit 1; }

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
    in_first_secret && !changed && /^[[:space:]]*name:[[:space:]]*witnessops-web-env[[:space:]]*$/ {
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

# --- compare-css ---
assert_exit 0 bash "${PARITY}" compare-css 'css/aaa.css' 'css/aaa.css'
assert_exit 0 bash "${PARITY}" compare-css '' ''
assert_exit 2 bash "${PARITY}" compare-css 'css/aaa.css' 'css/bbb.css'
assert_exit 2 bash "${PARITY}" compare-css 'css/aaa.css' ''

# --- checked-in deployment secretRef parity ---
required_shared_envfrom=$'secret:witnessops-web-env|prefix=|optional=false\nsecret:witnessops-web-admin-oidc|prefix=|optional=false'
assert_output "${required_shared_envfrom}" manifest_envfrom_contract "${PROD_MANIFEST}"
assert_output "${required_shared_envfrom}" manifest_envfrom_contract "${DEV_MANIFEST}"

static_prefix_drift="$(manifest_with_first_envfrom_prefix "${PROD_MANIFEST}" \
  | manifest_envfrom_contract /dev/stdin)"
assert_output \
  $'secret:witnessops-web-env|prefix=WOPS_|optional=false\nsecret:witnessops-web-admin-oidc|prefix=|optional=false' \
  printf '%s' "${static_prefix_drift}"

static_optional_drift="$(manifest_with_first_envfrom_optional "${PROD_MANIFEST}" \
  | manifest_envfrom_contract /dev/stdin)"
assert_output \
  $'secret:witnessops-web-env|prefix=|optional=true\nsecret:witnessops-web-admin-oidc|prefix=|optional=false' \
  printf '%s' "${static_optional_drift}"

# --- sourced API (same file, real functions) ---
# shellcheck source=k3s-parity.sh
source "${PARITY}"
runtime_envfrom_contract=$'container:witnessops-web\nsecret:witnessops-web-env|prefix=|optional=false\nsecret:witnessops-web-admin-oidc|prefix=|optional=false'
assert_output "${runtime_envfrom_contract}" expected_admin_runtime_envfrom_contract
assert_exit 0 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" "${runtime_envfrom_contract}"
assert_exit 2 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" \
  $'container:witnessops-web\nsecret:witnessops-web-admin-oidc|prefix=|optional=false\nsecret:witnessops-web-env|prefix=|optional=false'
assert_exit 2 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" \
  $'container:witnessops-web\nsecret:witnessops-web-env|prefix=|optional=false'
assert_exit 2 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" \
  $'container:witnessops-web\nsecret:witnessops-web-env|prefix=WOPS_|optional=false\nsecret:witnessops-web-admin-oidc|prefix=|optional=false'
assert_exit 2 compare_runtime_envfrom_contract \
  "${runtime_envfrom_contract}" \
  $'container:witnessops-web\nsecret:witnessops-web-env|prefix=|optional=true\nsecret:witnessops-web-admin-oidc|prefix=|optional=false'
assert_exit 2 compare_runtime_envfrom_contract \
  "${required_shared_envfrom}" "${static_prefix_drift}"
assert_exit 2 compare_runtime_envfrom_contract \
  "${required_shared_envfrom}" "${static_optional_drift}"

required_oidc_keys="$(required_admin_oidc_key_names)"
expected_required_oidc_keys=$'WITNESSOPS_ADMIN_SECRET\nWITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST\nWITNESSOPS_GOOGLE_OIDC_CLIENT_ID\nWITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET\nWITNESSOPS_GOOGLE_OIDC_REDIRECT_URI\nWITNESSOPS_GOOGLE_WORKSPACE_DOMAIN'
assert_output "${expected_required_oidc_keys}" sorted_unique_lines "${required_oidc_keys}"
assert_exit 0 validate_admin_oidc_key_names \
  "${required_oidc_keys}" \
  $'WITNESSOPS_ADMIN_OIDC_CLIENT_ID\nWITNESSOPS_GOOGLE_OIDC_CLIENT_ID'
assert_exit 2 validate_admin_oidc_key_names \
  "$(without_line "${required_oidc_keys}" WITNESSOPS_ADMIN_SECRET)"
assert_exit 2 validate_admin_oidc_key_names \
  "$(without_line "${required_oidc_keys}" WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN)"

# --- prod deploy preflight and atomic patch ---
# shellcheck source=k3s-lib.sh
source "${K3S_LIB}"
image='docker.io/library/witnessops-web:main-test-20260806T000000Z'
expected_patch='[{"op":"test","path":"/spec/template/spec/containers/0/name","value":"witnessops-web"},{"op":"add","path":"/spec/template/spec/containers/0/envFrom","value":[{"secretRef":{"name":"witnessops-web-env"}},{"secretRef":{"name":"witnessops-web-admin-oidc"}}]},{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"docker.io/library/witnessops-web:main-test-20260806T000000Z"}]'
assert_output "${expected_patch}" prod_deployment_json_patch "${image}"
assert_exit 1 prod_deployment_json_patch 'bad image ref'

remote_mode="ok"
remote_log="$(mktemp "${TMPDIR:-/tmp}/witnessops-k3s-remote.XXXXXX")"
apply_log="$(mktemp "${TMPDIR:-/tmp}/witnessops-k3s-apply.XXXXXX")"
trap 'rm -f "${remote_log}" "${apply_log}"' EXIT

remote() {
  local command_text="$*"
  printf '%s\n' "${command_text}" >> "${remote_log}"
  if [[ "${command_text}" == *"get secret"*"witnessops-web-admin-oidc"* ]]; then
    if [[ "${remote_mode}" == "missing-key" ]]; then
      without_line "${required_oidc_keys}" WITNESSOPS_ADMIN_SECRET
    else
      printf '%s\n' "${required_oidc_keys}"
    fi
  elif [[ "${command_text}" == *"get deploy"*"go-template"* ]]; then
    case "${remote_mode}" in
      runtime-prefix-drift|smoke-prefix-drift)
        printf '%s\n' $'container:witnessops-web\nsecret:witnessops-web-env|prefix=WOPS_|optional=false\nsecret:witnessops-web-admin-oidc|prefix=|optional=false'
        ;;
      runtime-optional-drift|smoke-optional-drift)
        printf '%s\n' $'container:witnessops-web\nsecret:witnessops-web-env|prefix=|optional=true\nsecret:witnessops-web-admin-oidc|prefix=|optional=false'
        ;;
      *)
        printf '%s\n' "${runtime_envfrom_contract}"
        ;;
    esac
  fi
}

rsync() {
  printf 'rsync %s\n' "$*" >> "${remote_log}"
}

curl() {
  printf 'curl %s\n' "$*" >> "${remote_log}"
  return 0
}

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

remote_mode="ok"
: > "${remote_log}"
if deploy_prod_image "${image}" >/dev/null 2>&1; then
  pass=$((pass + 1))
  echo "PASS: deploy_prod_image applies preflighted atomic patch"
else
  fail=$((fail + 1))
  echo "FAIL: deploy_prod_image rejected valid preflight" >&2
fi
if grep -q 'kubectl .* patch ' "${remote_log}" \
  && ! grep -q 'set image' "${remote_log}"; then
  pass=$((pass + 1))
  echo "PASS: prod deploy uses patch, not image-only mutation"
else
  fail=$((fail + 1))
  echo "FAIL: prod deploy did not use the atomic patch" >&2
fi

for drift_mode in runtime-prefix-drift runtime-optional-drift; do
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
  if [[ "$*" == *"get secret witnessops-web-admin-oidc"* ]]; then
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

echo "---"
echo "passed=${pass} failed=${fail}"
[[ "${fail}" -eq 0 ]]
