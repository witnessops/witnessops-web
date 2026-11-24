-- Preserve WorkOS subject validation while admitting provider-validated
-- Keycloak opaque subjects in the shared logout tombstone table.
ALTER TABLE revoked_sessions DROP CONSTRAINT revoked_sessions_subject_check;
ALTER TABLE revoked_sessions ADD CONSTRAINT revoked_sessions_subject_check CHECK (
  subject ~ '^user_[A-Za-z0-9]{1,128}$' OR
  (issuer ~ '^https?://[^/]+(/[^/?#]+)*/realms/[^/?#]+$'
    AND char_length(subject) BETWEEN 1 AND 255
    AND subject !~ '[[:space:][:cntrl:]]')
);
