ALTER TABLE memberships DROP CONSTRAINT memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check CHECK (role IN ('owner','contributor','viewer'));
ALTER TABLE memberships ADD COLUMN generation integer NOT NULL DEFAULT 1 CHECK (generation > 0);
ALTER TABLE cli_sessions ADD COLUMN membership_generation integer NOT NULL DEFAULT 1;
ALTER TABLE cli_login_transactions ADD COLUMN membership_generation integer NOT NULL DEFAULT 1;
ALTER TABLE server_check_executions ADD COLUMN membership_generation integer NOT NULL DEFAULT 1;
ALTER TABLE runs ADD COLUMN membership_generation integer NOT NULL DEFAULT 1;
CREATE TABLE workspace_invitations (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 recipient text NOT NULL CHECK (length(recipient) BETWEEN 3 AND 254),
 role text NOT NULL CHECK (role IN ('owner','contributor','viewer')),
 inviter_id uuid NOT NULL REFERENCES users(id),
 request_id uuid NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '7 days'),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','accepted','cancelled','expired','superseded')),
 accepted_user uuid REFERENCES users(id),
 accepted_generation integer,
 accepted_at timestamptz,
 closed_at timestamptz,
 replaces uuid REFERENCES workspace_invitations(id),
 delivery_state text NOT NULL DEFAULT 'not_sent' CHECK (delivery_state IN ('not_sent','sending','accepted','failed','unknown')),
 delivery_started_at timestamptz,
 provider text,
 provider_message_id text,
 provider_accepted_at timestamptz,
 UNIQUE(workspace_id,inviter_id,request_id)
);
CREATE UNIQUE INDEX workspace_pending_recipient ON workspace_invitations(workspace_id,recipient) WHERE state='pending';
CREATE INDEX workspace_invitation_sends ON workspace_invitations(inviter_id,created_at);
-- Every role/status transition invalidates old authority, including operator SQL.
CREATE FUNCTION advance_membership_generation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
  NEW.generation := OLD.generation + 1;
 ELSIF NEW.generation IS DISTINCT FROM OLD.generation THEN
  RAISE EXCEPTION 'Membership generation requires an authority change';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER membership_generation BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION advance_membership_generation();
