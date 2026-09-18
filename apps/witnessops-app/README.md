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

The workspace picker remembers a per-account preference in browser storage and revalidates current membership on return. It is not an authorization token and does not synchronize across devices. Membership, fixed-revision sharing and opt-in sandbox billing are described below. Database tests exercise populated 0010/0012 upgrades, retries, rollback, concurrent ceilings, denial paths and unchanged historical data. Browser fixtures do not establish fresh hosted signup acceptance.

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

Automatic retention/deletion is not implemented for product data, events or feedback. Signing out does not delete them. Privacy copy states that boundary and directs data requests to the existing contact channel. There is no analytics vendor, scheduler or automatic public-result import. Sandbox billing is separately opt-in.

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

No live billing, schedules, Public Services/IP/ports, OFFSEC, SSO/SCIM, advanced RBAC, notifications or named-recipient sharing. Saved-run PDFs reuse the shared buyer-report pipeline. Edit checks explains the fixed ten-check method.

Before `app.witnessops.com`: separately authorize DNS/TLS/app routing, runtime/image publication and deployment; configure the production WorkOS client and exact HTTPS callbacks/sign-out URLs; custody runtime secrets separately; provision PostgreSQL backups/recovery/retention and migration grants; establish production session/operational limits and multi-worker execution admission. RLS is a later hardening layer. Public release commands still target witnessops-web; this slice does not deploy either application.

## Fixed-revision report sharing

Owners can preview and explicitly publish a completed hostname or Linux report. Contributors can preview; Viewers retain ordinary read/export access. Publication fixes the recipient projection and its SHA-256 digest in an additive `report_shares` record. The digest identifies bytes, not the truth of findings. The preview shows the exact content, audience and expiry before confirmation. Previews expire for publication after one hour; links expire seven days after preview creation. Repeated publication of the same preview is idempotent.

The recipient projection omits raw attachments, detailed source observations, member emails, internal resource identifiers and comparison history. It preserves material unknowns, method limitations and existing synthetic labels. Owners must inspect the preview for sensitive narrative content before publishing. There is no source-download endpoint on this surface.

Links use `/s#<secret>`: the fragment stays in the link so refresh and browser copying work, but is sent to the server only in the body of a same-origin POST to `/api/shared-report`. Tokens are random 256-bit values stored only as hashes. The public endpoint checks current publication, expiry and workspace state on every request. It exposes neither private workspace APIs nor membership. Pages and responses are no-store/noindex/no-referrer; the recipient page does not mount AuthKit or analytics. Revocation denies subsequent requests immediately; the open page rechecks periodically and when returning to it. Previously seen or downloaded content cannot be recalled. Losing a copied link requires publishing a new revision; tokens cannot be recovered from the database.

Before customer activation: apply migration 0016 with appropriate runtime table privileges, confirm recovery procedures and deployed proxy/cache/body-log exclusions, and complete the authenticated Owner → separate-browser recipient → revoke journey in staging. Route-fixture browser tests and isolated database tests do not establish hosted acceptance. No mail configuration is needed.

Share retention is bounded per workspace to 128 records and 16 MiB, in addition to the creation-rate limit. New previews opportunistically remove unpublished previews older than one hour and links expired/revoked for more than 30 days. Active links are not removed by cleanup; all retained published links remain in the revoke list.

## App Help

The top-right Help panel reuses the documentation-answer runtime and conversation scrolling. Only the explicit question and an allowlisted generic page category reach the provider; no workspace/report/member payload, browser route identifier, transcript history or public-widget analytics is attached. Questions are independent. Conversation state is memory-only and resets on workspace/page-category change. The panel offers documentation and an unfilled human-contact email draft even when AI guidance is unavailable. No operational action tools exist on this endpoint.

Provider calls require the separate `WITNESSOPS_APP_HELP_ENABLED=1` gate as well as the existing approved documentation-assistant configuration. Nothing enables or copies provider credentials automatically. Before enabling hosted guidance, validate the documentation corpus against the current signup, membership, Share and sandbox-only billing behavior; earlier invitation-gated or commercial guidance must not be treated as current. Route-fixture tests do not establish actual provider/corpus acceptance. Rate limiting is per authenticated identity, instance-local and best effort, reusing the existing limiter.
## Sandbox workspace billing

