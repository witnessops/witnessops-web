# WitnessOps product foundation

UX reference: `witnessops/witnessops-demo-ui` at `4887c0fc5f2ac6742de0f4c9e11cb11e8603ade4`. The app uses WorkOS AuthKit for identity/session and WitnessOps-owned PostgreSQL data for workspace access. Deployment state requires separate runtime evidence.

## Local setup

Use Node 22 and pnpm 9.15.4 from the monorepo root:

1. Install with `pnpm install --frozen-lockfile`.
2. Copy the safe variable template in `.env.example` to **this app's** `.env.local`. Supply a WorkOS staging API key/client ID, a cryptographically random cookie password (at least 32 characters), and the database connections. Keep both local configuration files ignored and mode 0600. Do not paste values into logs, tests, screenshots, or commits.
3. Use the existing local PostgreSQL 17 service. Provide separate development and test databases and separate runtime, migration, and test credentials. The runtime role needs CONNECT, schema USAGE, table SELECT/INSERT/UPDATE/DELETE and sequence USAGE/SELECT. It must not own schema objects or have superuser/CREATEDB/CREATEROLE/BYPASSRLS. The migration role owns the application tables; arrange default runtime grants before migration. Neither development role should connect to the test database, nor the test role to development.
4. Run `pnpm --filter @witnessops/app db:migrate`. This explicitly loads `.env.local` and uses **only DATABASE_MIGRATION_URL**. No migrations run on application startup. Ordered SQL files and their SHA-256 checksums are applied transactionally under a migration lock. Changed already-applied migrations fail. These additive migrations have no automatic destructive down command.
5. Run `pnpm dev` for the public app and, separately, `pnpm app:dev` for the product. The default origins are `http://127.0.0.1:3001` and `http://127.0.0.1:3020`.
6. Register the WorkOS staging callback `http://127.0.0.1:3020/callback`, initiate login `http://127.0.0.1:3020/login`, homepage and sign-out return `http://127.0.0.1:3020/`. Enable Google and Magic Auth (email one-time code) in the intended development identity environment. The two app entry links lead to the hosted method chooser; the app does not collect credentials or implement passwords. Do not change another application's shared provider settings inadvertently.
7. Create an account or sign in. By default, an invited account chooses Activate workspace access. The optional free-workspace admission below enables verified-account self-service. Paused accounts remain blocked. Then create a workspace and add a hostname. Adding it does not collect anything. Confirm authorization and choose Observe. Rerun after one minute. Logout/login and application restart preserve assets and runs.

## Free workspace lifecycle candidate

`WITNESSOPS_FREE_WORKSPACE_LIMIT` explicitly enables self-service with a creator ceiling from 2 to 20; unset preserves invitation-only admission. The ceiling counts all workspaces created by the account, including archived ones. It is an environment safeguard, not a live commercial promise. Disabling it closes new creation for free accounts but preserves their current memberships.

Eligibility comes from the authenticated WorkOS adapter's verified email, never a request-body flag. Account suspension, historical admission revocation and workspace membership revocation remain separate checks. Existing invited users still activate explicitly. Active invited admission retains its existing creation path when self-service is enabled or disabled; it does not acquire a free policy or the self-service creator ceiling. A fresh eligible account can create its own workspace without a card; this does not admit it to anyone else's workspace or authorize a check.

Migration `0014_free_workspaces.sql` adds a free-access marker and explicit `free-workspace-v1` workspace records. Number 0013 is reserved by the paused legacy admission proposal and is not a dependency. Workspace, Owner membership and free policy are written in one transaction under a user lock. Reusing a creation key returns the original workspace; changing its name with that key conflicts. New free workspaces cannot enroll in the historical contribution policy. Historical terms and consent rows are unchanged.

The initial free policy enforces 32 saved/running hostname checks and three Linux import sources per workspace, with the existing 20-asset and storage/collector safeguards. There is no trial, subscription, automatic conversion, monthly reset or automatic retention deletion. These bounded staging defaults require a separate commercial decision before public self-service activation.

