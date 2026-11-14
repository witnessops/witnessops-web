#!/usr/bin/env bash
# Bootstrap a disposable Academy database and Keycloak realm for ACADEMY_E2E.
# Postgres and Keycloak are already running. Every secret is written to a file
# and passed with a *_FILE variable. This script does not echo secret values.
set +x
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
REPO_ROOT=$(cd "$ROOT/../.." && pwd)

: "${ACADEMY_CI_SECRET_DIR:=$(mktemp -d)}"
: "${ACADEMY_CI_LOG_DIR:=$(mktemp -d)}"
: "${ACADEMY_TEST_EVIDENCE_DIR:=$(mktemp -d)}"
: "${ACADEMY_CI_ENV:=$(mktemp)}"
: "${KC_ADMIN_BASE_URL:=http://127.0.0.1:8080}"
: "${ACADEMY_PUBLIC_ORIGIN:=http://127.0.0.1:18300}"
: "${KC_REALM:=academy}"
: "${KC_CREATE_TEST_USERS:=1}"
: "${KC_ADMIN_PASSWORD_GRANT:=1}"
: "${KC_ADMIN_USERNAME:=ci-admin}"
: "${KC_SSL_REQUIRED:=none}"
: "${ACADEMY_DB_HOST:=127.0.0.1}"
: "${ACADEMY_DB_PORT:=5432}"
: "${ACADEMY_DB_NAME:=academy}"
: "${ACADEMY_DB_USER:=academy_app}"
: "${ACADEMY_TEST_PGADMIN_USER:=postgres}"
: "${ACADEMY_APP_HOST:=127.0.0.1}"
: "${ACADEMY_APP_PORT:=18300}"
: "${ACADEMY_OIDC_CLIENT_ID:=academy-app}"
: "${TEST_LEARNER_A_USERNAME:=learner-a}"
: "${TEST_LEARNER_B_USERNAME:=learner-b}"
: "${ACADEMY_TEST_KC_CONTAINER:=academy-kc}"
: "${ACADEMY_PG_CONTAINER:=academy-pg}"
: "${ACADEMY_TEST_PGADMIN_PASSWORD_FILE:=$ACADEMY_CI_SECRET_DIR/pg_admin_password}"
: "${KC_ADMIN_PASSWORD_FILE:=$ACADEMY_CI_SECRET_DIR/kc_admin_password}"

export KC_ADMIN_BASE_URL ACADEMY_PUBLIC_ORIGIN KC_REALM KC_CREATE_TEST_USERS
export KC_ADMIN_PASSWORD_GRANT KC_ADMIN_USERNAME KC_SSL_REQUIRED
export ACADEMY_DB_HOST ACADEMY_DB_PORT ACADEMY_DB_NAME ACADEMY_DB_USER
export ACADEMY_TEST_PGADMIN_USER ACADEMY_APP_HOST ACADEMY_APP_PORT
export ACADEMY_OIDC_CLIENT_ID TEST_LEARNER_A_USERNAME TEST_LEARNER_B_USERNAME
export ACADEMY_TEST_KC_CONTAINER ACADEMY_PG_CONTAINER
export ACADEMY_TEST_PGADMIN_PASSWORD_FILE KC_ADMIN_PASSWORD_FILE

mkdir -p "$ACADEMY_CI_SECRET_DIR" "$ACADEMY_CI_LOG_DIR" "$ACADEMY_TEST_EVIDENCE_DIR"
chmod 700 "$ACADEMY_CI_SECRET_DIR"

require_secret_file() {
  local file=$1
  if [[ ! -s "$file" ]]; then
    echo "required secret file is missing" >&2
    exit 1
  fi
  chmod 600 "$file"
}

new_secret() {
  local file=$1
  local nbytes=${2:-24}
  umask 077
  openssl rand -hex "$nbytes" >"$file"
  chmod 600 "$file"
  local length
  length=$(wc -c <"$file")
  if [[ "$length" -lt 16 ]]; then
    echo "secret file is too short" >&2
    exit 1
  fi
}

