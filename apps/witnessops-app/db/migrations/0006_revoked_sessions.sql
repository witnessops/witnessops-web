-- Auth state spans workspaces. Never store tokens or cookie contents here.
CREATE TABLE revoked_sessions (
  issuer text NOT NULL CHECK (char_length(issuer) BETWEEN 1 AND 300),
  session_id text NOT NULL CHECK (session_id ~ '^session_[A-Za-z0-9]{1,128}$'),
  subject text NOT NULL CHECK (subject ~ '^user_[A-Za-z0-9]{1,128}$'),
  revoked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer, session_id)
);
-- A session can refresh beyond the current JWT expiry. Retain tombstones until
-- a separately verified provider-session lifetime permits safe cleanup.
