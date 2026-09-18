CREATE TABLE report_shares (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 run_id uuid NOT NULL REFERENCES runs(id),
 created_by uuid NOT NULL REFERENCES users(id),
 membership_generation integer NOT NULL,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 snapshot jsonb NOT NULL CHECK (octet_length(snapshot::text) <= 524288),
 digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '7 days'),
 state text NOT NULL DEFAULT 'preview' CHECK (state IN ('preview','published','revoked')),
 published_at timestamptz,
 revoked_at timestamptz,
 CHECK ((state='preview' AND published_at IS NULL AND revoked_at IS NULL) OR (state='published' AND published_at IS NOT NULL AND revoked_at IS NULL) OR (state='revoked' AND published_at IS NOT NULL AND revoked_at IS NOT NULL))
);
CREATE INDEX report_shares_workspace_run ON report_shares(workspace_id,run_id,created_at);
CREATE FUNCTION protect_report_share() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-'state'-'published_at'-'revoked_at') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'published_at'-'revoked_at') THEN
  RAISE EXCEPTION 'Shared revision is immutable';
 END IF;
 IF NOT ((OLD.state='preview' AND NEW.state='published') OR (OLD.state='published' AND NEW.state='revoked')) THEN
  RAISE EXCEPTION 'Invalid share transition';
 END IF;
 IF OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at THEN RAISE EXCEPTION 'Publication time is immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER report_share_immutable BEFORE UPDATE ON report_shares FOR EACH ROW EXECUTE FUNCTION protect_report_share();
