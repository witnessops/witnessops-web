ALTER TABLE report_share_access
 ADD COLUMN password_hash text CHECK(password_hash IS NULL OR password_hash ~ '^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{64}$'),
 ADD COLUMN password_attempts integer NOT NULL DEFAULT 0 CHECK(password_attempts>=0),
 ADD COLUMN password_window timestamptz NOT NULL DEFAULT now();
CREATE TABLE report_share_unlocks (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 share_id uuid NOT NULL REFERENCES report_shares(id) ON DELETE CASCADE,
 access_version integer NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX report_share_unlocks_share ON report_share_unlocks(share_id,expires_at);
