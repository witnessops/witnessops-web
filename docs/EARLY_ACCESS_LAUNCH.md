# External Exposure Early Access launch

Status: **local product accepted; production launch blocked on the prerequisites below**.
Audit source: `af6ae2fc957cc15b6b496fedab45d9244476c2f2`, branch
`feat/witnessops-app-foundation`. Target: `https://app.witnessops.com`, initially
3–5 named users, at most 20 before an operational review.

This plan is not permission to publish, provision, migrate production, send
invitations, change WorkOS/DNS, or deploy. The initial audit performed no such
operation. The separately authorized non-public foundation is recorded in
section 2.1 below. See [deployment authority](DEPLOYMENT_AUTHORITY.md) and
[custody boundary](DEPLOYMENT_CUSTODY.md). Actual host addresses, credential
locations, cloud identifiers, backup destinations and deployment coordinates
belong in restricted operator custody. Names in command examples below are
unbound service aliases/placeholders, not an inventory of live infrastructure.

## 1. Confirmed implementation and evidence

The [app README](../apps/witnessops-app/README.md) owns local setup and product
semantics. This document adds the production launch procedure, not a second
application specification.

| Confirmed from source/local acceptance | Not established by this audit |
| --- | --- |
| Next 15.5.21 / Node 22, pnpm 9.15.4, standalone output | A published, scanned **app** image and its runtime contents |
| WorkOS AuthKit 4.3.1, internal provider identity mapping | Production WorkOS client, Google credentials, Magic Auth delivery and production session acceptance |
| PostgreSQL `pg` pool and five transactional SQL migrations | A production app database, runtime grants, TLS and off-host backup/restore |
| Current EA access plus current workspace membership, Owner/Viewer | Host-side isolation, production runtime-role rehearsal and end-to-end denial tests through the actual proxy |
| Internal bounded hostname runner, immutable source/digest, shared reports/PDF | Production egress/runtime compatibility and restart/drain acceptance |
| Cohort events and feedback | A launch owner, recovery objective approval, retention/deletion operating procedure |

Accepted local evidence for the product commit: 30 app unit/API tests, 25
PostgreSQL integration tests, 37 app browser cases, 50 public browser cases,
four public PDF pagination cases, and `pnpm health` passed. Security diff scan
`679e7dd7-83ae-4086-b15d-5b476b4e361c` sealed the matching candidate with zero
findings. These are local results, not production verification. Database tests
use isolated test credentials, not a production runtime role. Browser fixture
coverage does not replace real hosted login and production proxy acceptance.

Inspected runtime authority: `.github/workflows/aws-release*.yml`,
`deploy/Dockerfile.aws`, and `deploy/aws/host/witnessops-deploy-v1` implement the
existing web release pattern: protected publication, immutable ECR identity,
image scan, SSM-controlled host adapter and k3s/containerd rollout. The build
and repository checks are explicitly **witnessops-web**. No app-specific image,
deployment target, or `app.witnessops.com` routing was found under `deploy/` or
`.github/`. Historical Compose/Caddy files are not evidence of current hosting
and must not be reactivated as a shortcut. No live DNS/cloud/host inventory or
production DB was queried; current spare capacity and actual edge topology are
unknown.

## 2. Smallest production architecture

Proposed initial topology: HTTPS edge/reverse proxy → **one** app process → one
PostgreSQL 17 database; the same app process calls the existing hostname engine.
PDF generation remains the buyer's browser print path, not a new server service.

**Provisional recommendation: B, a separate small app instance**, reusing the
existing protected release *pattern* after an app-specific target is reviewed.
Keep app and PostgreSQL isolated from the public web workload and public-site
credentials. A dedicated persistent DB volume and encrypted off-host backup
are mandatory if PostgreSQL shares that small instance. This accepts one-host
availability risk for a tiny cohort; it is not high availability. Start with
one Node process and benchmark two concurrent observations plus a report read;
choose memory/disk size from that result, not a guessed capacity promise. Build
off-host. Obtain a current instance/storage/backup quote before approval.

| Option | Decision condition |
| --- | --- |
| A: existing production host | Lower incremental cost, but share failure/resource risk with the public site. Choose only after read-only evidence of spare memory/disk, independent app resource limits, separate DB credentials/volume, app-only restart/rollback and network isolation. None is yet established. |
| B: separate small instance | Default recommendation for isolation and independent recovery; requires explicit new infrastructure approval and a named backup/operator owner. Reuse account/process knowledge, not public-site workload credentials. |
| C: another existing service | Prefer only if an already-operated persistent app/DB service with tested recovery is identified. No such target was established here; do not introduce a new platform for elegance. |

Do not enable replicas, autoscaling, overlapping rolling app workers, or a job
queue for launch. Admission is process-local: two active executions, ten starts
per minute, one start per hostname per minute. Restart resets these counters.
One replica is a scope constraint, not a distributed quota guarantee. An
app-specific image/deployment path and resource/drain policy are launch blockers;
do not repoint the protected web workflow to this app.

## 2.1. Non-public foundation status — 2026-09-11

