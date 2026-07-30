#!/usr/bin/env bash
# Unit tests for deploy/scripts/k3s-parity.sh (real shipped helpers).
# Run: bash deploy/scripts/test-k3s-parity.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARITY="${SCRIPT_DIR}/k3s-parity.sh"
[[ -f "${PARITY}" ]] || { echo "missing ${PARITY}" >&2; exit 1; }

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

# --- sourced API (same file, real functions) ---
# shellcheck source=k3s-parity.sh
source "${PARITY}"
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
