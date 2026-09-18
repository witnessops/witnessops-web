-- Access can change without rewriting a published revision or its original fields.
CREATE TABLE report_share_access (
 share_id uuid PRIMARY KEY REFERENCES report_shares(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
INSERT INTO report_share_access(share_id,token_hash,expires_at) SELECT id,token_hash,expires_at FROM report_shares;
CREATE FUNCTION initialize_report_share_access() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO report_share_access(share_id,token_hash,expires_at) VALUES(NEW.id,NEW.token_hash,NEW.expires_at);
 RETURN NEW;
END; $$;
CREATE TRIGGER report_share_access_insert AFTER INSERT ON report_shares FOR EACH ROW EXECUTE FUNCTION initialize_report_share_access();
CREATE TABLE report_share_deliveries (
 id uuid PRIMARY KEY,
 share_id uuid NOT NULL REFERENCES report_shares(id) ON DELETE CASCADE,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 actor_id uuid NOT NULL REFERENCES users(id),
 membership_generation integer NOT NULL,
 recipient text NOT NULL CHECK (length(recipient)<=254),
 access_version integer NOT NULL,
 message_digest text NOT NULL CHECK (message_digest ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','sending','accepted','file_saved','unknown')),
 created_at timestamptz NOT NULL DEFAULT now(),
 provider text,
 provider_message_id text,
 provider_accepted_at timestamptz
);
CREATE INDEX report_share_deliveries_workspace ON report_share_deliveries(workspace_id,created_at);
CREATE INDEX report_share_deliveries_actor ON report_share_deliveries(actor_id,created_at);
