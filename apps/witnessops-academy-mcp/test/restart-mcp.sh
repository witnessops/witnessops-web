#!/usr/bin/env bash
# Restart the Academy MCP server for the disposable e2e run.
# Secrets stay in *_FILE values from ACADEMY_CI_ENV.
set +x
set -euo pipefail

if [[ -z ${ACADEMY_CI_ENV:-} || ! -f ${ACADEMY_CI_ENV} ]]; then
  echo "ACADEMY_CI_ENV is not set" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ACADEMY_CI_ENV"

root=${ACADEMY_MCP_ROOT:?}
pidfile=${ACADEMY_MCP_PID_FILE:?}
log=${ACADEMY_MCP_SERVER_LOG:?}
port=${MCP_PORT:-18500}
host=${MCP_HOST:-127.0.0.1}

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

cd "$root"
node src/server.mjs >>"$log" 2>&1 &
echo $! >"$pidfile"

for _ in $(seq 1 160); do
  if curl -fsS -o /dev/null "http://${host}:${port}/healthz" 2>/dev/null; then
    exit 0
  fi
  if ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "academy mcp server exited during startup" >&2
    redact_tail >&2 || true
    exit 1
  fi
  sleep 0.25
done

echo "academy mcp server did not become ready" >&2
redact_tail >&2 || true
exit 1