require_secret_file "$ACADEMY_TEST_PGADMIN_PASSWORD_FILE"
require_secret_file "$KC_ADMIN_PASSWORD_FILE"

ACADEMY_DB_PASSWORD_FILE=$ACADEMY_CI_SECRET_DIR/db_password
ACADEMY_OIDC_CLIENT_SECRET_FILE=$ACADEMY_CI_SECRET_DIR/oidc_client_secret
ACADEMY_PREAUTH_KEY_FILE=$ACADEMY_CI_SECRET_DIR/preauth_key
TEST_LEARNER_A_PASSWORD_FILE=$ACADEMY_CI_SECRET_DIR/learner_a_password
TEST_LEARNER_B_PASSWORD_FILE=$ACADEMY_CI_SECRET_DIR/learner_b_password
new_secret "$ACADEMY_DB_PASSWORD_FILE"
new_secret "$ACADEMY_OIDC_CLIENT_SECRET_FILE"
new_secret "$ACADEMY_PREAUTH_KEY_FILE" 32
new_secret "$TEST_LEARNER_A_PASSWORD_FILE"
new_secret "$TEST_LEARNER_B_PASSWORD_FILE"
export ACADEMY_DB_PASSWORD_FILE ACADEMY_OIDC_CLIENT_SECRET_FILE ACADEMY_PREAUTH_KEY_FILE
export TEST_LEARNER_A_PASSWORD_FILE TEST_LEARNER_B_PASSWORD_FILE

if [[ -x /usr/lib/postgresql/17/bin/psql ]]; then
  ACADEMY_TEST_PG_BINDIR=/usr/lib/postgresql/17/bin
else
  if [[ -z ${POSTGRES_IMAGE:-} ]]; then
    echo "POSTGRES_IMAGE is required when the host has no PostgreSQL 17 client" >&2
    exit 1
  fi
  ACADEMY_TEST_PG_BINDIR=$ACADEMY_CI_LOG_DIR/pg-bin
  mkdir -p "$ACADEMY_TEST_PG_BINDIR"
  write_pg_wrapper() {
    local name=$1
    local path="$ACADEMY_TEST_PG_BINDIR/$name"
    cat >"$path" <<EOF
#!/usr/bin/env bash
set +x
set -euo pipefail
exec docker run --rm -i \\
  --network container:${ACADEMY_PG_CONTAINER} \\
  --user $(id -u):$(id -g) \\
  --workdir /tmp \\
  --env PGHOST=127.0.0.1 \\
  --env PGPORT=${ACADEMY_DB_PORT} \\
  --env PGUSER \\
  --env PGPASSWORD \\
  --env PGDATABASE \\
  --env PGOPTIONS \\
  --env HOME=/tmp \\
  --volume /tmp:/tmp \\
  --volume ${REPO_ROOT@Q}:${REPO_ROOT@Q} \\
  --entrypoint /usr/lib/postgresql/17/bin/${name} \\
  ${POSTGRES_IMAGE@Q} \\
  "\$@"
EOF
    chmod 755 "$path"
    bash -n "$path"
  }
  write_pg_wrapper psql
  write_pg_wrapper pg_dump
  write_pg_wrapper pg_restore
fi
export ACADEMY_TEST_PG_BINDIR
export PG_BINDIR="$ACADEMY_TEST_PG_BINDIR"

docker inspect "$ACADEMY_PG_CONTAINER" >/dev/null
docker inspect "$ACADEMY_TEST_KC_CONTAINER" >/dev/null
sudo -n docker inspect "$ACADEMY_TEST_KC_CONTAINER" >/dev/null
echo "postgres client: $("$PG_BINDIR/psql" --version)"

