#!/usr/bin/env bash
# Pure dual-lane parity helpers (no cluster mutation).
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
