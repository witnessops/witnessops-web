-- Product-specific custody. External Exposure retains its original JSON contract.
ALTER TABLE assets DROP CONSTRAINT assets_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_type_check CHECK (type IN ('domain','hostname','linux_server'));
ALTER TABLE runs DROP CONSTRAINT runs_source_type_check;
ALTER TABLE runs ADD CONSTRAINT runs_source_type_check CHECK (source_type IN ('external-snapshot-v1','local-audit-1.2.2'));
ALTER TABLE runs DROP CONSTRAINT runs_check;
ALTER TABLE runs ADD CONSTRAINT runs_check CHECK (
  (status='completed' AND source_digest IS NOT NULL AND source_digest ~ '^[a-f0-9]{64}$' AND finished_at IS NOT NULL
   AND ((source_type='external-snapshot-v1' AND source_snapshot IS NOT NULL AND jsonb_typeof(source_snapshot)='object')
     OR (source_type='local-audit-1.2.2' AND source_snapshot IS NULL)))
  OR (status IN ('running','failed') AND source_snapshot IS NULL AND source_digest IS NULL
      AND ((status='running' AND finished_at IS NULL) OR (status='failed' AND finished_at IS NOT NULL)))
);
ALTER TABLE runs ADD UNIQUE (workspace_id,id);
CREATE TABLE linux_check_sources (
  run_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  zip_name text NOT NULL CHECK (zip_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,250}\.zip$'),
  zip_bytes bytea NOT NULL CHECK (octet_length(zip_bytes) BETWEEN 1 AND 104857600),
  signature_bytes bytea NOT NULL CHECK (octet_length(signature_bytes) BETWEEN 1 AND 1048576),
  registry_bytes bytea NOT NULL CHECK (octet_length(registry_bytes) BETWEEN 1 AND 5242880),
  signature_digest text NOT NULL CHECK (signature_digest ~ '^[a-f0-9]{64}$'),
  registry_digest text NOT NULL CHECK (registry_digest ~ '^[a-f0-9]{64}$'),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata)='object'),
  verification jsonb NOT NULL CHECK (verification->>'status'='valid'),
  FOREIGN KEY (workspace_id,run_id) REFERENCES runs(workspace_id,id)
);
-- Insert only before completion; no changes to admitted source/context afterward.
CREATE FUNCTION preserve_linux_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r runs;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Linux source is immutable' USING ERRCODE='23514'; END IF;
  SELECT * INTO r FROM runs WHERE id=NEW.run_id AND workspace_id=NEW.workspace_id FOR UPDATE;
  IF r.source_type IS DISTINCT FROM 'local-audit-1.2.2' OR r.status IS DISTINCT FROM 'running' THEN
    RAISE EXCEPTION 'Linux source requires pending Linux run' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER linux_source_immutable BEFORE INSERT OR UPDATE OR DELETE ON linux_check_sources
FOR EACH ROW EXECUTE FUNCTION preserve_linux_source();
CREATE FUNCTION require_linux_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.source_type='local-audit-1.2.2' AND NEW.status='completed' AND NOT EXISTS
    (SELECT 1 FROM linux_check_sources WHERE run_id=NEW.id AND workspace_id=NEW.workspace_id) THEN
    RAISE EXCEPTION 'Completed Linux run requires original source' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER linux_run_source BEFORE INSERT OR UPDATE ON runs FOR EACH ROW EXECUTE FUNCTION require_linux_source();
