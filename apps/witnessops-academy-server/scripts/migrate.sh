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
  # Ask whether the history table exists before naming it in FROM.
  # PostgreSQL plans every branch of a CASE, so a missing relation fails the whole query.
  present=$("$PSQL" -X -v ON_ERROR_STOP=1 -tAq -d "$DB" <<'SQL'
SET ROLE academy_migrator;
SELECT CASE WHEN to_regclass('public.academy_schema_migrations') IS NULL THEN 'missing' ELSE 'present' END;
SQL
)
  state=missing
  if [ "$present" = "present" ]; then
    state=$("$PSQL" -X -v ON_ERROR_STOP=1 -tAq -d "$DB" -v version="$v" <<'SQL'
SET ROLE academy_migrator;
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM academy_schema_migrations WHERE version = :'version'
) THEN 'applied' ELSE 'pending' END;
SQL
)
  elif [ "$present" != "missing" ]; then
    echo "migration history check failed for $v" >&2
    exit 1
  fi
  case "$state" in
    applied)
      echo "skip $v (applied)"
      continue
      ;;
    missing|pending)
      ;;
    *)
      echo "migration history check failed for $v" >&2
      exit 1
      ;;
  esac
  "$PSQL" -X -v ON_ERROR_STOP=1 -q -d "$DB" -1 -c "SET ROLE academy_migrator" -f "$f"
  echo "applied $v to $DB"
done
