CREATE TABLE runs (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  asset_id uuid NOT NULL,
  initiated_by uuid NOT NULL REFERENCES users(id),
  source_type text NOT NULL CHECK (source_type = 'external-snapshot-v1'),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  method_id text NOT NULL,
  method_version text NOT NULL,
  source_snapshot jsonb,
  source_digest text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, asset_id) REFERENCES assets(workspace_id, id),
  CHECK (
    (status = 'completed' AND source_snapshot IS NOT NULL AND jsonb_typeof(source_snapshot) = 'object'
      AND source_digest IS NOT NULL AND source_digest ~ '^[a-f0-9]{64}$' AND finished_at IS NOT NULL)
    OR (status IN ('running', 'failed') AND source_snapshot IS NULL AND source_digest IS NULL
      AND ((status = 'running' AND finished_at IS NULL) OR (status = 'failed' AND finished_at IS NOT NULL)))
  )
);
CREATE INDEX runs_workspace_asset_history_idx ON runs (workspace_id, asset_id, created_at, id);
CREATE FUNCTION preserve_completed_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Completed runs are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER runs_immutable BEFORE UPDATE OR DELETE ON runs
  FOR EACH ROW EXECUTE FUNCTION preserve_completed_run();
