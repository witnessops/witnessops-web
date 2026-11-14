-- One-time bootstrap, run by a database superuser (not by the app).
-- Passwords are not set here. Set academy_app and academy_mcp passwords from
-- outside this file with \password or ALTER ROLE ... PASSWORD via psql -v.
-- usage: psql -X -v ON_ERROR_STOP=1 -v db=academy -f bootstrap.sql
-- academy_mcp is the MCP server role. Table grants live in migration 002.
SELECT 'CREATE ROLE academy_migrator NOLOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'academy_migrator') \gexec
SELECT 'CREATE ROLE academy_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'academy_app') \gexec
SELECT 'CREATE ROLE academy_mcp LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'academy_mcp') \gexec
ALTER ROLE academy_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE academy_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE academy_mcp LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- Drop every role membership. NOINHERIT does not stop SET ROLE, and a membership
-- such as pg_write_all_data or academy_migrator would survive a later attribute reset.
DO $$
DECLARE
  membership text;
BEGIN
  FOR membership IN
    SELECT granted.rolname
    FROM pg_auth_members member_of
    JOIN pg_roles granted ON granted.oid = member_of.roleid
    JOIN pg_roles grantee ON grantee.oid = member_of.member
    WHERE grantee.rolname = 'academy_app'
  LOOP
    EXECUTE format('REVOKE %I FROM academy_app', membership);
  END LOOP;
  FOR membership IN
    SELECT granted.rolname
    FROM pg_auth_members member_of
    JOIN pg_roles granted ON granted.oid = member_of.roleid
    JOIN pg_roles grantee ON grantee.oid = member_of.member
    WHERE grantee.rolname = 'academy_mcp'
  LOOP
    EXECUTE format('REVOKE %I FROM academy_mcp', membership);
  END LOOP;
END $$;
SELECT format('CREATE DATABASE %I OWNER academy_migrator', :'db') WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO academy_app', :'db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO academy_mcp', :'db') \gexec
-- The identity provider uses its own database and role. academy_app must not be granted CONNECT on it.
