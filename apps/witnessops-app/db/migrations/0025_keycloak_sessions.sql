-- Local product sessions for explicitly linked Keycloak identities. WorkOS
-- sessions and their revocation records remain untouched for cutover/rollback.
-- The bearer cookie and OIDC tokens must never be stored in plaintext here.
-- The migration role's prearranged default privileges grant app-runtime DML;
-- this source migration does not name a production role or apply credentials.
CREATE TABLE keycloak_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  session_id text GENERATED ALWAYS AS ('session_' || token_hash) STORED UNIQUE,
  issuer text NOT NULL CHECK (char_length(issuer) BETWEEN 1 AND 300),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 255),
  user_id uuid NOT NULL REFERENCES users(id),
  tokens_ciphertext text,
  revision integer NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 2147483646),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '12 hours'),
  CHECK ((revoked_at IS NULL AND tokens_ciphertext IS NOT NULL)
      OR (revoked_at IS NOT NULL AND tokens_ciphertext IS NULL)),
  CHECK (tokens_ciphertext IS NULL OR octet_length(tokens_ciphertext) BETWEEN 1 AND 262144)
);

CREATE INDEX keycloak_sessions_active_user_idx
  ON keycloak_sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX keycloak_sessions_active_expiry_idx
  ON keycloak_sessions(expires_at) WHERE revoked_at IS NULL;
