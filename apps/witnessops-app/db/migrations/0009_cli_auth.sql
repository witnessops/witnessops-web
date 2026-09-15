-- Dedicated CLI credentials; existing identity/membership remain authoritative.
CREATE TABLE cli_login_transactions (
  device_hash text PRIMARY KEY CHECK (device_hash ~ '^[a-f0-9]{64}$'),
  code_hash text NOT NULL UNIQUE CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  last_poll_at timestamptz,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','authenticated','redeemed','denied')),
  user_id uuid REFERENCES users(id),
  workspace_id uuid REFERENCES workspaces(id),
  web_issuer text,
  web_session_id text,
  CHECK (expires_at > created_at),
  CHECK ((state IN ('pending','denied') AND user_id IS NULL AND workspace_id IS NULL AND web_issuer IS NULL AND web_session_id IS NULL)
    OR (state IN ('authenticated','redeemed') AND user_id IS NOT NULL AND workspace_id IS NOT NULL AND web_issuer IS NOT NULL AND web_session_id IS NOT NULL))
);
CREATE INDEX cli_login_expiry_idx ON cli_login_transactions(expires_at);
CREATE TABLE cli_sessions (
  credential_hash text PRIMARY KEY CHECK (credential_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid NOT NULL REFERENCES users(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  web_issuer text NOT NULL,
  web_session_id text NOT NULL,
  scope text NOT NULL DEFAULT 'cli:session' CHECK (scope = 'cli:session'),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > issued_at)
);
CREATE INDEX cli_sessions_user_idx ON cli_sessions(user_id);
CREATE INDEX cli_sessions_expiry_idx ON cli_sessions(expires_at);
