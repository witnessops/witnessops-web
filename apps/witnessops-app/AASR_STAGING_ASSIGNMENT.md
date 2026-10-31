# Attended AASR staging assignment

This operator command prepares and applies membership for two already
authenticated native WorkOS test identities. It does not sign anyone in, create
provider accounts or fictional identity mappings, send invitations, provision a
database, publish an image or authorize deployment. Run it only against the
separately approved synthetic staging database, after both people have completed
native sign-in. The ordinary app production build cannot use this assignment.

Obtain the internal user UUID and exact WorkOS subject for each approved account
from its native `identity_mappings` record. Review them independently; emails and
display names are not identity keys. The Owner and Reviewer must be distinct.
The Reviewer receives native Contributor membership, with separately assigned
fixture review authority. An arbitrary Owner does not receive fixture authority.

Create a private, absolute-path JSON manifest with exactly these fields:

```json
{
  "schema": "witnessops.aasr-staging-assignment.v1",
  "reviewId": "REPLACE_WITH_REVIEW_REFERENCE",
  "workspaceId": "11000000-0000-4000-8000-000000000001",
  "origin": "REPLACE_WITH_REVIEWED_STAGING_HTTPS_ORIGIN",
  "workosClientId": "REPLACE_WITH_WORKOS_TEST_CLIENT_ID",
  "issuer": "REPLACE_WITH_EXACT_WORKOS_USER_MANAGEMENT_ISSUER",
  "databaseTargetSha256": "REPLACE_WITH_REVIEWED_RUNTIME_DATABASE_TARGET_DIGEST",
  "owner": { "userId": "REPLACE_WITH_NATIVE_INTERNAL_UUID", "subject": "REPLACE_WITH_WORKOS_SUBJECT", "generation": 1 },
  "reviewer": { "userId": "REPLACE_WITH_OTHER_NATIVE_INTERNAL_UUID", "subject": "REPLACE_WITH_OTHER_WORKOS_SUBJECT", "generation": 1 }
}
```

This is a shape, not executable assignment data. The issuer is exactly
`https://api.workos.com/user_management/` followed by the reviewed test client ID.
New memberships have generation 1. Existing memberships must already have the
exact reviewed role, active status and generation; the command never silently
restores a revoked membership or changes another assignment. The fixed workspace
must be absent or match this command's synthetic workspace identity and contain
no product assets, runs, invitations or unrelated memberships.

The database target digest uses `stagingDatabaseTargetDigest` from
`src/lib/aasr-staging/build-profile.js`. It covers host, normalized port, decoded
database name and runtime username; it excludes the password. It must match the
reviewed build binding and runtime connection. Password rotation alone does not
change it. Both database and role names must end `_staging`. Connection URL
queries/fragments are rejected. The migration connection must address that same
database using a separate identity. The runtime role must be a login with no
administrative attributes (including REPLICATION), direct/effective ownership,
membership in owner or privileged roles, or database/schema CREATE privilege.
The preflight checks every schema and relation in the bound database, independent
of the migration and runtime search paths, including privileges reachable through
role membership even when automatic inheritance is disabled. Missing runtime grants
remain a separate deployment preflight; this command grants no database rights.

Supply these through the approved private environment, never shell arguments,
chat, screenshots or public commits: `DATABASE_URL`,
`DATABASE_MIGRATION_URL`, `WORKOS_CLIENT_ID`,
`NEXT_PUBLIC_WORKOS_REDIRECT_URI`, and `WITNESSOPS_DEPLOYMENT_ENV=staging`.
The command does not load any `.env` file automatically and does not need a
WorkOS API key. Keep manifest/receipts private. The manifest cannot be a symlink
or group/world writable; receipts require private regular files.

From this app directory, using Node 22 and installed dependencies:

```sh
node --conditions=react-server --import tsx scripts/aasr-staging-assignment.ts dry-run \
  --manifest /absolute/private/reviewed-assignment.json \
  --receipt /absolute/private/dry-run.json

node --conditions=react-server --import tsx scripts/aasr-staging-assignment.ts apply \
  --manifest /absolute/private/reviewed-assignment.json \
  --reviewed-dry-run /absolute/private/dry-run.json \
  --receipt /absolute/private/apply.json

node --conditions=react-server --import tsx scripts/aasr-staging-assignment.ts rollback \
  --manifest /absolute/private/reviewed-assignment.json \
  --apply-receipt /absolute/private/apply.json \
  --receipt /absolute/private/rollback.json
```

Each output path must be new. Dry run takes transaction locks, checks existing
native accounts, writes no database rows and ends with ROLLBACK. Review its exact
before/after state before authorizing apply. Apply rechecks the native mappings,
account state and entire reviewed snapshot under the same membership lock used
by app mutations. Changed state fails closed. Repeating the same reviewed apply
against its exact resulting state is a no-op.

The operation receipt is fsynced before mutation and explicitly says
`PREPARED_NOT_COMMIT_PROOF`. After successful readback and COMMIT, the command
writes a sibling `.commit.json` receipt. A missing commit receipt is an uncertain
outcome; preserve the prepared receipt and reconcile/retry only against its exact
recorded state. Never infer failure or blindly replace the reviewed mapping.

Rollback revokes only memberships created by that reviewed apply, advances their
generation through the normal database trigger, and archives a workspace created
by that apply. It preserves users, mappings and rows. Pre-existing grants remain
unchanged. Drift blocks rollback, and repeated completed rollback is a no-op.
Re-admission after rollback requires a separately reviewed change; this initial
assignment utility intentionally does not reactivate archived/revoked state.

Mount the reviewed manifest read-only into the dedicated staging runtime and set
`WITNESSOPS_AASR_STAGING_ASSIGNMENT_FILE` to its absolute path. Before assignment,
native login remains available and the UI shows access pending. Every fixture
read/write rechecks both assigned native mappings, active accounts, memberships
and generations under transaction locks; it also locks and rechecks the caller's
current session against native logout revocation. The shared session helper makes
logout and a fixture transition commit in one database-defined order. It does not
turn a previously valid response into proof of current session validity.

No identity or manifest is sent to the browser. Replacing the assignment while
the process holds fixture state denies further operations until an explicit
restart. Restart discards the synthetic in-memory engagement. This remains a
single-process simulation with no real recipient delivery or customer evidence.
