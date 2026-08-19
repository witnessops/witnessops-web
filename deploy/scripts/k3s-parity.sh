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

# Credential values are never decoded, emitted, or logged by deploy preflight.
# The bounded admin-role enum is decoded separately into captured shell state
# so an exact legacy explicit role can be migrated without widening authority.
required_admin_oidc_key_names() {
  printf '%s\n' \
    'WITNESSOPS_ADMIN_SECRET' \
    'WITNESSOPS_ADMIN_ROLE' \
    'WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST' \
    'WITNESSOPS_GOOGLE_OIDC_CLIENT_ID' \
    'WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET' \
    'WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI' \
    'WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN'
}

validate_admin_role_value() {
  case "${1:-}" in
    'Founder'|'Delegated Operator'|'Administrator') return 0 ;;
    *)
      printf 'admin role is missing or unsupported\n' >&2
      return 2
      ;;
  esac
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

validate_no_admin_oidc_env_shadows() {
  local supplied protected_key shadowed
  supplied="$(printf '%s\n' "$@")"
  shadowed=0

  while IFS= read -r protected_key; do
    [[ -n "${protected_key}" ]] || continue
    if grep -Fqx -- "${protected_key}" <<<"${supplied}"; then
      printf 'explicit env shadows admin OIDC secret key: %s\n' "${protected_key}" >&2
      shadowed=1
    fi
  done < <(required_admin_oidc_key_names)

  [[ "${shadowed}" -eq 0 ]] || return 2
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

validate_sha256_digest() {
  local digest="${1:-}"
  [[ "${digest}" =~ ^sha256:[0-9a-f]{64}$ ]] || {
    printf 'invalid sha256 digest\n' >&2
    return 1
  }
}

# Release deployments must use an immutable manifest reference. A human-readable
# tag may still be retained as a local alias and in the release receipt.
validate_digest_container_image_ref() {
  local image prefix digest
  image="${1:-}"
  validate_container_image_ref "${image}" || return 1
  [[ "${image}" == *@sha256:* ]] || {
    printf 'container image reference is not digest-qualified\n' >&2
    return 1
  }
  prefix="${image%@*}"
  digest="${image##*@}"
  [[ -n "${prefix}" && "${prefix}" != *'@'* ]] || {
    printf 'invalid digest-qualified container image reference\n' >&2
    return 1
  }
  validate_sha256_digest "${digest}"
}

image_digest_from_ref() {
  local image
  image="${1:-}"
  validate_digest_container_image_ref "${image}" || return 1
  printf '%s' "${image##*@}"
}

normalize_runtime_image_id() {
  local image_id digest
  image_id="${1:-}"
  if [[ -z "${image_id}" || "${image_id}" == *[[:space:]]* ]]; then
    printf 'invalid runtime image ID\n' >&2
    return 1
  fi
  digest="${image_id##*@}"
  digest="${digest##*://}"
  validate_sha256_digest "${digest}" >/dev/null 2>&1 || {
    printf 'invalid runtime image ID\n' >&2
    return 1
  }
  printf '%s' "${digest}"
}

# Each newline-delimited record is ready|pod-spec-image-ref|runtime-image-id.
# Kubernetes preserves the requested immutable manifest in the Pod spec. CRI
# implementations differ on imageID: containerd may report either that manifest
# digest or its manifest-bound config digest. Accept only those two identities.
compare_running_image_records() {
  local expected_image expected_manifest expected_config expected_count records
  local ready image image_id extra normalized_id count
  expected_image="${1:-}"
  expected_config="${2:-}"
  expected_count="${3:-}"
  records="${4:-}"

  validate_digest_container_image_ref "${expected_image}" || return 1
  expected_manifest="$(image_digest_from_ref "${expected_image}")" || return 1
  validate_sha256_digest "${expected_config}" || return 1
  [[ "${expected_count}" =~ ^[1-9][0-9]*$ ]] || {
    printf 'invalid expected running replica count\n' >&2
    return 1
  }
  [[ -n "${records}" ]] || {
    printf 'running image records are missing\n' >&2
    return 1
  }

  count=0
  while IFS='|' read -r ready image image_id extra; do
    [[ -n "${ready}${image}${image_id}${extra}" ]] || continue
    if [[ "${ready}" != "true" || -n "${extra}" ]]; then
      printf 'running image record is malformed or not ready\n' >&2
      return 2
    fi
    compare_image_refs "${expected_image}" "${image}" || return 2
    normalized_id="$(normalize_runtime_image_id "${image_id}")" || return 2
    if [[ "${normalized_id}" != "${expected_manifest}" \
      && "${normalized_id}" != "${expected_config}" ]]; then
      printf 'runtime image ID mismatch: expected-manifest=%s expected-config=%s actual=%s\n' \
        "${expected_manifest}" "${expected_config}" "${normalized_id}" >&2
      return 2
    fi
    count=$((count + 1))
  done <<<"${records}"

  if [[ "${count}" -ne "${expected_count}" ]]; then
    printf 'running replica count mismatch: expected=%s actual=%s\n' \
      "${expected_count}" "${count}" >&2
    return 2
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
