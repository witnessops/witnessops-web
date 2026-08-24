#!/usr/bin/env bash
# Validate or atomically install the reviewed root-owned host adapter.
# The default mode is read-only --check. --apply is required for mutation.
set -euo pipefail

mode="check"
replace=0
adapter_source=""
config_source=""
expected_sha256=""
expected_config_sha256=""
adapter_target="/usr/local/sbin/witnessops-deploy-v1"
config_target="/etc/witnessops/deploy-v1.json"

usage() {
  cat <<'EOF'
usage: install-witnessops-deploy-v1.sh [--check|--apply] \
  --adapter PATH --config PATH --expected-sha256 HEX \
  --expected-config-sha256 HEX [--replace]

--check    Validate source, digest, and configuration without mutation (default).
--apply    Install root:root 0755 adapter and root:root 0600 configuration.
--replace  Permit an existing installation to be backed up and replaced.
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --check)
      mode="check"
      shift
      ;;
    --apply)
      mode="apply"
      shift
      ;;
    --replace)
      replace=1
      shift
      ;;
    --adapter)
      [[ "$#" -ge 2 ]] || { usage >&2; exit 2; }
      adapter_source="$2"
      shift 2
      ;;
    --config)
      [[ "$#" -ge 2 ]] || { usage >&2; exit 2; }
      config_source="$2"
      shift 2
      ;;
    --expected-sha256)
      [[ "$#" -ge 2 ]] || { usage >&2; exit 2; }
      expected_sha256="$2"
      shift 2
      ;;
    --expected-config-sha256)
      [[ "$#" -ge 2 ]] || { usage >&2; exit 2; }
      expected_config_sha256="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'unsupported argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ -n "${adapter_source}" && -f "${adapter_source}" ]] \
  || { printf 'adapter source is unavailable\n' >&2; exit 1; }
[[ -n "${config_source}" && -f "${config_source}" ]] \
  || { printf 'adapter config source is unavailable\n' >&2; exit 1; }
[[ "${expected_sha256}" =~ ^[0-9a-f]{64}$ ]] \
  || { printf 'expected adapter SHA-256 is invalid\n' >&2; exit 1; }
[[ "${expected_config_sha256}" =~ ^[0-9a-f]{64}$ ]] \
  || { printf 'expected config SHA-256 is invalid\n' >&2; exit 1; }
command -v python3 >/dev/null 2>&1 \
  || { printf 'python3 is required\n' >&2; exit 1; }

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    printf 'no SHA-256 verifier is available\n' >&2
    return 1
  fi
}

observed_sha256="$(sha256_file "${adapter_source}")"
[[ "${observed_sha256}" == "${expected_sha256}" ]] \
  || { printf 'adapter SHA-256 mismatch\n' >&2; exit 1; }
observed_config_sha256="$(sha256_file "${config_source}")"
[[ "${observed_config_sha256}" == "${expected_config_sha256}" ]] \
  || { printf 'config SHA-256 mismatch\n' >&2; exit 1; }

if [[ "${mode}" == "check" ]]; then
  python3 "${adapter_source}" --self-test --config "${config_source}" >/dev/null
  printf 'adapter_install_check=pass\n'
  printf 'adapter_sha256=%s\n' "${observed_sha256}"
  printf 'config_sha256=%s\n' "${observed_config_sha256}"
  printf 'planned_adapter_path=%s\n' "${adapter_target}"
  printf 'planned_config_path=%s\n' "${config_target}"
  exit 0
fi

[[ "${EUID}" -eq 0 ]] \
  || { printf 'adapter apply must run as root\n' >&2; exit 1; }
if [[ ( -e "${adapter_target}" || -e "${config_target}" ) && "${replace}" -ne 1 ]]; then
  printf 'existing adapter/config requires explicit --replace\n' >&2
  exit 1
fi

install -d -o root -g root -m 0755 /usr/local/sbin /etc/witnessops

backup_dir=""
if [[ -e "${adapter_target}" || -e "${config_target}" ]]; then
  backup_dir="/var/backups/witnessops-deploy-v1/$(date -u +%Y%m%dT%H%M%SZ)"
  install -d -o root -g root -m 0700 "${backup_dir}"
  if [[ -e "${adapter_target}" ]]; then
    install -o root -g root -m 0755 "${adapter_target}" "${backup_dir}/witnessops-deploy-v1"
  fi
  if [[ -e "${config_target}" ]]; then
    install -o root -g root -m 0600 "${config_target}" "${backup_dir}/deploy-v1.json"
  fi
fi

adapter_tmp="$(mktemp /usr/local/sbin/.witnessops-deploy-v1.XXXXXX)"
config_tmp="$(mktemp /etc/witnessops/.deploy-v1.json.XXXXXX)"
cleanup() {
  [[ ! -e "${adapter_tmp}" ]] || unlink "${adapter_tmp}"
  [[ ! -e "${config_tmp}" ]] || unlink "${config_tmp}"
}
trap cleanup EXIT INT TERM

install -o root -g root -m 0755 "${adapter_source}" "${adapter_tmp}"
install -o root -g root -m 0600 "${config_source}" "${config_tmp}"
[[ "$(sha256_file "${adapter_tmp}")" == "${expected_sha256}" ]] \
  || { printf 'installed adapter staging digest mismatch\n' >&2; exit 1; }
[[ "$(sha256_file "${config_tmp}")" == "${expected_config_sha256}" ]] \
  || { printf 'installed config staging digest mismatch\n' >&2; exit 1; }
# Apply mode never executes either source pathname. Only the root-owned,
# digest-verified staged pair is self-tested before either target is replaced.
python3 "${adapter_tmp}" --self-test --config "${config_tmp}" >/dev/null

mv -f "${adapter_tmp}" "${adapter_target}"
mv -f "${config_tmp}" "${config_target}"
trap - EXIT INT TERM
python3 "${adapter_target}" --self-test --config "${config_target}" >/dev/null

printf 'adapter_install=pass\n'
printf 'adapter_sha256=%s\n' "${expected_sha256}"
printf 'config_sha256=%s\n' "${expected_config_sha256}"
printf 'adapter_path=%s\n' "${adapter_target}"
printf 'config_path=%s\n' "${config_target}"
if [[ -n "${backup_dir}" ]]; then
  printf 'backup_path=%s\n' "${backup_dir}"
fi
