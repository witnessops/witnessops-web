-- 002: additive grants for the MCP runtime role created by bootstrap.sql.
-- SELECT/INSERT identities, SELECT/INSERT/UPDATE drafts. No DELETE, no DDL,
-- no session tables, no sequences.
GRANT SELECT, INSERT ON academy_identities TO academy_mcp;
GRANT SELECT, INSERT, UPDATE ON academy_lesson_drafts TO academy_mcp;

INSERT INTO academy_schema_migrations(version) VALUES ('002_academy_mcp_grants') ON CONFLICT DO NOTHING;
