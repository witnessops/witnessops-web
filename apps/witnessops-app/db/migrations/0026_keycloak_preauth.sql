-- One-use OIDC state shared by all app replicas. The browser holds only a
-- random bearer value; its hash, PKCE verifier, and WorkOS binding live here.
CREATE TABLE keycloak_auth_attempts (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  purpose text NOT NULL CHECK (purpose IN ('login', 'link')),
  state text NOT NULL UNIQUE CHECK (state ~ '^[A-Za-z0-9_-]{32,128}$'),
  nonce text NOT NULL CHECK (nonce ~ '^[A-Za-z0-9_-]{32,128}$'),
  code_verifier text NOT NULL CHECK (code_verifier ~ '^[A-Za-z0-9_-]{32,128}$'),
  return_path text NOT NULL CHECK (char_length(return_path) BETWEEN 1 AND 128),
  bound_user_id uuid REFERENCES users(id),
  bound_session_hash text CHECK (bound_session_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '5 minutes'),
  CHECK ((purpose = 'login' AND bound_user_id IS NULL AND bound_session_hash IS NULL)
      OR (purpose = 'link' AND bound_user_id IS NOT NULL AND bound_session_hash IS NOT NULL))
);

CREATE INDEX keycloak_auth_attempts_expiry_idx ON keycloak_auth_attempts(expires_at);
