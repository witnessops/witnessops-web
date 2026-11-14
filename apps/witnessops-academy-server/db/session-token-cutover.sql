-- SOURCE ONLY. Requires separate apply authority outside disposable tests.
-- Run as the schema owner/admin, after 003, with the old app stopped.
-- Existing plaintext sessions are revoked; learner identities and drafts are untouched.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';
LOCK TABLE academy_sessions IN ACCESS EXCLUSIVE MODE;
INSERT INTO academy_session_revocations(token_hash, identity_id, reason)
SELECT token_hash, identity_id, 'token_protection_upgrade' FROM academy_sessions
WHERE revoked_at IS NULL AND (tokens_ciphertext IS NULL OR id_token IS NOT NULL OR access_token IS NOT NULL OR refresh_token IS NOT NULL);
UPDATE academy_sessions
SET revoked_at=COALESCE(revoked_at, now()), id_token=NULL, access_token=NULL,
    refresh_token=NULL, tokens_ciphertext=NULL
WHERE tokens_ciphertext IS NULL OR id_token IS NOT NULL OR access_token IS NOT NULL OR refresh_token IS NOT NULL;
ALTER TABLE academy_sessions VALIDATE CONSTRAINT academy_sessions_no_plain_tokens;
COMMIT;
