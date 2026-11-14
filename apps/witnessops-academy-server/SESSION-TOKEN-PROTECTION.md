# A3 session-token protection and explicit cutover

Source implementation only. No production apply or key provisioning is authorized
by this document or the draft PR. Academy still uses the one existing Keycloak
identity and PostgreSQL database.

## Stored format and trust boundary

ID, access and refresh tokens are encrypted together with AES-256-GCM using a
fresh random 96-bit nonce and a 128-bit tag. Only the versioned envelope is
written to `academy_sessions.tokens_ciphertext`. The legacy three token columns
must remain NULL; a database CHECK enforces that invariant for runtime writes.
Revoking a session clears its encrypted bundle. CSRF token, opaque cookie hash,
identity UUID, IdP session id and expiry remain session metadata.

Authenticated additional data binds each envelope to its version/purpose, key
id, configured issuer and client, cookie hash and identity UUID. Copying a bundle
between sessions or learners, modifying bytes, or supplying an unknown key id
fails closed and revokes that local session. There is no plaintext fallback.
This protects a database-only disclosure; it does not protect a compromised app
process or an attacker with both the database and encryption keys. Historical
plaintext backups are not retroactively encrypted or erased by this source.

## Key source and rotation contract

`ACADEMY_TOKEN_KEYRING_FILE`, or the systemd credential `academy_token_keyring`,
holds JSON with exactly `active` and `keys`. `active` selects a key id in `keys`;
each value is the canonical base64 encoding of an independently generated random
32-byte key. Up to eight keys are accepted. Never reuse the OIDC client secret,
pre-auth key, signing keys, passwords, or learner-derived values. There is no
raw-environment secret or automatic development-key fallback.

The structural shape is `{ "active": "current", "keys": { "current": "<base64-encoded random 32-byte key>" } }`.
This is a shape illustration, not a usable keyring. Keep the real file outside
source, logs and artifacts, readable only by the intended runtime identity.
Keyring absence, invalid key length/encoding or unknown active id prevents startup.

A separately authorized rotation provisions a new independent key and changes
`active`, retaining the previous key entries, then restarts the single app
process. New sessions and token refreshes write the active key. Existing sessions
read retained keys and opportunistically rewrap with the active key through a
compare-and-set update, so concurrent refresh/revocation is not overwritten.
Retire a key only after no still-active, unexpired session needs it, or after an
explicitly authorized session revocation. Expired records can retain ciphertext;
never delete a key needed for retained recoverable backups without its owner's
determination. Removing a needed key forces affected sessions to sign in again.

No source task rotates or changes a production secret. Key custody, backup
retention and rollback recovery remain operator-controlled release checks.

## Explicit legacy cutover (proposal, not applied)

Migration `003_academy_session_token_protection.sql` adds the encrypted column and
constraints. Its no-plaintext constraint is initially NOT VALID, retaining legacy
rows unchanged. It already rejects new/updated rows containing plaintext.
The server refuses startup until that constraint has been explicitly validated.

For a later authorized cutover, stop the old app, preserve the approved rollback
and database backup, apply the reviewed migrations with the schema owner/admin,
then run `db/session-token-cutover.sql` with that owner/admin. This separate,
transactional source step revokes legacy sessions, clears all three plaintext
columns, appends revocation records, and validates the constraint. It is
repeatable, does not delete session rows, and never alters identities or learner
drafts. Start the new app only with the separately provisioned keyring. Existing
learners sign in again and recover their existing drafts.

The disposable CI setup performs this cutover only in its newly created synthetic
database. It also tests a separate database seeded with legacy sessions and a
learner draft, including startup refusal, plaintext-write denial, token removal,
revocation, draft preservation and repeated cutover.

## Rollback and acceptance

Do not restart the old plaintext-writing server against the new constraint or
remove the constraint to make rollback pass. Prefer an encryption-aware previous
code version, retaining the exact needed keyring and database state. Any restoration
of an older database/old server needs separate authority and an explicit plaintext
risk decision; it is not automatic rollback. Learner drafts stay in their existing
table throughout. Encrypted session revocation never deletes learner work.

Required source acceptance: crypto/context/tamper/rotation tests, real disposable
legacy cutover, browser sign-in/save/return/isolation, encrypted Keycloak refresh,
and the existing HTTP/MCP suites. A passing source/disposable run establishes no
production key custody, active cutover, TLS/proxy routing or production acceptance.