The workspace picker remembers a per-account preference in browser storage and revalidates current membership on return. It is not an authorization token and does not synchronize across devices. Membership management, sharing and billing remain subsequent slices. Database tests exercise populated 0010/0012 upgrades, retries, rollback, concurrent ceilings, denial paths and unchanged historical data. Browser fixtures do not establish fresh hosted signup acceptance.

The additive migration preserves existing records, but an older application image does not admit newly created free-only accounts. Rolling back the image is therefore not a complete recovery for those users. Production-role grants and backup/restore recovery must be checked separately before activation; no destructive down migration is supplied.

## Early Access cohort

Early Access belongs to the internal user, separately from workspace membership. New identities have no cohort access. An operator can set `invited` or `paused`; an invited user explicitly activates. Active access never creates membership or upgrades Viewer to Owner. Paused access denies reads, writes and in-flight source completion; it does not delete previous evidence. WorkOS Organizations remain outside workspace authority.

Migration `0005_early_access.sql` is additive. If existing active members are present, the migration refuses to proceed without `--preserve-member USER_UUID`. Supply the explicitly accepted existing internal member to preserve, for example `pnpm --filter @witnessops/app db:migrate --preserve-member USER_UUID`. No UUID is inferred from a name, email or all members. New accounts remain unenrolled until the user explicitly starts Early Access; existing invited accounts retain their separate activation path. Empty test databases need no preservation argument. Already applied migration checksums remain frozen.

From the app directory, local operator commands are:

```sh
node scripts/early-access.mjs set USER_UUID invited
node scripts/early-access.mjs set USER_UUID paused
node scripts/early-access.mjs report
```

These use the local migration connection and reject non-loopback databases. They do not send email, create memberships or expose an admin HTTP route. Identify the internal user through the existing database identity mapping after they sign in; do not enroll by matching an email domain. The operator invitation command remains available for a specific internal user. No provider production configuration is created by this flow.

`/early-access` on the public site explains the account and invitation path. `Save this baseline` transfers no snapshot, source, email or hostname. The user creates an account or signs in, requests an invitation, then adds the hostname and authorizes a **fresh** saved observation after access is granted. The public site's optional server variable `WITNESSOPS_EARLY_ACCESS_APP_URL` enables app and signup links to an approved app origin (root URL, HTTPS; loopback HTTP allowed locally). Development defaults to the existing local app. Configuring or publishing a live app origin remains a separate deployment action.

## Behavior events and feedback

`product_events` records only a fixed event name, internal user/workspace/asset/run IDs, an optional known check ID, server timestamp and event-contract version. No hostname, source evidence, URL, comment or arbitrary metadata is accepted. Workspace membership is rechecked for each event. Lifecycle events are server-owned; clients can report only the seven declared view/export/escalation actions. One event per user/object/check/action avoids re-render/reload inflation; it measures adoption, not total click counts. The bound is 250 distinct records per user/hour. Recording is best-effort and uses short transaction timeouts; failure cannot roll back an asset or successful run.

`pdf_export_requested` means the browser print action was requested. It cannot prove a file was saved. `comparison_viewed` is sent when the comparison enters the viewport. Neither is security evidence. The local `report` command returns aggregate access state, event/adopting-user and feedback-answer counts, without source data or free-text comments. Analysts can inspect bounded feedback directly using the administrative database connection; no customer endpoint exposes a cohort feed.

`product_feedback` stores at most one answer or dismissal per user/workspace/context: the first completed saved run, and a completed run with an earlier same-asset comparison. Feedback is optional, workspace-authorized (including Viewers), and separate from immutable snapshots. Only the user's own prompt-suppression state is readable through the app. The two prompts do not become a recurring survey. Comments allow at most 500 characters within the existing 1 KiB request bound; no secrets or confidential data should be submitted. Failed feedback never blocks evidence/report navigation; failed state loading suppresses prompts.

