-- 001: additive only. Creates new objects; never drops or rewrites existing ones.
-- Runs as role academy_migrator (owner). Runtime role academy_app gets DML only, no DDL, no DELETE on drafts.
CREATE TABLE IF NOT EXISTS academy_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Identity mapping: (issuer, subject) -> internal UUID. Email and name are deliberately not stored.
CREATE TABLE IF NOT EXISTS academy_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer text NOT NULL,
  subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_identities_issuer_subject_uq UNIQUE (issuer, subject)
);

-- Server-side sessions. The cookie carries a random token; only its SHA-256 is stored.
CREATE TABLE IF NOT EXISTS academy_sessions (
  token_hash text PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES academy_identities(id),
  csrf_token text NOT NULL,
  idp_session_id text,
  id_token text,
  access_token text,
  access_expires_at timestamptz,
  refresh_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

-- Append-only revocation log (logout, IdP session ended, admin revocation detected).
CREATE TABLE IF NOT EXISTS academy_session_revocations (
  id bigserial PRIMARY KEY,
  token_hash text NOT NULL,
  identity_id uuid NOT NULL REFERENCES academy_identities(id),
  reason text NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_lesson_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES academy_identities(id),
  lesson_id text NOT NULL CHECK (lesson_id ~ '^[a-z0-9-]{1,64}$'),
  content text NOT NULL CHECK (octet_length(content) <= 32768),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  last_save_request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_lesson_drafts_owner_lesson_uq UNIQUE (owner_id, lesson_id)
);

GRANT SELECT, INSERT ON academy_identities TO academy_app;
GRANT SELECT, INSERT, UPDATE ON academy_sessions TO academy_app;
GRANT SELECT, INSERT ON academy_session_revocations TO academy_app;
GRANT USAGE ON SEQUENCE academy_session_revocations_id_seq TO academy_app;
GRANT SELECT, INSERT, UPDATE ON academy_lesson_drafts TO academy_app;
GRANT SELECT ON academy_schema_migrations TO academy_app;

INSERT INTO academy_schema_migrations(version) VALUES ('001_academy_identity_and_drafts') ON CONFLICT DO NOTHING;
