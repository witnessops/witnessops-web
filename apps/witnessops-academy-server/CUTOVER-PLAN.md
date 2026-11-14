# Academy proxy, key-custody and A3 cutover plan — NOT APPLIED

This is a reviewable future action sequence. It grants no authority to merge,
provision a key, stop/start a service, migrate a production database, deploy or
reload a proxy. Source checks use synthetic fixtures. Actual host state, key
custody and the production database are UNVERIFIED until recorded by their owner.

## Source validation and missing owner evidence

| Item | Source validation | Production evidence still required |
| --- | --- | --- |
| Proxy | Complete Academy candidate validates; real request-policy regression | Full active multi-site config, candidate diff, exact Caddy version/modules, existing-host regression and rollback reference |
| Token file | Read-only custody/format preflight; private regular-file fixtures | Intended runtime UID, private canonical absolute path, protected parent directories/ACLs, actual file metadata/access and custodian |
| Key material | Strict AES-256 keyring format and retained-key rotation tested | Separate approved provisioning/custody, independent key provenance, retained key/version recovery, custody-separated protected backups |
| Database | Schema gate, cutover, lock failure rollback and draft preservation tested | Exact database/roles, reviewed backup/restore evidence, active-writer inventory and cutover window |
| Identity | Existing issuer/client binding and disposable sign-in/resume tests | Exact production callback URI, S256, audience and logout settings; no wildcard redirects |
| Acceptance | Disposable learner isolation/persistence | Separately authorized attended production journey and rollback decision |

A source PASS cannot populate the last column. Do not retrieve or print key
material as evidence. Record non-secret status/versions and private evidence
references; keep actual secret locations, host details and backups out of this
public repository. This task performs no production inspection or key provisioning.

## Read-only key preflight contract

After a separate provisioning action, run the following as the intended runtime
identity, with its approved secret-file/credential selection already present:

```sh
node apps/witnessops-academy-server/scripts/check-token-keyring.mjs
```

It has no network/database action, creates no files, and reports no key ids,
values or file paths. It checks an absolute regular file through a no-follow
file descriptor, root/runtime ownership, exact 0400 or 0600 permissions, bounded
size, then keyring structure/encoding. It supports the existing explicit
`ACADEMY_TOKEN_KEYRING_FILE` or `CREDENTIALS_DIRECTORY/academy_token_keyring`.
Relative paths, links, directories, empty/oversized files, group/other access and
invalid format fail closed. Runtime loading uses the same check.

The owner must separately ensure the location is outside source/build/served
roots, parent directories cannot be replaced by untrusted users, backups do not
co-locate database and keys under the same disclosure boundary, and the custodian
can recover every retained key needed by the approved rollback. No raw-environment
secret or automatic key generation is provided. This preflight is a file/format
check, not an assertion of operational custody or completed provisioning.

## Ordered future cutover, requiring its own exact GO

1. Bind the approved source/artifacts, database, service identities and proxy
   candidate to exact revisions/digests in a private operator record. Preserve
   the existing main-history/static-release checks; a draft PR is not a released
   artifact. Capture the full active proxy config and construct its complete
   candidate preserving every unrelated virtual host. Validate it with the exact
   deployed Caddy binary/modules without loading it into the running instance.
2. Obtain the missing identity, role, rollback and key-custody evidence above.
   Complete the read-only key preflight before stopping the old app or clearing
   any legacy token. Do not proceed on a missing/invalid keyring, absent recovery
   copy or unverified database identity. Provisioning is a separate authorized action.
3. Stop/admit only the specifically approved Academy writers for the cutover;
   confirm the writer inventory and single-app-process limit. Do not stop unrelated
   workloads. Preserve the approved database backup/restore point after writes
   are quiescent, and record learner draft/identity counts privately. Legacy-token
   backups contain plaintext credentials and retain their existing restricted
   custody/retention rules; this plan neither publishes nor deletes them.
4. Run the reviewed explicit migrations with the schema owner/admin against that
   exact database. Do not run them through either runtime role. Migration 003 is
   additive and leaves the no-plaintext constraint NOT VALID; new runtime writes
   are already checked, and the new app deliberately refuses startup at this stage.
5. Run `db/session-token-cutover.sql` with that owner/admin. It is transactional,
   waits at most five seconds for its table lock and has a five-minute statement
   timeout. A timeout/error is failure: roll back the failed transaction, inspect
   the named blocker and leave admission closed; do not repeatedly retry blindly.
   Successful execution revokes legacy sessions, removes all three plaintext
   token fields and validates the constraint without modifying learner drafts.
6. Confirm the constraint is validated, plaintext token counts are zero, and the
   expected draft/identity state is preserved. Re-run the read-only key preflight
   under the runtime identity. Start only the approved encryption-aware version
   with its exact issuer/client/keyring and distinct app/MCP database roles.
7. Only under the separate proxy/deployment GO, load the complete approved host
   candidate and run attended checks: real-domain sign-in, partial save, browser
   close/fresh login, logout, expiry and two-learner isolation. Check existing host
   behavior and static/dynamic headers. Record exact revisions, results and limits.

## Failure and rollback

Before migrations/cutover, the old matched app/static/proxy pair may remain a
rollback candidate only if the old runtime contract still holds. After cutover,
never drop the protection constraint or restart the old plaintext-writing server.
Use an approved encryption-aware rollback with the exact required retained keyring
and matching schema/artifacts, or keep Academy admission closed while the owner
resolves the failure. A source-compatible version is not a staged/accepted rollback
artifact by itself. Restoring an older database needs its own decision about draft
freshness and plaintext exposure; never silently discard newer learner work.

Proxy rollback and data/key rollback are different operations. Restore only the
approved complete proxy reference; retain the encryption constraint and learner
records. The cutover is repeatable, but repeatability is not authority to retry.
No production apply is approved by a successful source or disposable test.