Automatic retention/deletion is not implemented for product data, events or feedback. Signing out does not delete them. Privacy copy states that boundary and directs data requests to the existing contact channel. There is no analytics vendor, scheduler, billing or automatic public-result import.

`WORKOS_COOKIE_DOMAIN` must remain unset. AuthKit owns sealed HttpOnly, SameSite=Lax cookies, PKCE/state checking, signature/subject validation and refresh. HTTPS callbacks use Secure; HTTP is admitted only for the local loopback origin. Callback and sign-out return origins come from server configuration, not request headers or user input. Sign-out is a Next server action with explicit same-origin admission. The app CSP permits that form's WorkOS logout destination; public web CSP is unchanged. The public site does not use the app session. Browser cookies have no port boundary, so local apps on the same loopback hostname receive the host cookie; use only trusted local services. Production requires the separate app hostname and a host-only cookie, without a parent-domain cookie.

## Data and access

WorkOS provider/issuer/subject maps to an internal UUID; email is only a verified snapshot and never an identity key. WorkOS Organizations are not workspace authority. WitnessOps owns users, identity mappings, workspaces, memberships, assets and runs. The workspace creation transaction creates its Owner; a per-user creation key makes retries deterministic. A workspace name or slug is not proof of company identity.

Every resource operation resolves a provider-authenticated internal user, then rechecks active user/workspace/membership in the database. `WorkspaceStore` centralizes mandatory workspace predicates and membership locks. Owner and Contributor can add assets and run explicitly authorized observations. Viewer can read and export. Owners manage invitations and members; removing or demoting the last effective Owner is rejected. Membership revocation during collection prevents returning or preserving the source. Known resource identifiers do not establish access.

**RLS is deferred.** Current isolation is application authorization plus scoped SQL and relational constraints, not a database RLS claim. Tenant tests exercise this actual query/API layer using a separate test database, not the production runtime role. Production multi-worker execution quotas, operational retention and abandoned-run recovery remain later hardening; this slice retains the existing process-local two-run concurrency, ten starts/minute and one start/hostname/minute limits. Workspace capacity is bounded to twenty assets and thirty-two retained/active runs. Capacity errors never delete old runs.

## Workspace membership candidate

Owners invite a verified email as Viewer (default), Contributor or Owner. Contributor can add assets, run authorized hostname work, import supported Linux results and explicitly request CLI server-check scope. Only Owners manage members and historical commercial consent. Existing plan and collection limits still apply.

Invitation links locate a record; they do not authorize access. WorkOS sign-in returns only to a validated invitation path, preview makes no membership change, and Accept requires the matching current verified email. Local parts are exact; domains are normalized. Invites expire after seven days. Resend supersedes the old locator; delivery errors remain unknown until an explicit resend. Invitations reserve places, with ten occupied/reserved places as the staging ceiling and any lower historical seat limit retained. Issuance is bounded to ten per sender and workspace per hour across processes.

Joining creates only a workspace membership. It does not change account admission markers, enable workspace creation, start billing or issue CLI authority. Paused, disabled and historically revoked accounts remain blocked. Removal and role changes increment membership generation; old CLI credentials, pending grants and unfinished executions cannot regain access after rejoining. New CLI authorization is required.

Migration `0015_workspace_membership.sql` adds invitation records and authority-generation bindings without rewriting accepted terms or saved sources. The runtime role needs SELECT/INSERT/UPDATE on the new table in addition to existing grants; apply migration-owner default privileges before release. An older app image does not enforce these generation checks and is not a safe rollback after membership mutations. Stop membership writes and review compatibility before any rollback; do not drop the new schema to roll back.

Invitations set `WitnessOps <invitations@send.witnessops.com>` and reply-to `engage@mail.witnessops.com` explicitly; report/verification sender defaults are unchanged. Domain verification and approved staging provider configuration require separate confirmation.

