-- Existing credentials retain cli:session; new capability requires browser consent.
ALTER TABLE cli_login_transactions ADD COLUMN scope text NOT NULL DEFAULT 'cli:session'
 CHECK (scope IN ('cli:session','cli:session server_check:create'));
ALTER TABLE cli_sessions DROP CONSTRAINT cli_sessions_scope_check;
ALTER TABLE cli_sessions ADD CONSTRAINT cli_sessions_scope_check CHECK (scope IN ('cli:session','cli:session server_check:create'));
CREATE TABLE server_check_executions (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 asset_id uuid NOT NULL REFERENCES assets(id),
 user_id uuid NOT NULL REFERENCES users(id),
 request_id uuid NOT NULL,
 request jsonb NOT NULL,
 authority jsonb NOT NULL,
 collector_hash text NOT NULL CHECK(collector_hash ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'authorized' CHECK(state IN ('authorized','uploaded','run_created','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 capture_bytes bytea CHECK(octet_length(capture_bytes) BETWEEN 1 AND 26214400),
 capture_digest text CHECK(capture_digest ~ '^[a-f0-9]{64}$'),
 run_id uuid REFERENCES runs(id),
 failure text,
 UNIQUE(workspace_id,user_id,request_id),
 UNIQUE(run_id),
 CHECK((state='authorized' AND capture_bytes IS NULL AND capture_digest IS NULL AND run_id IS NULL)
 OR (state IN ('uploaded','failed') AND capture_bytes IS NOT NULL AND capture_digest IS NOT NULL AND run_id IS NULL)
 OR (state='run_created' AND capture_bytes IS NOT NULL AND capture_digest IS NOT NULL AND run_id IS NOT NULL))
);
CREATE INDEX server_check_workspace_idx ON server_check_executions(workspace_id);
CREATE FUNCTION preserve_server_execution() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Execution custody is retained' USING ERRCODE='23514'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
 OR NEW.asset_id IS DISTINCT FROM OLD.asset_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
 OR NEW.request_id IS DISTINCT FROM OLD.request_id OR NEW.request IS DISTINCT FROM OLD.request
 OR NEW.authority IS DISTINCT FROM OLD.authority OR NEW.collector_hash IS DISTINCT FROM OLD.collector_hash
 OR NEW.created_at IS DISTINCT FROM OLD.created_at
 OR (OLD.capture_bytes IS NOT NULL AND (NEW.capture_bytes IS DISTINCT FROM OLD.capture_bytes OR NEW.capture_digest IS DISTINCT FROM OLD.capture_digest))
 OR OLD.state IN ('run_created','failed') THEN RAISE EXCEPTION 'Execution source is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER server_execution_custody BEFORE UPDATE OR DELETE ON server_check_executions FOR EACH ROW EXECUTE FUNCTION preserve_server_execution();
