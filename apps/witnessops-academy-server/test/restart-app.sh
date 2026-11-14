#!/usr/bin/env bash
# Restart the Academy lesson server for the disposable e2e run.
# The database name is $1. Secrets stay in *_FILE values from ACADEMY_CI_ENV.
set +x
set -euo pipefail

if [[ -z ${ACADEMY_CI_ENV:-} || ! -f ${ACADEMY_CI_ENV} ]]; then
  echo "ACADEMY_CI_ENV is not set" >&2
  exit 1
fi

db=${1:-academy}
if [[ ! "$db" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "bad database name" >&2
  exit 1
fi
quoted_env=$(mktemp)
found_db=0
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "${line%%=*}" == "ACADEMY_DB_NAME" ]]; then
    printf '%s=%q\n' ACADEMY_DB_NAME "$db"
    found_db=1
  else
    printf '%s\n' "$line"
  fi
done <"$ACADEMY_CI_ENV" >"$quoted_env"
if [[ "$found_db" != 1 ]]; then
  printf '%s=%q\n' ACADEMY_DB_NAME "$db" >>"$quoted_env"
fi
mv "$quoted_env" "$ACADEMY_CI_ENV"
chmod 600 "$ACADEMY_CI_ENV"
# shellcheck disable=SC1090
source "$ACADEMY_CI_ENV"
export ACADEMY_DB_NAME="$db"

mask_secret_file() {
  local value
  value=$(tr -d '\r' <"$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  [[ -n "$value" ]] || return 0
  # The e2e runner captures this script's stdout and does not pass fd 4.
  # Writing the mask directive there would put the secret in that capture.
  { echo "::add-mask::${value}" >&4; } 2>/dev/null || true
}
if [[ -n "${ACADEMY_CI_SECRET_DIR:-}" && -d "$ACADEMY_CI_SECRET_DIR" ]]; then
  shopt -s nullglob
  for secret_file in "$ACADEMY_CI_SECRET_DIR"/*; do
    [[ -f "$secret_file" ]] || continue
    [[ "$(basename "$secret_file")" == "scan-patterns" ]] && continue
    mask_secret_file "$secret_file"
  done
fi

root=${ACADEMY_SERVER_ROOT:?}
pidfile=${ACADEMY_CI_PID_FILE:?}
log=${ACADEMY_CI_SERVER_LOG:?}
port=${ACADEMY_APP_PORT:-18300}

redact_tail() {
  python3 - "$log" "${ACADEMY_CI_SECRET_DIR:-}" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
secret_dir = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else None
if not path.is_file():
    sys.exit(0)
text = path.read_text(errors="replace")
secrets = []
if secret_dir and secret_dir.is_dir():
    for item in secret_dir.iterdir():
        if item.is_file():
            value = item.read_text(errors="replace").strip()
            if len(value) >= 8:
                secrets.append(value)
secrets.sort(key=len, reverse=True)
for value in secrets:
    text = text.replace(value, "[REDACTED]")
needle = "ey" + "J"
lines = [line for line in text.splitlines() if needle not in line]
sys.stdout.write("\n".join(lines[-80:]) + ("\n" if lines else ""))
PY
}

if [[ -f "$pidfile" ]]; then
  old=$(cat "$pidfile" || true)
  if [[ -n "${old}" ]] && kill -0 "$old" 2>/dev/null; then
    kill "$old" || true
    for _ in $(seq 1 50); do
      kill -0 "$old" 2>/dev/null || break
      sleep 0.1
    done
    if kill -0 "$old" 2>/dev/null; then
      kill -9 "$old" || true
    fi
    sleep 0.2
  fi
fi

export ACADEMY_DB_NAME="$db"
cd "$root"
# The bootstrap step opens these onto the Actions log. The server must not inherit them.
exec 3>&- || true
exec 4>&- || true
node src/server.mjs >>"$log" 2>&1 &
echo $! >"$pidfile"

for _ in $(seq 1 160); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${port}/academy/healthz" 2>/dev/null; then
    exit 0
  fi
  if ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "academy server exited during startup" >&2
    redact_tail >&2 || true
    exit 1
  fi
  sleep 0.25
done

echo "academy server did not become ready" >&2
redact_tail >&2 || true
exit 1
