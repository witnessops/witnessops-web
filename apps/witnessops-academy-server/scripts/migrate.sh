#!/usr/bin/env bash
# Explicit migration step. The app never runs this. Migrations are additive.
# The connecting role must be allowed to SET ROLE academy_migrator.
# Connection via standard libpq env (PGHOST, PGPORT, PGUSER).
# Password through PGPASSFILE, or PGPASSWORD_FILE (read into the client env, never echoed).
# usage: migrate.sh [dbname]   (default: $ACADEMY_DB_NAME or academy)
set -euo pipefail
DB=${1:-${ACADEMY_DB_NAME:-academy}}
if [[ ! "$DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "bad database name" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/migrations"
if [ -n "${PGPASSWORD_FILE:-}" ]; then
  # Match secret(): trim surrounding whitespace, and do not echo the value.
  PGPASSWORD="$(tr -d '\r' < "$PGPASSWORD_FILE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  export PGPASSWORD
fi
PSQL="${PG_BINDIR:+$PG_BINDIR/}psql"
"$PSQL" -X -v ON_ERROR_STOP=1 -q -d "$DB" -c "GRANT USAGE, CREATE ON SCHEMA public TO academy_migrator; REVOKE CREATE ON SCHEMA public FROM PUBLIC;"
shopt -s nullglob
for f in "$DIR"/*.sql; do
  v=$(basename "$f" .sql)
  [[ "$v" =~ ^[0-9a-z_]+$ ]] || { echo "bad migration name: $v" >&2; exit 1; }
  have=$("$PSQL" -X -tAq -d "$DB" -c "select 1 from pg_tables where schemaname = 'public' and tablename = 'academy_schema_migrations'")
  # psql does not substitute variables in -c. The version is an allowlisted migration name.
  applied=""
  if [ "$have" = 1 ]; then
    applied=$("$PSQL" -X -tAq -d "$DB" -v version="$v" <<'SQL'
select 1 from academy_schema_migrations where version = :'version'
SQL
)
  fi
  if [ "$applied" = 1 ]; then
    echo "skip $v (applied)"
    continue
  fi
  "$PSQL" -X -v ON_ERROR_STOP=1 -q -d "$DB" -1 -c "SET ROLE academy_migrator" -f "$f"
  echo "applied $v to $DB"
done