The separately authorized foundation was provisioned and remains non-public.
Its infrastructure identities, administrative-access details, role/credential
custody, firewall evidence, backup configuration and recovery commands remain
in restricted operator record `EA-PROD-FOUNDATION-20260911`, outside this public
repository.

The original migrations and synthetic recovery rehearsal passed, including
runtime-role authorization, immutable source digests, history and buyer-report
HTML rendering without recollection. This does not establish whole-host RTO,
production authentication or browser/PDF fidelity. The original image failed
its package-security gate and was kept inactive. The subsequent remediation
candidate and deliberately generic network model are described below.

## 2.2. Runtime remediation candidate — 2026-09-11

The original image remains rejected evidence, without relabeling:
`sha256:6d7f2d301ad33c5d7ccc35915615acc8d8a4a4c9de646572609c6cc627273a46`
from source `8f6311f40ce04310631df2772bab58a24ee3620a`. Its scan reported three
Critical and thirteen High advisory records. The earlier infrastructure source
review did not clear those package advisories.

Replacement transport/runtime manifest:
`sha256:b955c711888fdde7e28bb8a682d51645a762d96c0582ad2097b798e32712a62a`.
The local OCI manifest is
`sha256:c79e5a5d8ca4f1df25dfc0cac1c0ccb6a05620709b372c00983e188e16536f18`;
Docker-archive transport changes manifest serialization. The source labels,
image configuration identity and transferred archive checksum match.
This is a pre-commit candidate built from that source plus the reviewed patch;
its labels explicitly record dirty source and a build-input SHA-256. Do not
represent it as the unchanged ancestor or a clean committed release. The exact
input inventory, lockfile hash, scan and later commit correspondence belong in
restricted operator custody.

[The app Dockerfile](../deploy/app/Dockerfile) keeps the pinned Node 22.23.2
Alpine base, updates only libcrypto3/libssl3 to 3.5.8-r0, and removes global
npm/Corepack/Yarn tooling from the runtime filesystem. Next.js changes only in
the authenticated app: 15.5.21 → 15.5.24. A scoped override selects Sharp 0.35.4
for that Next version. Public web dependencies and application behavior code
are unchanged. Alpine's ordinary runtime utilities remain; this is not a
custom distroless image or a promise that every utility has been removed.

Trivy 0.74.0 scanned the replacement with vulnerability and secret detection,
without severity suppression: **0 Critical, 0 High, 0 Medium, 0 Low, 0 secret
findings**, with 62 inventoried packages. Eleven old records disappear because
unused npm tooling is absent; five are fixed by the OS/Next/Sharp patches.
The full inventory/SBOM and per-advisory disposition are retained privately.
These scan results are not application deployment or exploitability claims.

The disabled service now uses a dedicated Podman bridge network rather than
host networking. Its future listener binds within the container, published only
on host loopback for a later reverse proxy. PostgreSQL is reached through a
read-only-mounted local Unix socket using runtime credentials; no database TCP
publication or broad tailnet access is introduced. This replaces the previous
host-network service configuration. Target validation, redirect revalidation and connection
pinning remain authoritative; the container network is an additional containment
boundary, not authorization. Preserve one fixed container name, no rolling
overlap, and both startup approval markers. Temporary connectivity checks must
exit and leave the production app service disabled/inactive.

Controlled checks passed all nine runtime connectivity/privilege assertions and
all 43 unchanged hostname/network safety tests in the replacement image. The
bridge permits only the necessary gateway DNS input. The service selects the
maintained Ubuntu `runc` runtime after isolating a `crun`/AppArmor socket denial
with `no-new-privileges`; AppArmor enforcement, dropped capabilities, non-root
execution and `no-new-privileges` all remain enabled. Temporary probes were
removed; the production app remains disabled and inactive.

The operator reports Cloudflare configuration, and read-only DNS now resolves
the app hostname. **No DNS change was made in this remediation.** DNS existence
is not public application acceptance: origin ingress remains closed and no
production WorkOS configuration, app startup or external-user admission is
included. Before startup, require the finalized candidate review and obtain
the separate production authentication and launch authorizations. Before public routing/user #1, complete section 10 acceptance.

## 3. WorkOS production configuration

Operator actions, **not executed**:

1. Create/select a separate production WorkOS application for the app, leaving
   the staging client and local destinations unchanged. Enable Google and
   Magic Auth (email OTP) through hosted AuthKit; obtain any production social
   provider/domain/email configuration required by that account. Do not enable
   passwords or WorkOS Organizations as workspace authority.
2. Register exact callback `https://app.witnessops.com/callback`, initiate-login
   `https://app.witnessops.com/login`, homepage and sign-out return
   `https://app.witnessops.com/`. No wildcard, staging or localhost production
   redirects. Login routes to the hosted chooser; the two UI links do not
   implement separate credential collectors.
3. Supply the matching production client ID/API key and a new random cookie
   password (at least 32 characters). Do not copy staging sessions or local DB
   identity mappings into production. The issuer mapping embeds the client ID;
   moving clients/environments changes the identity tuple and must not trigger
   email-based account linking.
