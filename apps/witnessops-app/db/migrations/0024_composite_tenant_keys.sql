-- Composite workspace keys for references that previously checked only the parent id.
-- scripts/migrate.mjs applies this file in one transaction under pg_advisory_xact_lock(941071, 1).
-- ADD UNIQUE builds an index and takes ACCESS EXCLUSIVE on report_shares.
-- ADD FOREIGN KEY takes SHARE ROW EXCLUSIVE on the referencing and referenced tables
-- and validates existing rows. CREATE INDEX CONCURRENTLY cannot run inside that transaction.
-- An existing cross-workspace row fails validation and rolls the whole migration back.
-- The previous single-column foreign keys stay, with the same ON DELETE actions:
-- server_check_executions.asset_id, server_check_executions.run_id and report_shares.run_id
-- are NO ACTION; report_share_deliveries.share_id is ON DELETE CASCADE.
-- run_id stays nullable. MATCH SIMPLE does not check the composite key when run_id is null.
--
-- Read-only pre-check. Do not apply this migration while any of these queries returns a row.
-- The block is a comment. migrate.mjs does not execute it, and it must not be run against production
-- from this repository change.
/*
SELECT e.id, e.workspace_id, a.workspace_id AS asset_workspace_id
FROM server_check_executions e
JOIN assets a ON a.id = e.asset_id
WHERE a.workspace_id <> e.workspace_id;

SELECT e.id, e.workspace_id, r.workspace_id AS run_workspace_id
FROM server_check_executions e
JOIN runs r ON r.id = e.run_id
WHERE r.workspace_id <> e.workspace_id;

SELECT s.id, s.workspace_id, r.workspace_id AS run_workspace_id
FROM report_shares s
JOIN runs r ON r.id = s.run_id
WHERE r.workspace_id <> s.workspace_id;

SELECT d.id, d.workspace_id, s.workspace_id AS share_workspace_id
FROM report_share_deliveries d
JOIN report_shares s ON s.id = d.share_id
WHERE s.workspace_id <> d.workspace_id;
*/

ALTER TABLE report_shares
  ADD CONSTRAINT report_shares_workspace_id_id_key UNIQUE (workspace_id, id);

ALTER TABLE server_check_executions
  ADD CONSTRAINT server_check_executions_workspace_asset_fkey
  FOREIGN KEY (workspace_id, asset_id) REFERENCES assets (workspace_id, id);

ALTER TABLE server_check_executions
  ADD CONSTRAINT server_check_executions_workspace_run_fkey
  FOREIGN KEY (workspace_id, run_id) REFERENCES runs (workspace_id, id);

ALTER TABLE report_shares
  ADD CONSTRAINT report_shares_workspace_run_fkey
  FOREIGN KEY (workspace_id, run_id) REFERENCES runs (workspace_id, id);

ALTER TABLE report_share_deliveries
  ADD CONSTRAINT report_share_deliveries_workspace_share_fkey
  FOREIGN KEY (workspace_id, share_id) REFERENCES report_shares (workspace_id, id) ON DELETE CASCADE;
