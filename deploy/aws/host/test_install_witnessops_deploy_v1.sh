#!/usr/bin/env bash
set -euo pipefail

this_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
installer="${this_dir}/install-witnessops-deploy-v1.sh"
adapter="${this_dir}/witnessops-deploy-v1"
config="${this_dir}/witnessops-deploy-v1.config.example.json"

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

adapter_sha256="$(sha256_file "${adapter}")"
config_sha256="$(sha256_file "${config}")"

output="$(
  "${installer}" --check \
    --adapter "${adapter}" \
    --config "${config}" \
    --expected-sha256 "${adapter_sha256}" \
    --expected-config-sha256 "${config_sha256}"
)"
grep -qx 'adapter_install_check=pass' <<<"${output}"
grep -qx "adapter_sha256=${adapter_sha256}" <<<"${output}"
grep -qx "config_sha256=${config_sha256}" <<<"${output}"

wrong_config_sha256="$(printf '0%.0s' {1..64})"
if "${installer}" --check \
  --adapter "${adapter}" \
  --config "${config}" \
  --expected-sha256 "${adapter_sha256}" \
  --expected-config-sha256 "${wrong_config_sha256}" >/dev/null 2>&1; then
  printf 'installer accepted a mismatched config SHA-256\n' >&2
  exit 1
fi

test_root="$(mktemp -d)"
cleanup() {
  rm -rf "${test_root}"
}
trap cleanup EXIT INT TERM

test_installer="${test_root}/install-witnessops-deploy-v1.sh"
test_adapter_target="${test_root}/usr/local/sbin/witnessops-deploy-v1"
test_config_target="${test_root}/etc/witnessops/deploy-v1.json"
test_backup_root="${test_root}/var/backups/witnessops-deploy-v1"
sed \
  -e "s|adapter_target=\"/usr/local/sbin/witnessops-deploy-v1\"|adapter_target=\"${test_adapter_target}\"|" \
  -e "s|config_target=\"/etc/witnessops/deploy-v1.json\"|config_target=\"${test_config_target}\"|" \
  -e 's|\[\[ "${EUID}" -eq 0 \]\]|[[ 0 -eq 0 ]]|' \
  -e "s|install -d -o root -g root -m 0755 /usr/local/sbin /etc/witnessops|install -d -m 0755 \"${test_root}/usr/local/sbin\" \"${test_root}/etc/witnessops\"|" \
  -e "s|backup_dir=\"/var/backups/witnessops-deploy-v1/|backup_dir=\"${test_backup_root}/|" \
  -e "s|mktemp /usr/local/sbin/.witnessops-deploy-v1.XXXXXX|mktemp \"${test_root}/usr/local/sbin/.witnessops-deploy-v1.XXXXXX\"|" \
  -e "s|mktemp /etc/witnessops/.deploy-v1.json.XXXXXX|mktemp \"${test_root}/etc/witnessops/.deploy-v1.json.XXXXXX\"|" \
  -e 's|install -o root -g root|install|g' \
  "${installer}" > "${test_installer}"
chmod 0755 "${test_installer}"

safe_adapter="${test_root}/safe-adapter.py"
cat > "${safe_adapter}" <<'PY'
#!/usr/bin/env python3
import os
import sys

with open(os.environ["EXECUTION_LOG"], "a", encoding="utf-8") as stream:
    stream.write(f"{sys.argv[0]}\n")
if len(sys.argv) != 4 or sys.argv[1] != "--self-test" or sys.argv[2] != "--config":
    raise SystemExit(1)
PY
chmod 0755 "${safe_adapter}"
test_config="${test_root}/config.json"
printf '{}\n' > "${test_config}"
chmod 0600 "${test_config}"
safe_sha256="$(sha256_file "${safe_adapter}")"
test_config_sha256="$(sha256_file "${test_config}")"
execution_log="${test_root}/execution.log"

EXECUTION_LOG="${execution_log}" "${test_installer}" --apply \
  --adapter "${safe_adapter}" \
  --config "${test_config}" \
  --expected-sha256 "${safe_sha256}" \
  --expected-config-sha256 "${test_config_sha256}" >/dev/null
[[ "$(sha256_file "${test_adapter_target}")" == "${safe_sha256}" ]]
[[ "$(sha256_file "${test_config_target}")" == "${test_config_sha256}" ]]
if grep -Fxq "${safe_adapter}" "${execution_log}"; then
  printf 'apply mode executed the adapter source pathname\n' >&2
  exit 1
fi

race_source="${test_root}/race-adapter.py"
cp "${safe_adapter}" "${race_source}"
replacement_source="${test_root}/replacement-adapter.py"
cat > "${replacement_source}" <<'PY'
#!/usr/bin/env python3
from pathlib import Path
import os

Path(os.environ["REPLACEMENT_MARKER"]).write_text("executed\n", encoding="utf-8")
PY
chmod 0755 "${replacement_source}"
race_expected_sha256="$(sha256_file "${race_source}")"
wrapper_dir="${test_root}/bin"
mkdir -p "${wrapper_dir}"
real_sha256sum="$(command -v sha256sum || true)"
real_shasum="$(command -v shasum || true)"
cat > "${wrapper_dir}/sha256sum" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

real_hash() {
  if [[ -n "${REAL_SHA256SUM}" ]]; then
    "${REAL_SHA256SUM}" "$@"
  else
    "${REAL_SHASUM}" -a 256 "$@"
  fi
}

if [[ "$#" -eq 1 && "$1" == "${RACE_TARGET}" && ! -e "${SWAP_DONE}" ]]; then
  digest="$(real_hash "$1" | awk '{print $1}')"
  mv "${REPLACEMENT_SOURCE}" "${RACE_TARGET}"
  : > "${SWAP_DONE}"
  printf '%s  %s\n' "${digest}" "${RACE_TARGET}"
  exit 0
fi
real_hash "$@"
SH
chmod 0755 "${wrapper_dir}/sha256sum"
swap_done="${test_root}/swap.done"
replacement_marker="${test_root}/replacement.executed"
if PATH="${wrapper_dir}:${PATH}" \
  REAL_SHA256SUM="${real_sha256sum}" \
  REAL_SHASUM="${real_shasum}" \
  RACE_TARGET="${race_source}" \
  REPLACEMENT_SOURCE="${replacement_source}" \
  SWAP_DONE="${swap_done}" \
  REPLACEMENT_MARKER="${replacement_marker}" \
  EXECUTION_LOG="${execution_log}" \
  "${test_installer}" --apply --replace \
    --adapter "${race_source}" \
    --config "${test_config}" \
    --expected-sha256 "${race_expected_sha256}" \
    --expected-config-sha256 "${test_config_sha256}" >/dev/null 2>&1; then
  printf 'installer accepted a source pathname swap\n' >&2
  exit 1
fi
[[ -e "${swap_done}" ]] || { printf 'pathname-swap test did not trigger\n' >&2; exit 1; }
[[ ! -e "${replacement_marker}" ]] \
  || { printf 'replacement adapter executed during apply\n' >&2; exit 1; }

printf 'adapter_installer_digest_tests=pass\n'
