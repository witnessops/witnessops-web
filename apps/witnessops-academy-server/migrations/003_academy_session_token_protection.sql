-- Additive schema change only. The separate explicit cutover clears legacy tokens.
ALTER TABLE academy_sessions ADD COLUMN IF NOT EXISTS tokens_ciphertext text;
ALTER TABLE academy_sessions ADD CONSTRAINT academy_sessions_ciphertext_format CHECK (
  tokens_ciphertext IS NULL OR (tokens_ciphertext LIKE 'v1.%' AND octet_length(tokens_ciphertext) <= 262144)
);
-- NOT VALID preserves existing rows until the separately authorized cutover.
-- New/updated rows are already forbidden from writing plaintext credentials.
ALTER TABLE academy_sessions ADD CONSTRAINT academy_sessions_no_plain_tokens CHECK (
  id_token IS NULL AND access_token IS NULL AND refresh_token IS NULL
) NOT VALID;
INSERT INTO academy_schema_migrations(version) VALUES ('003_academy_session_token_protection') ON CONFLICT DO NOTHING;