Local invitation tests use the existing file adapter: set `WITNESSOPS_MAIL_PROVIDER=file` and an ignored, private `WITNESSOPS_MAIL_OUTPUT_DIR`. The UI distinguishes local file creation from provider acceptance. File output and mocked browser tests do not establish inbox delivery or hosted recipient acceptance. Configure a separately approved staging sender and complete the two-person WorkOS journey before treating this candidate as accepted.

## Execution and immutable source

The path remains authenticated Owner/Contributor → authorized workspace/asset → internal `runSnapshot()` → existing `validateExternalSnapshot()` → PostgreSQL. No app-to-app HTTP, public endpoint broadening, duplicate runner, OFFSEC executor, or arbitrary ports. The engine retains public-address safety, redirect/TLS bounds, deadlines and network budgets. Product mutations require a same-origin JSON body of at most 1 KiB and fixed keys; callers cannot inject transports or check options.

A run starts as running and transitions to completed only with the complete validated `ExternalSnapshotV1`, completion time and SHA-256 digest. Failed execution records failed without a manufactured source. Both the query layer and a PostgreSQL trigger prevent updating/deleting completed sources. Reruns append new IDs. Observations and reports project the preserved snapshot; no separate observation table duplicates it.

Digest contract: recursively sort JSON object keys by UTF-16 code units; preserve array order; use JSON string/finite-number encoding without whitespace; hash the resulting **UTF-8 bytes using SHA-256**, lowercase hex. JSONB may reorder keys internally; reads canonicalize again and check correspondence. JSON downloads use those same canonical bytes. Every source field is retained. This is not signing, source-system authentication or tamper-proof storage.

“Clear” applies only to an individual expected observation, never overall security. CHECK_ERROR remains Undetermined, with its raw status in provenance. DMARC and HSTS retain the production contracts. Environment changes compare collected observations under unchanged methods; new/removed checks and method/profile changes are Coverage. Collection uncertainty is not a security finding. Old runs stay unchanged.

## Validation

```sh
pnpm app:test
pnpm --filter @witnessops/app test:db
pnpm test:app-browser
pnpm app:build
pnpm --filter @witnessops/app lint
pnpm --filter @witnessops/app typecheck
pnpm health
```

`test:db` requires only **TEST_DATABASE_URL** in `.env.test.local`. It refuses a non-loopback target or a database name not ending `_test`, creates a unique disposable schema, applies real migrations, and drops only that schema afterward. It never falls back to DATABASE_URL. It covers identity, atomic workspace creation, persisted sources, known A/B resource IDs, Viewer denial and revocation through the runtime authorization path. A new pool lifecycle confirms durable reads. These are deterministic replay tests; no public network collection occurs.

`pnpm health` remains the repository's build/lint/type/unit gate and includes the ordinary app tests. Database integration and Chromium/WebKit browser tests are **separate explicit acceptance commands** because they require local PostgreSQL/browser prerequisites. Browser UI tests use deterministic route fixtures; real HTTP negative tests reject absent/forged sessions and malformed callbacks. They do not substitute for a real hosted AuthKit login/logout test. No formatter is configured; use ESLint and `git diff --check`.

## Deferred and production prerequisites

No billing, schedules, Public Services/IP/ports, OFFSEC, SSO/SCIM, advanced RBAC, notifications or public report sharing. Saved-run PDFs reuse the shared buyer-report pipeline. Edit checks explains the fixed ten-check method.

Before `app.witnessops.com`: separately authorize DNS/TLS/app routing, runtime/image publication and deployment; configure the production WorkOS client and exact HTTPS callbacks/sign-out URLs; custody runtime secrets separately; provision PostgreSQL backups/recovery/retention and migration grants; establish production session/operational limits and multi-worker execution admission. RLS is a later hardening layer. Public release commands still target witnessops-web; this slice does not deploy either application.