Billing is opt-in with `WITNESSOPS_BILLING_SANDBOX=1`; this implementation rejects live Stripe keys and live events. Signup remains cardless and does not create a Stripe customer. Checkout creates one customer for the selected workspace only when its current Owner explicitly chooses a configured plan. No illustrative public catalogue amount is hard-coded.

Configure `STRIPE_SECRET_KEY` (test/restricted-test key), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION`, and `WITNESSOPS_BILLING_PLANS` through the approved sandbox environment. The plans value is a JSON array of `{key,name,priceId,currency,amount,interval,seats}`: stable internal key, display name, exact sandbox recurring Price ID, `eur`/`usd`/`gbp`, positive integer minor-unit amount, `month`/`year`, and 2–100 included seats. Prices must be active, licensed, per-unit, quantity one and exactly match amount/currency/interval. This configuration is a sandbox test contract, not approval of a live commercial offer or tax setup.

With sandbox billing enabled, non-historical workspaces have one free seat. A current paid entitlement or explicit complimentary grant increases seats. Pending invitations reserve seats. A downgrade keeps members, workspace access and evidence; new invitations/acceptances exceeding the current allowance fail. Comparison, Share, Linux import and report/export remain available on both free and paid workspaces. Existing operational check/source/storage limits and collection/CLI authorization remain unchanged. Historical accepted terms are not rewritten and historical-plan workspaces cannot start subscription Checkout in this slice.

The hosted Customer Portal configuration must be active and in test mode. If plan changes are enabled, permit only price changes to the exact configured Price IDs; quantity changes are rejected. Returning from Checkout grants nothing. A signed webhook or explicit Owner refresh fetches current subscriptions and the paid invoice from Stripe, checks workspace/customer/price/quantity binding, and records a bounded paid-through entitlement. Trialing, incomplete, past-due, unpaid, paused, unknown/multiple subscriptions and unrecognized invoice/price combinations grant no paid seats. Scheduled cancellation preserves paid seats through the paid period; final cancellation removes only the additional seat allowance. There is no automatic deletion or member removal.

The dedicated `/api/billing/webhook` route verifies the exact raw-body signature and timestamp, rejects live events, serializes reconciliation by workspace, and records processed event IDs transactionally. Retries and older event payloads fetch current provider state rather than replaying an earlier access decision. Stripe failures roll back processing so events can be retried. Subscribe to subscription lifecycle, invoice paid/payment-failure/action-required/updated, and Checkout completed/async-payment events listed in the handler. Private workspace endpoints keep their normal session, origin and membership checks.

Checkout intent/idempotency keys are committed before provider calls. Unknown provider outcomes retain the same key; after 23 hours an unresolved intent requires operator/provider reconciliation rather than creating another subscription blindly. A finished/expired Checkout can be cleared and retried. Already-existing subscriptions use the Portal, not a second Checkout. Keep keys and provider bodies out of logs. Cancellation/refund/dispute commercial rules and real payment acceptance remain activation work; this sandbox slice does not activate tax, live charges or production billing.

Billing operations use a two-minute database lease with fenced writes. Stripe calls hold neither membership locks nor pool clients. Concurrent billing requests receive a retryable conflict; expired operations cannot overwrite a newer reconciliation.

Complimentary access is a separate workspace record with seats, expiry, operator reference and reason. There is no customer-facing grant endpoint. The explicit sandbox-only operator command is `node scripts/complimentary-access.mjs <workspace-uuid> <seats> <expiry-ISO> <operator-reference> <reason>` using the approved environment; a past expiry revokes the grant. Effective seats use the larger active paid or complimentary allowance; a grant never reduces paid capacity. It neither fabricates a Stripe subscription nor authorizes collection. Do not run it against production under this implementation task.

Before activation: configure actual sandbox prices/Portal/webhook, apply migrations 0017–0018 and runtime grants, complete real Checkout/payment/Portal/webhook and two-person seat acceptance, and rehearse reconciliation/recovery. Tests with a deterministic Stripe gateway establish application behavior, not a successfully exercised Stripe sandbox account. Live billing requires separate commercial/tax decisions, configuration and authorization.