4. Verify Google, OTP, refresh, logout and repeated-login identity in the real
   HTTPS app before admitting external users. OTP production delivery has not
   been established by the prior Google-only acceptance.

Configuration authority: [WorkOS Next.js setup](https://workos.com/docs/authkit/nextjs)
and the **installed** SDK version. Current upstream docs also discuss newer
Next versions; this app intentionally uses Next 15 middleware.

Code evidence: `src/lib/auth-config.ts`, `auth.ts`, `middleware.ts`,
`app/login/route.ts`, `app/callback/route.ts`, `app/actions/logout.ts` in the app.
Callback origin is server-configured, `/callback` only, without credentials,
query or fragment. HTTPS is enforced except for explicit loopback development.
The production deployment preflight must reject loopback even though code
permits it for local tests. Callback uses SDK PKCE/state and fixed baseURL `/`
return; logout is a same-origin server action with fixed return URL. No
request-controlled redirect destination is accepted by the app wrappers.

Session cookie: default `wos-session`, Path `/`, HttpOnly, SameSite=Lax,
Secure with the HTTPS callback, **no Domain attribute**. Keep
`WORKOS_COOKIE_DOMAIN` unset; the app rejects it. Set max age explicitly to
604800 seconds rather than relying on the SDK's much longer default; provider
access/refresh lifetimes still govern validity. `eagerAuth` is not enabled, so
do not introduce the SDK's separate client-readable token cookie. Verify actual
Set-Cookie output, including absence of broad parent-domain cookies.

Identity is `(provider, issuer, subject)` → internal UUID, never email. The
installed SDK uses client-selected WorkOS JWKS and signature/time verification,
then checks sealed user/subject consistency. Its `jwtVerify(token, JWKS())`
call does **not** supply explicit issuer/audience options; do not claim it does.
The app's issuer string is a mapping namespace, not independent JWT issuer
validation. Keep API-host overrides unset, use separate production secrets,
and include foreign-client/staging-session rejection in the launch rehearsal.
Failure is a launch stop, not permission to weaken SDK validation.

## 4. Configuration checklist

No secret values were read for this audit. Templates are in
[`.env.example`](../apps/witnessops-app/.env.example). Production runtime
injection must come from the approved secret/config delivery mechanism; never
bake `.env.local` or credentials into an image or build log.

| Variable | Classification / phase | Production value or source; missing/rotation behavior |
| --- | --- | --- |
| `WORKOS_API_KEY` | SECRET, runtime | Production WorkOS secret; absence causes authentication 503, invalid key causes exchange/refresh failure. Restart after rotation; test refresh. |
| `WORKOS_CLIENT_ID` | NON-SECRET, environment-specific, runtime | Production app client, consistent with artifact/callback. Absence causes 503. Restart on change; changing it changes durable issuer namespace. |
| `WORKOS_COOKIE_PASSWORD` | SECRET, runtime | New cryptographic secret ≥32 characters, stable across restarts. Short/missing causes 503. Rotation restarts app and invalidates existing sealed sessions; do not promise a key ring. |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | PUBLIC, environment-specific, build **and** runtime | Exactly `https://app.witnessops.com/callback`. Next public values can be inlined. Build for that URL and inject the same runtime value; missing/invalid causes failure, mismatch can redirect incorrectly. Rebuild/restart to change. |
| `WORKOS_COOKIE_SAMESITE` | NON-SECRET, runtime | `lax`. Other modes rejected. Restart to change; no cross-site cookie mode. |
| `WORKOS_COOKIE_MAX_AGE` | NON-SECRET, runtime | Explicit `604800`; provider expiry is separate. Missing falls back to SDK default. Restart applies to newly issued cookies. |
| `WORKOS_COOKIE_DOMAIN` | Prohibited config | Unset; any nonempty value rejected. |
| `DATABASE_URL` | SECRET, environment-specific, runtime | Restricted app role and exact app DB, verified TLS for nonlocal transport. Missing/failed connection yields failed product requests. Cached pool max six; restart on credential/endpoint/CA changes. |
| `DATABASE_MIGRATION_URL` | SECRET, migration job only | Schema-owner connection, never normal app runtime. Existing CLI reads app-local `.env.local`, not ordinary environment injection; see migration procedure below. |
| `TEST_DATABASE_URL` | SECRET, test-only | Isolated loopback DB ending `_test`. Never set to production. Only test command uses it; no runtime need. |
| `NODE_ENV` | NON-SECRET, build/runtime | `production`; never `development` on public service. Rebuild/restart. |
| `HOSTNAME`, `PORT` | NON-SECRET, runtime | Standalone listener chosen by approved runtime. Inside isolated container listen on container interface; expose only through proxy. Package `start` instead binds loopback:3020. Validate selected mode; do not assume these override package CLI flags. |
| `WITNESSOPS_APP_BROWSER_TEST` | Test-only | Unset in production; `1` selects `.next-browser` during test builds. |
| `WITNESSOPS_EARLY_ACCESS_APP_URL` | PUBLIC URL, public-web server/build config only | `https://app.witnessops.com/` only after app acceptance. Without it production `/early-access` remains request-only. Treat public page regeneration/release separately; it transfers no snapshot. |

SDK optional `WORKOS_API_HOSTNAME`, `WORKOS_API_PORT`, `WORKOS_API_HTTPS`,
`WORKOS_CLAIM_TOKEN`, `WORKOS_COOKIE_NAME` must remain unset for this launch.
They are not required infrastructure. Standard optional PostgreSQL CA/connection
options must be explicitly tested with installed `pg`, not assumed from libpq.
No OpenAI key, public scanner key, cloud collector key or public contact-mail
credential is needed by the app execution path. Do not copy the public web
environment wholesale. Logging/debug options remain off.

Blocker: rehearse a clean app artifact build with only the production **public**
callback value and no local configuration files. Confirm server secrets are
runtime-only. Existing local builds loaded development configuration and do not
alone prove hermetic production packaging.

## 5. PostgreSQL provision, migrate and recover

Provision only after approval. Minimum: one PostgreSQL 17 database, dedicated
schema owner/migrator, restricted app login and a backup/restore operator. No
ORM or RLS change. Prefer the existing operated PostgreSQL service if one is
demonstrated with isolation/recovery; otherwise dedicated persistent storage on
the separate app host is the proposed tiny-cohort starting point.

Use separate runtime/migration credentials. Runtime must not own tables/schema
or have SUPERUSER, CREATEDB, CREATEROLE or BYPASSRLS. Revoke PUBLIC CREATE on the
application schema and PUBLIC CONNECT to the app DB as appropriate; explicitly
grant runtime CONNECT, schema USAGE, table SELECT/INSERT/UPDATE/DELETE and
sequence USAGE/SELECT. Set default privileges **for the migration owner** before
creating tables. Do not grant runtime access to `app_migrations` after migration.
These SQL permissions are not a substitute for app tenancy: runtime can access
multiple tenants, and RLS is deferred. Prove app A/B denials through the runtime
role before launch. Restrict DB ingress to the app/admin path, never public.

Set SCRAM credentials, verified server certificate/hostname for nonlocal DB
connections, CA trust and connection limits. With one app process the pool max
is six (connect timeout 5s, idle 30s, statement timeout 10s); reserve additional
connections for migration, backup and diagnosis, e.g. a reviewed total budget
of 20 rather than multiplying workers. Same-host loopback or isolated-container
transport without TLS requires explicit operator acceptance; no cleartext
off-host exception. Verify `pg_stat_ssl` for the actual runtime connection.
Do not disable certificate verification to make connectivity work.

Migrations, in order:

1. `0001_users_identity.sql`: users and provider mappings.
2. `0002_workspaces_memberships.sql`: atomic workspace/Owner model.
3. `0003_assets.sql`: workspace-scoped normalized assets.
4. `0004_runs.sql`: complete source constraints and completed-run UPDATE/DELETE trigger.
5. `0005_early_access.sql`: explicit cohort state, events and feedback.

The runner takes an advisory lock and applies all pending files in **one
transaction**, with an SHA-256 checksum ledger. No automatic DOWN migration
exists. No migration on app startup. For a new empty production DB, do not pass
`preserveMember`. For an upgrade with active members, 0005 intentionally fails
without one explicitly approved internal member UUID; it does not enroll all
users. Do not copy local accepted users/workspaces into production by default.

Current local command: `pnpm --filter @witnessops/app db:migrate`. It reads
`.env.local` and cannot be advertised as a ready production secret-injection
job. A controlled one-shot migration job can use the **existing exported**
function from the exact release source. The following template runs from the
app package directory with the migration secret injected, never printed:

```sh
node --input-type=module <<'JS'
import pg from 'pg';
import { migrate } from './scripts/migrate.mjs';
if (!process.env.DATABASE_MIGRATION_URL) throw new Error('Migration connection required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL, max: 1, connectionTimeoutMillis: 5000 });
try { await migrate(pool); console.log('Migrations complete'); }
catch { console.error('Migration failed; inspect controlled diagnostics'); process.exitCode = 1; }
finally { await pool.end(); }
JS
```

This requires separately packaging scripts, SQL files and `pg` in the migration
job; Next standalone output alone is insufficient. For an approved nonempty
upgrade pass `{ preserveMember: '<approved-internal-uuid>' }` to `migrate`.
Test the job on a restored disposable database first. Never put secret values
on command lines or enable shell tracing.

After migration inspect `app_migrations` (five names and source-file hashes),
constraints, `runs_immutable` trigger, owner/default grants and actual runtime
role attributes. Test existing identities/rows retained. Check completed runs
have snapshot/digest/finished_at and recompute digests through
`src/lib/source-digest.ts` / the normal report-read path; do not use
`jsonb::text` as a substitute canonicalization. Canonical JSON sorts object keys
by UTF-16 code units, preserves arrays, uses compact JSON encoding and hashes
UTF-8 bytes with SHA-256. It is correspondence, not signing/tamper-proofing.

## 6. Backup and demonstrated restore

Proposed objective requiring operator approval: encrypted off-host nightly
logical backup plus one immediately before migration/release, 14 daily copies,
RPO ≤24 hours, provisional RTO ≤4 hours **only after a timed restore proves it**.
Accepting that RPO means up to a day of new assets, runs, feedback and membership
changes could be lost after total DB failure. No zero-loss promise or PITR
claim. Backup retention is not an implemented customer-data deletion policy.

Use PostgreSQL 17 `pg_dump -Fc`, not a raw live-volume copy. The destination
must be encrypted, access-restricted and outside the app host; assign upload,
age/failure check and recovery-key custody to a named operator. Without a
working nightly mechanism, explicitly perform/confirm a backup daily; missed
backup age is a launch/continued-admission stop. Record role/grant definitions
separately without exporting passwords into the public repo. Logical dumps
alone do not contain roles or server/TLS configuration.

Template aliases below must be configured privately for approved targets;
credentials belong in protected service/credential configuration, not shell
history. Run only in the later authorized operation:

```sh
pg_dump --dbname='service=ea_backup' --format=custom --no-owner --no-acl --file="$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE" > "$BACKUP_INDEX"
# Verify encrypted off-host upload/checksum; listing is NOT a restore test.
# ea_restore must identify a NEW isolated empty recovery database.
pg_restore --dbname='service=ea_restore' --exit-on-error --single-transaction \
  --no-owner --no-acl "$BACKUP_FILE"
```

`BACKUP_FILE` and `BACKUP_INDEX` are protected operator-selected destinations;
plaintext temporary files need restricted permissions and approved cleanup.
Apply reviewed ownership/grants to the restored DB. Do not restore over the
live database or use `--clean` as routine rollback. Disable collectors and
external contact actions in the recovery rehearsal. Check counts for all eight
product tables plus `app_migrations`, every completed source digest, first/last
run IDs and ordering, EA/membership state, report/PDF rendering and A/B read/write
denials using the runtime-role path. Confirm restored service restart and
off-host recovery work without the original host. Preserve the original backup.

References: [pg_dump/SQL dumps](https://www.postgresql.org/docs/17/backup-dump.html),
[pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html),
[TLS verification](https://www.postgresql.org/docs/17/libpq-ssl.html). Confirm
equivalent verified TLS behavior in Node `pg`; libpq documentation alone does
not establish Node connection validation.

## 7. Network, reverse proxy and logs

`src/lib/server.ts` directly imports the web engine's `runSnapshot()`; it does
not call public `/api/external-exposure`. Admission requires current active EA,
workspace membership, Owner role, scoped asset and explicit `authorized:true`.
Keep those tests and deployed code unchanged.

Engine ceilings: DNS/TCP 3s, TLS/HTTP 5s, total run 30s; 20 DNS queries, one
normal TLS probe, two legacy TLS probes, eight HTTP requests, three redirects;
256 KiB response ceiling and 64 KiB security.txt. All A/AAAA candidates must be
public; every new socket re-resolves and validates, then dials the selected
address. Reject private/reserved/metadata/transition addresses, credentialed
URLs and non-HTTP(S)/nonstandard-port redirects. HTTPS checks validate
certificate/hostname. Legacy protocol support varies with Node/OpenSSL and
must remain Undetermined when the runtime cannot establish it, not a finding.

Allow controlled DNS resolution (UDP/TCP to the approved resolver), outbound
TCP 80/443 for public observations, HTTPS to WorkOS and the exact DB path.
Do not attach privileged cloud credentials or use host networking as a shortcut.
Reject access to metadata/private services with network controls where possible;
the DB exception belongs to the app connection, never collector target input.
Transparent TLS interception, DNS rewriting, IPv6 routing, proxy environment
variables or runtime OpenSSL changes require target-runtime rehearsal. No new
collector or broader address policy is authorized.

Use an app-only supervisor/restart policy and resource limits. Drain starts
before restart, allow >30s plus persistence time (proposed ≥60s graceful window),
and prove actual termination behavior. There is no durable execution queue or
automatic recovery of abandoned `running` rows. After interruption identify
them, prove no worker still owns them, then use a reviewed conditional
running→failed operator correction; never fabricate a completed snapshot.
Workspace limits are 20 assets, 32 completed/running runs and an 8 MiB stored
source pre-admission threshold. Failed rows/events can still accumulate; watch
DB size and capacity, do not delete immutable runs to bypass limits.

DNS work remains unperformed: create `app` A to the selected ingress public IPv4,
or CNAME to the approved service hostname; add AAAA only after IPv6 acceptance.
Actual record value cannot be specified until the target is approved. Use the
existing edge provider only after its live routing contract is inspected.
Terminate valid TLS with an explicitly owned ACME/managed certificate and
renewal monitoring; if edge and origin both terminate TLS, validate both and
require authenticated/verified origin transport. Redirect HTTP→HTTPS at ingress.

Preserve external `Host: app.witnessops.com` and correct trusted scheme/forwarded
headers, replacing untrusted inbound forwarding headers. `admitRequest` compares
Host, URL origin and mutation Origin exactly; prove valid POSTs through the real
proxy and forged host/origin rejection. Never relax admission to fix proxy setup.
Disable shared caching for app HTML/API/callback responses and Set-Cookie;
allow static assets only under the reviewed framework policy. Do not strip
AuthKit middleware headers. Request timeout must exceed the bounded engine plus
DB/auth overhead; test body-limit behavior and streamed/chunked requests.

App headers are no-store/noindex/no-referrer with its own CSP. Public-site CSP
does not automatically authorize or protect the app origin. No CORS or shared
ambient login is needed. Existing shared HSTS is two years with
includeSubDomains/preload; the actual apex HSTS/preload/edge response was not
queried. Assume HTTPS is mandatory; do not plan an HTTP fallback. Never share a
`.witnessops.com` session cookie.

Application API handlers intentionally return bounded errors and do not log
request bodies, source snapshots, cookies or secrets. That is **not** proof that
all production logs are safe: SDK warnings/error paths and proxy access logs
must be inspected with synthetic failures. Next ignores callback incoming logs
in its config; do not assume that suppresses ingress query logging. Redact
callback `code`/state, query values, Cookie/Authorization/Set-Cookie and DB URLs
at every layer; leave SDK debug/eagerAuth off.

Minimum operational log fields: generated request ID, route template (not raw
query), response status, duration and bounded failure class. Internal user/
workspace/run IDs only in access-restricted operational logs when necessary.
These fields are a deployment acceptance requirement, **not all implemented**
application instrumentation. Current generic 500s and swallowed event failures
mean deeper diagnosis is limited; use supervisor/DB health plus explicit readback,
not evidence-body logging. No logging source changes are made by this plan.

## 8. Cohort admission and pause procedure

The existing `scripts/early-access.mjs` is **loopback-development-only**. Do not
remove that guard or claim it already manages production. For the first cohort,
use a restricted SQL operator session with parameterized UUIDs after explicit
approval. There is no customer admin endpoint or invitation sender.

1. User #1 signs into the production client, receiving no EA access initially.
   Confirm the resulting internal UUID against the production provider/issuer/
   subject mapping. Email is only a display snapshot, not enrollment authority.
2. Operator sets that named active internal user to `invited`; user chooses
   Activate Early Access. The app sets `active`, records activation best-effort,
   then atomically creates workspace + Owner on explicit user action.
3. Pause uses `early_access_state='paused'`; reads/writes and completion are
   denied on subsequent authorization. Existing evidence is retained. Pause
   does not retroactively recall already-delivered data or instantly abort an
   in-flight socket; emergency containment also stops app execution.

Safe SQL shape for a named user (psql variables supplied by the operator, not
customer input), with expected one-row readback before COMMIT:

```sql
BEGIN;
SELECT id,status,early_access_state FROM users WHERE id=:'user_id'::uuid FOR UPDATE;
UPDATE users SET early_access_state='invited',updated_at=now()
 WHERE id=:'user_id'::uuid AND status='active'
 RETURNING id,early_access_state;
-- Inspect exactly one intended row, otherwise ROLLBACK.
COMMIT;
-- To pause, use the same transaction with the literal state 'paused'.
```

Membership revocation is different: deny one existing workspace, not all future
workspaces. Lock the workspace row and all its membership rows in one operator
transaction; require another active Owner before revoking an Owner. Then set
`status='revoked', revoked_at=now()` only for the exact user/workspace currently
active. If it is the last Owner, pause the user globally while deciding custody;
do not leave a workspace accidentally ownerless. All manual membership writers
must use this procedure; no database last-owner trigger exists.

Verify fresh API reads, known asset/run IDs, report/history access, observation
POST and activation POST after pause/revocation. Paused users cannot self-activate;
revoked users cannot restore membership by login or changing workspace headers.
A globally active user may create a **new** workspace; pause/disable their user
too if the intended action is removal of all product execution. WorkOS logout
alone is not membership revocation. Re-admission is explicit, never email-domain
autojoin. Use readback and the app denial path after every operator change.

## 9. Read-only cohort operations

Run these only in an approved read-only DB session, with results restricted to
the founder/operator. No customer analytics endpoint. Fixed event names and
IDs are behavior records, not evidence. Counts are best effort, deduplicated
per user/object/action, not pageviews. `pdf_export_requested` does not prove a
PDF was saved. Feedback can exist even when its event was lost.

```sql
BEGIN READ ONLY;
SELECT name,count(*) AS object_actions,count(DISTINCT user_id) AS users
 FROM product_events GROUP BY name ORDER BY name;
SELECT surface,response,count(*) AS responses
 FROM product_feedback GROUP BY surface,response ORDER BY surface,response;
-- Bounded optional feedback review; treat comments as untrusted plain text.
SELECT user_id,workspace_id,run_id,surface,response,comment,created_at
 FROM product_feedback ORDER BY created_at DESC LIMIT 50;
COMMIT;
```

Compact cohort report (no hostname/source/email; select the 3–5 approved UUIDs
instead of all enrolled users when needed):

```sql
WITH cohort AS (
 SELECT id,early_access_state,early_access_activated_at FROM users
 WHERE early_access_state IS NOT NULL
), completed AS (
 SELECT initiated_by AS user_id,asset_id,created_at,
        row_number() OVER (PARTITION BY workspace_id,asset_id ORDER BY created_at,id) AS ordinal
 FROM runs WHERE status='completed'
), events AS (
 SELECT user_id,
   bool_or(name='asset_added') AS asset_added,
   bool_or(name='evidence_opened') AS evidence_opened,
   bool_or(name='report_opened') AS report_opened,
   bool_or(name='pdf_export_requested') AS pdf_requested,
   bool_or(name='source_json_downloaded') AS source_downloaded,
   bool_or(name='comparison_viewed') AS comparison_viewed,
   bool_or(name='deeper_review_clicked') AS deeper_review
 FROM product_events GROUP BY user_id
), runs_by_user AS (
 SELECT user_id,count(*) AS completed_runs,bool_or(ordinal>=2) AS second_run,
        count(DISTINCT (created_at AT TIME ZONE 'UTC')::date)>=2 AS returned_on_later_day
 FROM completed GROUP BY user_id
)
SELECT c.id,c.early_access_state AS current_state,
 c.early_access_state='invited' AS invited_pending,
 c.early_access_activated_at IS NOT NULL AS activated,
 coalesce(e.asset_added,false) AS asset_added,
 coalesce(r.completed_runs,0)>0 AS first_run,
 coalesce(e.evidence_opened,false) AS evidence_opened,
 coalesce(e.report_opened,false) AS report_opened,
 coalesce(e.pdf_requested,false) AS pdf_export_requested,
 coalesce(e.source_downloaded,false) AS source_json_downloaded,
 coalesce(r.returned_on_later_day,false) AS returned,
 coalesce(r.second_run,false) AS second_run,
 coalesce(e.comparison_viewed,false) AS comparison_viewed,
 EXISTS (SELECT 1 FROM product_feedback f WHERE f.user_id=c.id AND f.response<>'dismissed') AS feedback,
 coalesce(e.deeper_review,false) AS deeper_review
FROM cohort c LEFT JOIN events e ON e.user_id=c.id
LEFT JOIN runs_by_user r ON r.user_id=c.id ORDER BY c.id;
```

"Returned" here means completed observations on two UTC dates, not measured
login/visit retention. Same-day second runs appear separately. Shared-workspace
second-run ordinal describes the asset, not necessarily the same initiating
person. There is no invitation history timestamp: current pending state and
activation time cannot reconstruct every historical invitation. Reconcile
server runs and feedback with events; do not call absent telemetry absent use.

## 10. Ordered deployment and acceptance

All steps below require their named approvals; **none runs as part of this
audit**. Keep external users unenrolled until the final acceptance sign-off.

1. Approve hosting choice/cost, backup RPO/RTO/retention/operator, app exposure,
   production WorkOS and DB provisioning, secret custody, publication and
   deployment as distinct actions. Record private target coordinates separately.
2. Implement/review the missing app-specific artifact and protected deployment
   target. Preserve the web workflow/trust binding. Include app standalone
   server/static assets, shared report fonts/assets and traced runner dependencies;
   test migration-job packaging separately. Non-root runtime, no build tools,
   local configs or unrelated web integration credentials. Review image contents.
3. Freeze approved source SHA; no unreviewed branch deployment. Build Node 22
   with the exact lockfile and production public callback, run health, app DB/
   browser/public-check/PDF gates and security release review. Publish immutable
   source-labeled image; require the image scan policy and record SHA↔digest.
4. Provision approved DB/roles/volume, configure WorkOS and approved secret
   injection; rehearse migrations/restoration before any customer data exists.
   Take and verify the pre-release backup. Run the exact migration job, read back
   schema/checksums/grants. No successful app boot implies migration success.
5. Create approved DNS/TLS/proxy route to the app-only target. Verify external
   Host/scheme handling, no shared cache, trusted forwarding and graceful drain.
   Start one app process at the pinned digest. Record runtime source/image binding.
6. Health: GET `/` over HTTPS must render the intended login shell, not merely
   any HTTP 200. Same-origin unauthenticated `/api/workspace` must be 401;
   a 403 from wrong Host is **not** proof authentication works. There is no
   dedicated DB readiness endpoint; use operator DB readiness and authenticated
   workspace read. Ensure restart supervision and no boot-time migrations.
7. Sign in a controlled production identity with Google and, separately, OTP.
   Check correct URLs, host-only Secure/HttpOnly/Lax session, invalid/foreign
   sessions denied, callback replay/state mismatch rejected, logout/refresh and
   repeat login return the same internal UUID. Do not log OAuth secrets.
8. Admit that identity explicitly, create workspace, add an operator-controlled
   hostname **without collection**. Record authorization for exactly one initial
   observation. Require ten contract entries with truthful statuses/limitations,
   persisted source/digest and readable evidence/report. Undetermined is allowed
   where truthful; it must not become Clear/Needs attention by error handling.
9. Export A4 PDF from the saved run, verify all observations, meaningful final
   page/no blank trailing page, source appendix/digest, no site chrome and zero
   extra collection. Reuse deterministic long-evidence/attention fixtures for
   pagination; do not recollect merely to print.
10. Restart app, logout/login and confirm identical source/digest/IDs. After the
    cooldown explicitly authorize a second observation of that same controlled
    hostname. Require new run ID, first source unchanged, correct Environment
    versus Coverage comparison. Total live acceptance budget: two authorized app
    runs; any additional public run needs separate explicit scope.
11. With controlled A/B identities and Viewer membership, test known foreign
    workspace/asset/run/report IDs, Owner writes, Viewer denial, revoked denial,
    inactive/invited/paused behavior and direct API bypass attempts. Use actual
    runtime role and proxy. No fake browser-only authorization acceptance.
12. Read back activation/run/view/export/comparison events and contextual
    feedback; verify no evidence payload in telemetry and failed optional writes
    cannot break results. Confirm `/check` independently loads/replays/prints
    unchanged; saved-baseline CTA still never silently imports or runs.
13. Check desktop and 390px app, feedback, report, login/Ask public surfaces for
    overflow/collision. Physical-device software keyboard remains an explicit
    gap until tested. Inspect sanitized logs after synthetic errors. Complete
    timed off-host restore, restart and digest/authorization acceptance.
14. Operator signs off exact source/image/config, backup recovery result and
    remaining limits. Only then admit first external users and optionally release
    the public sign-in link. Contacting users is a separately authorized action.

## 11. Rollback and hard stops

| Failure | Smallest safe containment/recovery |
| --- | --- |
| Bad app release | Stop new execution/admission, drain bounded work, preserve DB/backups. Revert app-only image to recorded compatible digest. On first launch there is no older production app: keep maintenance/closed admission rather than deploy an unreviewed local ancestor. |
| WorkOS mistake | Close admission; restore known exact production redirects/client config from private approved record. Do not swap staging identity/client as a fallback. Cookie-secret rotation forces login; confirm same provider mapping afterward. |
| Migration failure | Do not launch. Transaction rollback should leave prior schema/ledger intact; verify that and backup. Diagnose on disposable restore, never delete ledger/checksum entries to force success. |
| Migration succeeded, app bad | Keep additive schema/data; roll back only to a demonstrated schema-compatible app. A pre-EA app lacks the EA gate and is **not** a safe fallback. Otherwise remain closed and fix in a separately approved lane. No destructive DOWN. |
| Collector/network regression | Block starts/stop app process if necessary; preserve sources and classify interrupted runs as unresolved until checked. Do not loosen private-target/redirect/TLS controls. Restore known compatible artifact/network configuration only after evidence. Public `/check` remains a separate service. |
| Serious authorization bug | Immediately isolate authenticated app traffic/execution; pause alone may not stop in-flight work. Preserve DB and sanitized diagnostics, rotate/revoke exposed sessions/credentials only through approved incident authority. Investigate known affected IDs. Do not reopen on a guessed patch. |

Hard launch stops: cross-workspace read/write succeeds; Viewer runs collection;
paused/revoked identity bypasses the intended gate; same production provider
subject becomes duplicate internal users; completed source mutates or fails
digest correspondence; unsafe destination reachable; wrong source/image; absent
backup or failed restore; bad HTTPS/cookies/redirects; secret-bearing logs;
missing production DB isolation; wrong runtime/migration role. Preserve evidence
before recovery. Never automatically overwrite the DB with an old backup and
discard newer customer runs. A maintenance outage is preferable to unsafe access.

## 12. Founder procedure and outstanding decisions

Before contact: identify the 3–5 people and intended authorized hostname/use
case; explain bounded observations, no signing/certification, manual reruns and
current capacity. Let each sign in and map the exact production subject before
manual invitation/activation; no email-domain enrollment. No messages are sent
by this runbook or the app cohort helper.

After access: verify sign-in/asset creation, then let the user operate with
minimal coaching. After first run inspect aggregate adoption and optional
feedback, recording only the concrete blocker. After a later rerun inspect
comparison use and requested next check. Respond through the existing approved
contact channel. Do not invent monitoring/SLA promises or add survey machinery.

Outstanding blockers: hosting/capacity decision; reviewed app-specific image and
deployment/migration job; production WorkOS Google/OTP and isolated secrets;
production DB/roles/TLS/volume; encrypted off-host backup and demonstrated
restore; real proxy/auth/egress acceptance; sanitized operational diagnostics;
named owner and approved recovery/data-request handling. RLS, distributed
quotas, abandoned-run automation, automatic retention/deletion and physical
keyboard acceptance remain unimplemented/unverified. Do not claim that green
local tests settle these operational gaps.

**Next smallest action:** authorize a read-only capacity and recovery-custody
check of the existing production environment to decide A versus B. It must
return resource headroom, app-only isolation/rollback feasibility and available
PostgreSQL/backup ownership, without provisioning or changing anything. Then
approve one bounded app artifact/deployment-target rehearsal; no customer launch
is ready before those prerequisites are resolved.
