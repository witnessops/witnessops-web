-- Admission accounting only. No enrollment, retrospective usage, or expiry.
CREATE TABLE hostname_check_usage (
  run_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  consent_revision integer NOT NULL,
  admitted_at timestamptz NOT NULL,
  period_start date GENERATED ALWAYS AS
    (date_trunc('month', admitted_at AT TIME ZONE 'UTC')::date) STORED,
  FOREIGN KEY (workspace_id,run_id) REFERENCES runs(workspace_id,id),
  FOREIGN KEY (workspace_id,consent_revision) REFERENCES early_access_plan_consents(workspace_id,revision)
);
CREATE INDEX hostname_check_usage_month_idx ON hostname_check_usage(workspace_id,period_start);

-- The run is the sole status authority: running reserves, completed consumes,
-- failed releases. Keeping this row prevents retries/revisions moving its month.
CREATE FUNCTION preserve_hostname_check_usage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r runs;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Hostname usage admission is immutable' USING ERRCODE='23514';
  END IF;
  SELECT * INTO r FROM runs WHERE id=NEW.run_id AND workspace_id=NEW.workspace_id FOR UPDATE;
  IF r.source_type IS DISTINCT FROM 'external-snapshot-v1' OR r.status IS DISTINCT FROM 'running' THEN
    RAISE EXCEPTION 'Hostname usage requires a pending hostname run' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hostname_check_usage_immutable BEFORE INSERT OR UPDATE OR DELETE ON hostname_check_usage
FOR EACH ROW EXECUTE FUNCTION preserve_hostname_check_usage();
