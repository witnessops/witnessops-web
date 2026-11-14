-- One-time bootstrap, run by a database superuser (not by the app).
-- Passwords are not set here. Set academy_app's password from outside this file
-- with \password or ALTER ROLE ... PASSWORD :'app_pw' via psql -v.
-- usage: psql -X -v ON_ERROR_STOP=1 -v db=academy -f bootstrap.sql
SELECT 'CREATE ROLE academy_migrator NOLOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'academy_migrator') \gexec
SELECT 'CREATE ROLE academy_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'academy_app') \gexec
ALTER ROLE academy_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE academy_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
SELECT format('CREATE DATABASE %I OWNER academy_migrator', :'db') WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO academy_app', :'db') \gexec
-- The identity provider uses its own database and role. academy_app must not be granted CONNECT on it.