export PGHOST="$ACADEMY_DB_HOST"
export PGPORT="$ACADEMY_DB_PORT"
export PGUSER="$ACADEMY_TEST_PGADMIN_USER"
export PGPASSWORD_FILE="$ACADEMY_TEST_PGADMIN_PASSWORD_FILE"
PGPASSWORD=$(tr -d '\r' <"$PGPASSWORD_FILE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
export PGPASSWORD

echo "bootstrapping database"
"$PG_BINDIR/psql" -X -v ON_ERROR_STOP=1 -v db="$ACADEMY_DB_NAME" -d postgres -f "$ROOT/db/bootstrap.sql"
app_pw=$(tr -d '\r' <"$ACADEMY_DB_PASSWORD_FILE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
"$PG_BINDIR/psql" -X -q -v ON_ERROR_STOP=1 -d postgres <<SQL
ALTER ROLE academy_app PASSWORD '${app_pw}';
SQL
unset app_pw
echo "migrating database"
"$ROOT/scripts/migrate.sh" "$ACADEMY_DB_NAME"
unset PGPASSWORD

echo "importing realm"
ready=0
for _ in $(seq 1 12); do
  if python3 "$ROOT/keycloak/kc_admin.py" setup; then
    ready=1
    break
  fi
  sleep 5
done
if [[ "$ready" != 1 ]]; then
  echo "keycloak setup failed" >&2
  exit 1
fi

issuer=$(curl -fsS "$KC_ADMIN_BASE_URL/realms/$KC_REALM/.well-known/openid-configuration" | python3 -c 'import json,sys; print(json.load(sys.stdin)["issuer"])')
case "$issuer" in
  http://127.0.0.1/*|http://127.0.0.1:*|http://localhost/*|http://localhost:*|http://\[::1\]/*|http://\[::1\]:*) ;;
  *)
    echo "refusing non-loopback issuer" >&2
    exit 1
    ;;
esac
ACADEMY_OIDC_ISSUER=$issuer
export ACADEMY_OIDC_ISSUER
echo "oidc issuer ${ACADEMY_OIDC_ISSUER}"

MCP_HOST=127.0.0.1
MCP_PORT=18500
MCP_RESOURCE_URL="http://127.0.0.1:${MCP_PORT}/mcp"
MCP_TEST_URL="$MCP_RESOURCE_URL"
MCP_ALLOWED_HOSTS="${MCP_HOST}:${MCP_PORT}"
MCP_ALLOWED_ORIGINS="http://${MCP_HOST}:${MCP_PORT}"
MCP_REQUIRED_SCOPE=academy-mcp
MCP_CLIENT_ID=academy-mcp-client
MCP_TEST_CLIENT_ID="$MCP_CLIENT_ID"
MCP_INTROSPECTION_CLIENT_ID=academy-mcp-rs
MCP_TEST_WRONGAUD_CLIENT_ID=academy-mcp-wrongaud
MCP_CLIENT_REDIRECT_URIS=http://127.0.0.1:18599/callback
MCP_TEST_REDIRECT_URI="$MCP_CLIENT_REDIRECT_URIS"
MCP_ACCESS_TOKEN_LIFESPAN_SECONDS=120
MCP_INTROSPECT=1
TEST_MCP_LEARNER_A_USERNAME=mcp-learner-a
TEST_MCP_LEARNER_B_USERNAME=mcp-learner-b
TEST_MCP_LEARNER_C_USERNAME=mcp-learner-c
MCP_INTROSPECTION_CLIENT_SECRET_FILE=$ACADEMY_CI_SECRET_DIR/mcp_introspection_secret
TEST_MCP_LEARNER_A_PASSWORD_FILE=$ACADEMY_CI_SECRET_DIR/mcp_learner_a_password
TEST_MCP_LEARNER_B_PASSWORD_FILE=$ACADEMY_CI_SECRET_DIR/mcp_learner_b_password
TEST_MCP_LEARNER_C_PASSWORD_FILE=$ACADEMY_CI_SECRET_DIR/mcp_learner_c_password
new_secret "$MCP_INTROSPECTION_CLIENT_SECRET_FILE"
new_secret "$TEST_MCP_LEARNER_A_PASSWORD_FILE"
new_secret "$TEST_MCP_LEARNER_B_PASSWORD_FILE"
new_secret "$TEST_MCP_LEARNER_C_PASSWORD_FILE"
ACADEMY_MCP_ROOT=$REPO_ROOT/apps/witnessops-academy-mcp
MCP_CURRICULUM_DIR=$ACADEMY_MCP_ROOT/curriculum
ACADEMY_MCP_PID_FILE=$ACADEMY_CI_LOG_DIR/mcp.pid
ACADEMY_MCP_SERVER_LOG=$ACADEMY_CI_LOG_DIR/mcp-server.log
MCP_TEST_EVIDENCE_DIR=$ACADEMY_TEST_EVIDENCE_DIR
export MCP_HOST MCP_PORT MCP_RESOURCE_URL MCP_TEST_URL MCP_ALLOWED_HOSTS MCP_ALLOWED_ORIGINS
export MCP_REQUIRED_SCOPE MCP_CLIENT_ID MCP_TEST_CLIENT_ID MCP_INTROSPECTION_CLIENT_ID
export MCP_TEST_WRONGAUD_CLIENT_ID MCP_CLIENT_REDIRECT_URIS MCP_TEST_REDIRECT_URI
export MCP_ACCESS_TOKEN_LIFESPAN_SECONDS MCP_INTROSPECT
export TEST_MCP_LEARNER_A_USERNAME TEST_MCP_LEARNER_B_USERNAME TEST_MCP_LEARNER_C_USERNAME
export MCP_INTROSPECTION_CLIENT_SECRET_FILE
export TEST_MCP_LEARNER_A_PASSWORD_FILE TEST_MCP_LEARNER_B_PASSWORD_FILE TEST_MCP_LEARNER_C_PASSWORD_FILE
export ACADEMY_MCP_ROOT MCP_CURRICULUM_DIR ACADEMY_MCP_PID_FILE ACADEMY_MCP_SERVER_LOG MCP_TEST_EVIDENCE_DIR

echo "configuring mcp clients"
python3 "$ACADEMY_MCP_ROOT/keycloak/kc_mcp_setup.py" setup

ACADEMY_CI_SERVER_LOG=$ACADEMY_CI_LOG_DIR/server.log
ACADEMY_CI_PID_FILE=$ACADEMY_CI_LOG_DIR/server.pid
ACADEMY_SERVER_ROOT=$ROOT
ACADEMY_TEST_RESTART_APP_CMD=$ROOT/test/restart-app.sh
ACADEMY_TEST_APP_URL=$ACADEMY_PUBLIC_ORIGIN
export ACADEMY_CI_SERVER_LOG ACADEMY_CI_PID_FILE ACADEMY_SERVER_ROOT
export ACADEMY_TEST_RESTART_APP_CMD ACADEMY_TEST_APP_URL ACADEMY_CI_ENV

umask 077
{
  printf 'ACADEMY_CI_ENV=%s\n' "$ACADEMY_CI_ENV"
  printf 'ACADEMY_CI_SECRET_DIR=%s\n' "$ACADEMY_CI_SECRET_DIR"
  printf 'ACADEMY_CI_LOG_DIR=%s\n' "$ACADEMY_CI_LOG_DIR"
  printf 'ACADEMY_CI_SERVER_LOG=%s\n' "$ACADEMY_CI_SERVER_LOG"
  printf 'ACADEMY_CI_PID_FILE=%s\n' "$ACADEMY_CI_PID_FILE"
  printf 'ACADEMY_SERVER_ROOT=%s\n' "$ACADEMY_SERVER_ROOT"
  printf 'ACADEMY_APP_HOST=%s\n' "$ACADEMY_APP_HOST"
  printf 'ACADEMY_APP_PORT=%s\n' "$ACADEMY_APP_PORT"
  printf 'ACADEMY_PUBLIC_ORIGIN=%s\n' "$ACADEMY_PUBLIC_ORIGIN"
  printf 'ACADEMY_OIDC_ISSUER=%s\n' "$ACADEMY_OIDC_ISSUER"
  printf 'ACADEMY_OIDC_CLIENT_ID=%s\n' "$ACADEMY_OIDC_CLIENT_ID"
  printf 'ACADEMY_OIDC_CLIENT_SECRET_FILE=%s\n' "$ACADEMY_OIDC_CLIENT_SECRET_FILE"
  printf 'ACADEMY_PREAUTH_KEY_FILE=%s\n' "$ACADEMY_PREAUTH_KEY_FILE"
  printf 'ACADEMY_DB_HOST=%s\n' "$ACADEMY_DB_HOST"
  printf 'ACADEMY_DB_PORT=%s\n' "$ACADEMY_DB_PORT"
  printf 'ACADEMY_DB_NAME=%s\n' "$ACADEMY_DB_NAME"
  printf 'ACADEMY_DB_USER=%s\n' "$ACADEMY_DB_USER"
  printf 'ACADEMY_DB_PASSWORD_FILE=%s\n' "$ACADEMY_DB_PASSWORD_FILE"
  printf 'ACADEMY_TEST_PGADMIN_USER=%s\n' "$ACADEMY_TEST_PGADMIN_USER"
  printf 'ACADEMY_TEST_PGADMIN_PASSWORD_FILE=%s\n' "$ACADEMY_TEST_PGADMIN_PASSWORD_FILE"
  printf 'ACADEMY_TEST_PG_BINDIR=%s\n' "$ACADEMY_TEST_PG_BINDIR"
  printf 'ACADEMY_TEST_RESTART_APP_CMD=%s\n' "$ACADEMY_TEST_RESTART_APP_CMD"
  printf 'ACADEMY_TEST_KC_CONTAINER=%s\n' "$ACADEMY_TEST_KC_CONTAINER"
  printf 'ACADEMY_TEST_EVIDENCE_DIR=%s\n' "$ACADEMY_TEST_EVIDENCE_DIR"
  printf 'ACADEMY_TEST_APP_URL=%s\n' "$ACADEMY_TEST_APP_URL"
  printf 'ACADEMY_E2E=%s\n' '1'
  printf 'TEST_LEARNER_A_USERNAME=%s\n' "$TEST_LEARNER_A_USERNAME"
  printf 'TEST_LEARNER_B_USERNAME=%s\n' "$TEST_LEARNER_B_USERNAME"
  printf 'TEST_LEARNER_A_PASSWORD_FILE=%s\n' "$TEST_LEARNER_A_PASSWORD_FILE"
  printf 'TEST_LEARNER_B_PASSWORD_FILE=%s\n' "$TEST_LEARNER_B_PASSWORD_FILE"
  printf 'KC_ADMIN_BASE_URL=%s\n' "$KC_ADMIN_BASE_URL"
  printf 'KC_ADMIN_USERNAME=%s\n' "$KC_ADMIN_USERNAME"
  printf 'KC_ADMIN_PASSWORD_FILE=%s\n' "$KC_ADMIN_PASSWORD_FILE"
  printf 'KC_ADMIN_PASSWORD_GRANT=%s\n' "$KC_ADMIN_PASSWORD_GRANT"
  printf 'KC_REALM=%s\n' "$KC_REALM"
  printf 'KC_CREATE_TEST_USERS=%s\n' "$KC_CREATE_TEST_USERS"
  printf 'KC_SSL_REQUIRED=%s\n' "$KC_SSL_REQUIRED"
  printf 'TMPDIR=%s\n' '/tmp'
  printf 'MCP_HOST=%s\n' "$MCP_HOST"
  printf 'MCP_PORT=%s\n' "$MCP_PORT"
  printf 'MCP_RESOURCE_URL=%s\n' "$MCP_RESOURCE_URL"
  printf 'MCP_TEST_URL=%s\n' "$MCP_TEST_URL"
  printf 'MCP_ALLOWED_HOSTS=%s\n' "$MCP_ALLOWED_HOSTS"
  printf 'MCP_ALLOWED_ORIGINS=%s\n' "$MCP_ALLOWED_ORIGINS"
  printf 'MCP_REQUIRED_SCOPE=%s\n' "$MCP_REQUIRED_SCOPE"
  printf 'MCP_CLIENT_ID=%s\n' "$MCP_CLIENT_ID"
  printf 'MCP_TEST_CLIENT_ID=%s\n' "$MCP_TEST_CLIENT_ID"
  printf 'MCP_INTROSPECTION_CLIENT_ID=%s\n' "$MCP_INTROSPECTION_CLIENT_ID"
  printf 'MCP_INTROSPECTION_CLIENT_SECRET_FILE=%s\n' "$MCP_INTROSPECTION_CLIENT_SECRET_FILE"
  printf 'MCP_TEST_WRONGAUD_CLIENT_ID=%s\n' "$MCP_TEST_WRONGAUD_CLIENT_ID"
  printf 'MCP_CLIENT_REDIRECT_URIS=%s\n' "$MCP_CLIENT_REDIRECT_URIS"
  printf 'MCP_TEST_REDIRECT_URI=%s\n' "$MCP_TEST_REDIRECT_URI"
  printf 'MCP_ACCESS_TOKEN_LIFESPAN_SECONDS=%s\n' "$MCP_ACCESS_TOKEN_LIFESPAN_SECONDS"
  printf 'MCP_INTROSPECT=%s\n' "$MCP_INTROSPECT"
  printf 'MCP_CURRICULUM_DIR=%s\n' "$MCP_CURRICULUM_DIR"
  printf 'ACADEMY_MCP_ROOT=%s\n' "$ACADEMY_MCP_ROOT"
  printf 'ACADEMY_MCP_PID_FILE=%s\n' "$ACADEMY_MCP_PID_FILE"
  printf 'ACADEMY_MCP_SERVER_LOG=%s\n' "$ACADEMY_MCP_SERVER_LOG"
  printf 'MCP_TEST_EVIDENCE_DIR=%s\n' "$MCP_TEST_EVIDENCE_DIR"
  printf 'TEST_MCP_LEARNER_A_USERNAME=%s\n' "$TEST_MCP_LEARNER_A_USERNAME"
  printf 'TEST_MCP_LEARNER_B_USERNAME=%s\n' "$TEST_MCP_LEARNER_B_USERNAME"
  printf 'TEST_MCP_LEARNER_C_USERNAME=%s\n' "$TEST_MCP_LEARNER_C_USERNAME"
  printf 'TEST_MCP_LEARNER_A_PASSWORD_FILE=%s\n' "$TEST_MCP_LEARNER_A_PASSWORD_FILE"
  printf 'TEST_MCP_LEARNER_B_PASSWORD_FILE=%s\n' "$TEST_MCP_LEARNER_B_PASSWORD_FILE"
  printf 'TEST_MCP_LEARNER_C_PASSWORD_FILE=%s\n' "$TEST_MCP_LEARNER_C_PASSWORD_FILE"
} >"$ACADEMY_CI_ENV"
chmod 600 "$ACADEMY_CI_ENV"

echo "starting lesson server"
bash "$ACADEMY_TEST_RESTART_APP_CMD" "$ACADEMY_DB_NAME"
echo "lesson server ready"
echo "starting mcp server"
bash "$ACADEMY_MCP_ROOT/test/restart-mcp.sh"
echo "mcp server ready"
