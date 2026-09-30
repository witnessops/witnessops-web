ALTER TABLE server_check_executions
  ADD COLUMN retired_at timestamptz,
  ADD COLUMN retired_by_user_id uuid REFERENCES users(id);

ALTER TABLE server_check_executions
  DROP CONSTRAINT server_check_executions_state_check,
  ADD CONSTRAINT server_check_executions_state_check
    CHECK (state IN ('authorized','uploaded','run_created','failed','retired'));

ALTER TABLE server_check_executions
  DROP CONSTRAINT server_check_executions_check,
  ADD CONSTRAINT server_check_executions_state_integrity_check CHECK (
    (state='authorized' AND capture_bytes IS NULL AND capture_digest IS NULL AND run_id IS NULL
      AND retired_at IS NULL AND retired_by_user_id IS NULL)
    OR (state IN ('uploaded','failed') AND capture_bytes IS NOT NULL AND capture_digest IS NOT NULL AND run_id IS NULL
      AND retired_at IS NULL AND retired_by_user_id IS NULL)
    OR (state='run_created' AND capture_bytes IS NOT NULL AND capture_digest IS NOT NULL AND run_id IS NOT NULL
      AND retired_at IS NULL AND retired_by_user_id IS NULL)
    OR (state='retired' AND capture_bytes IS NULL AND capture_digest IS NULL AND run_id IS NULL
      AND capture_reserved_bytes=0 AND capture_reserved_digest IS NULL
      AND retired_at IS NOT NULL AND retired_by_user_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION preserve_server_execution() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Execution custody is retained' USING ERRCODE='23514'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
 OR NEW.asset_id IS DISTINCT FROM OLD.asset_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
 OR NEW.request_id IS DISTINCT FROM OLD.request_id OR NEW.request IS DISTINCT FROM OLD.request
 OR NEW.authority IS DISTINCT FROM OLD.authority OR NEW.collector_hash IS DISTINCT FROM OLD.collector_hash
 OR NEW.created_at IS DISTINCT FROM OLD.created_at
 OR (OLD.capture_bytes IS NOT NULL AND (NEW.capture_bytes IS DISTINCT FROM OLD.capture_bytes OR NEW.capture_digest IS DISTINCT FROM OLD.capture_digest))
 OR OLD.state IN ('run_created','failed','retired') THEN RAISE EXCEPTION 'Execution source is immutable' USING ERRCODE='23514'; END IF;
 IF NEW.state='retired' AND (OLD.state<>'authorized' OR NEW.capture_bytes IS NOT NULL OR NEW.capture_digest IS NOT NULL OR NEW.run_id IS NOT NULL
   OR NEW.capture_reserved_bytes<>0 OR NEW.capture_reserved_digest IS NOT NULL OR NEW.retired_at IS NULL OR NEW.retired_by_user_id IS NULL)
 THEN RAISE EXCEPTION 'Only an unused authorized execution may be retired' USING ERRCODE='23514'; END IF;
 IF OLD.retired_at IS NOT NULL AND (NEW.retired_at IS DISTINCT FROM OLD.retired_at OR NEW.retired_by_user_id IS DISTINCT FROM OLD.retired_by_user_id)
 THEN RAISE EXCEPTION 'Execution retirement is immutable' USING ERRCODE='23514'; END IF;
 IF NEW.state<>'retired' AND (NEW.retired_at IS NOT NULL OR NEW.retired_by_user_id IS NOT NULL)
 THEN RAISE EXCEPTION 'Retirement metadata requires terminal retired state' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
