#!/usr/bin/env bash
# Pure dual-lane parity and deploy-contract helpers (no cluster mutation).
# Source this file, or invoke as a CLI for unit tests / dry checks:
#
#   ./k3s-parity.sh compare-images <prod_image> <dev_image>
#   ./k3s-parity.sh compare-css <prod_css> <dev_css>
#
# Exit codes:
#   0 — equal (or CSS both empty)
#   2 — mismatch
#   1 — usage / missing args
set -euo pipefail

# Normalize image refs for comparison: strip optional docker.io/library/ prefix
# variance and trailing whitespace so equal images still match when one side
# is short-form (library/foo:tag vs docker.io/library/foo:tag).
normalize_image_ref() {
  local ref="${1:-}"
  ref="$(printf '%s' "${ref}" | tr -d '[:space:]')"
  # Collapse docker.io/library/X and library/X to docker.io/library/X when bare.
  if [[ "${ref}" == library/* ]]; then
    ref="docker.io/${ref}"
  elif [[ "${ref}" != */* && "${ref}" == *:* ]]; then
    # bare "name:tag" → docker.io/library/name:tag
    ref="docker.io/library/${ref}"
  fi
  printf '%s' "${ref}"
}

# Returns 0 if refs are equal after normalize; 2 if not; 1 if either empty.
compare_image_refs() {
  local a b na nb
  a="${1:-}"
  b="${2:-}"
  if [[ -z "${a}" || -z "${b}" ]]; then
    printf 'image ref missing: prod=%q dev=%q\n' "${a}" "${b}" >&2
    return 1
  fi
  na="$(normalize_image_ref "${a}")"
  nb="$(normalize_image_ref "${b}")"
  if [[ "${na}" != "${nb}" ]]; then
    printf 'image mismatch: prod=%s dev=%s\n' "${na}" "${nb}" >&2
    return 2
  fi
  return 0
}

# CSS path fragments like css/abc123.css. Empty on both sides is OK (no fail).
# One empty + one set fails. Differing set values fail.
compare_css_refs() {
  local a b
  a="${1:-}"
  b="${2:-}"
  if [[ -z "${a}" && -z "${b}" ]]; then
    return 0
  fi
  if [[ -z "${a}" || -z "${b}" ]]; then
    printf 'css incomplete: prod=%q dev=%q\n' "${a}" "${b}" >&2
    return 2
  fi
  if [[ "${a}" != "${b}" ]]; then
    printf 'css mismatch: prod=%s dev=%s\n' "${a}" "${b}" >&2
    return 2
  fi
  return 0
}

# Exact runtime contract for the application container. Order matters because
# later envFrom sources take precedence over earlier sources for duplicate keys.
expected_admin_runtime_envfrom_contract() {
  : "${APP_CONTAINER_NAME:?set APP_CONTAINER_NAME}"
  : "${BASE_ENV_SECRET:?set BASE_ENV_SECRET}"
  : "${ADMIN_OIDC_SECRET:?set ADMIN_OIDC_SECRET}"
  printf '%s\n' \
    "container:${APP_CONTAINER_NAME}" \
    "secret:${BASE_ENV_SECRET}|prefix=|optional=false" \
    "secret:${ADMIN_OIDC_SECRET}|prefix=|optional=false"
}

# Returns 0 for an exact ordered match, 2 for drift, and 1 when either side is
# missing. Callers must not sort either contract before comparison.
compare_runtime_envfrom_contract() {
  local expected actual
  expected="${1:-}"
  actual="${2:-}"
  if [[ -z "${expected}" || -z "${actual}" ]]; then
    printf 'runtime envFrom contract missing\n' >&2
    return 1
  fi
  if [[ "${expected}" != "${actual}" ]]; then
    printf 'runtime envFrom contract mismatch\n' >&2
    return 2
  fi
  return 0
}

# Names only. Secret values are never decoded, emitted, or logged by the deploy
# preflight.
required_admin_oidc_key_names() {
  printf '%s\n' \
    'WITNESSOPS_ADMIN_SECRET' \
    'WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST' \
    'WITNESSOPS_GOOGLE_OIDC_CLIENT_ID' \
    'WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET' \
    'WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI' \
    'WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN'
}

# Accepts one or more newline-delimited key-name lists. Extra keys are allowed
# so deliberately dormant fallback credentials do not block a Google deploy.
validate_admin_oidc_key_names() {
  local supplied required_key missing
  supplied="$(printf '%s\n' "$@")"
  missing=0

  while IFS= read -r required_key; do
    [[ -n "${required_key}" ]] || continue
    if ! grep -Fqx -- "${required_key}" <<<"${supplied}"; then
      printf 'admin OIDC secret is missing required key: %s\n' "${required_key}" >&2
      missing=1
    fi
  done < <(required_admin_oidc_key_names)

  [[ "${missing}" -eq 0 ]] || return 2
  return 0
}

# Keep interpolated image references out of shell and JSON control syntax.
validate_container_image_ref() {
  local image
  image="${1:-}"
  if [[ -z "${image}" || ${#image} -gt 512 \
    || ! "${image}" =~ ^[[:alnum:]][[:alnum:]._/\@:+-]*$ ]]; then
    printf 'invalid container image reference\n' >&2
    return 1
  fi
  return 0
}

# Topology validators are pure so every deploy entrypoint can fail closed before
# rendering or contacting a cluster. Callers choose which fields they require.
validate_ssh_target() {
  local value="${1:-}"
  [[ -n "${value}" && ${#value} -le 253 \
    && "${value}" =~ ^[A-Za-z0-9._-]+(@[A-Za-z0-9._-]+)?$ ]] || {
    printf 'invalid SSH target\n' >&2
    return 1
  }
}

validate_kubernetes_name() {
  local value="${1:-}"
  [[ -n "${value}" && ${#value} -le 253 \
    && "${value}" =~ ^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$ ]] || {
    printf 'invalid Kubernetes topology name\n' >&2
    return 1
  }
}

validate_bind_host() {
  local value="${1:-}"
  [[ -n "${value}" && ${#value} -le 253 \
    && "${value}" =~ ^[A-Za-z0-9.-]+$ ]] || {
    printf 'invalid bind host\n' >&2
    return 1
  }
}

validate_unprivileged_port() {
  local value="${1:-}"
  [[ "${value}" =~ ^[0-9]+$ ]] \
    && (( value >= 1024 && value <= 65535 )) || {
    printf 'invalid unprivileged TCP port\n' >&2
    return 1
  }
}

# CLI entry when executed (not sourced).
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  cmd="${1:-}"
  case "${cmd}" in
    compare-images)
      shift
      compare_image_refs "${1:-}" "${2:-}"
      ;;
    compare-css)
      shift
      compare_css_refs "${1:-}" "${2:-}"
      ;;
    *)
      printf 'usage: %s compare-images <prod> <dev> | compare-css <prod> <dev>\n' "$0" >&2
      exit 1
      ;;
  esac
fi
