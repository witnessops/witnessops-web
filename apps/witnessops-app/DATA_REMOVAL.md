# Bounded workspace content removal

Status: implementation candidate; source/tests do not establish hosted adoption or
completion of a customer request. Automatic retention and full account erasure
remain unimplemented. This procedure introduces no new retention deadline.

## Before a request is acted on

Use the existing support channel. Confirm the requester's identity and authority
over the **named workspace**, the requested scope, other members' interests and
any applicable preservation requirement. Keep that decision and its non-sensitive
request reference in the existing private support record. Do not publish customer
identifiers, receipts or source data in this repository. A preview is not consent.

Agree which records will be removed and which remain. If those boundaries do not
satisfy the request, stop this operation and resolve the missing scope; do not
rename partial content removal as account deletion.

## What this implementation covers

The offline `scripts/workspace-content-removal.mjs` tool removes one workspace's
assets, saved hostname sources, DB-custodied Linux imports, product events and
feedback, invitations, CLI credentials/login bindings and report revisions.
Report access/password/unlock and draft-delivery records cascade with revisions.
The workspace becomes archived, so subsequent member, collection and recipient
access is denied by the existing application checks.

It retains account/provider identity, workspace identity, memberships and free
admission history. It keeps reporting names as detached, non-reassignable
tombstones. These names may contain user-chosen text; the tool does not claim to
erase that text. It does not reset workspace-creation limits.

It refuses:

- any server-check execution, including apparently empty/failed custody;
- running observations, requiring explicit in-flight reconciliation;
- historical contribution/usage, billing or complimentary-grant records;
- attempted/sent report or invitation delivery, including unknown and local-file
  outcomes, requiring separate reconciliation of those copies;
- unknown/mismatched migrations, disabled source guards or a stale preview.

No filesystem, provider, mailbox, log, backup or recipient copy is deleted by
this tool. No automatic scheduling, public deletion endpoint, new database
function or runtime privilege is added.

## Operator sequence

Use the exact reviewed source with Node 22 and installed locked dependencies.
The existing ignored app `.env.local` must explicitly provide the operator
`DATABASE_MIGRATION_URL` on loopback. No connection is inferred or printed.
The tool requires table-owner privileges; the application runtime role is not
given permission to suspend evidence guards. A loopback connection alone does
not establish that the target is a disposable database.

From the app directory:

```sh
node scripts/workspace-content-removal.mjs preview WORKSPACE_UUID
node scripts/workspace-content-removal.mjs apply WORKSPACE_UUID PREVIEW_DIGEST REQUEST_REFERENCE
```

Preview runs in a read-only consistent transaction and returns counts, blockers,
exclusions and a digest. Keep its output private. Inspect it against the approved
scope. Apply is separately explicit and irreversible after commit; it is not
authorized merely by deploying or merging this code.

Apply takes short-timeout, table-wide maintenance locks, rechecks schema and
preview, temporarily suspends only the two source immutability triggers inside
that transaction, deletes scoped content, restores both triggers, archives the
workspace and checks zero remaining content rows before commit. Other tenants
are not deleted, but their reads/writes can briefly wait on these locks. Any
failure rolls back the deletes, archival and trigger state together. Never
disable constraints or triggers by hand to force a blocked request through.

Capture the successful output in the private support record, then run a fresh
preview and confirm the workspace is archived with zero covered content counts.
If the process loses its connection around commit, treat completion as unknown
until readback; do not infer rollback from missing stdout. After success, check
the deployed member and recipient paths deny access. Previously downloaded
copies cannot be recalled. Do not reactivate an erased workspace to reuse it.

## Completion outside this database

Before describing the overall request as complete, separately account for
identity-provider data, correspondence, attempted deliveries, filesystem custody,
logs, backup retention and any justified retained records. Record scope, evidence,
method, timestamp, remaining copies and limitations. Backup restoration must
reapply completed removals before restored data becomes accessible; retain the
minimum private removal record needed to do that. Do not promise a backup expiry
date without the actual environment's policy and evidence.

## Acceptance

`pnpm --filter @witnessops/app test:db` includes synthetic database regressions for
preview, stale-plan rejection, hostname/Linux content, sharing cleanup, tenant
isolation, in-flight rejection and rollback restoring immutable-source guards.
Run the repository health and app browser gates as well. Before hosted adoption,
rehearse with disposable data and the intended restricted runtime/operator roles,
check recovery and external-copy handling, and retain release-specific evidence.

## Contracting identity still required

The repository identifies a founder, not an established legal contracting party.
Before publishing operator details in Terms/Privacy, obtain the exact legal name,
operating capacity, service address and registration/tax details where applicable
from the operator's authoritative record. Do not derive them from a username,
founder biography or assumed incorporation. This patch does not close that gap.
