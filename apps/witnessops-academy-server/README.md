# Academy lesson server

This package is the Academy lesson server: Keycloak sign-in, server-side sessions, and owner-scoped drafts. It is not the authenticated product app.

## Interactive lessons

The two saved lesson routes now open a conversation: inspect evidence, make a
judgment, choose a simulated verification action, and record the final decision.
`?format=worksheet` preserves access to the previous forms and their existing
saved answers. The public static source remains the reference material; the
authenticated server provides the interactive experience.

Each learner receives a randomly seeded, versioned scenario on an explicit
Start lesson action. The seed, attempt identifier and decisions are stored in
the existing owner-scoped PostgreSQL draft table using the reserved
`chat-report-or-evidence` and `chat-same-scope` keys. The existing worksheet keys
are unchanged. No schema, grant, identity-provider or dependency change is
required. A GET only reads; it never allocates a scenario. Both website and MCP
resolve the owner through their existing authenticated identity and admission
checks before using the shared `chat-store.mjs` and `chat-engine.mjs`.

Variation changes the evidence and the supported conclusion: uploads can fail,
inventories can be incomplete, restores can pass or fail, and checks can refer
to a different environment, revision or tenant. This pilot is procedural
scenario generation with deterministic coaching, not a free-form model that
invents the assessment truth. Choosing a verification action reveals an
explicitly simulated result. It never runs an infrastructure operation.

An explicit decision POST uses the current attempt ID, stage, expected version
and request UUID. Compare-and-set writes reject stale submissions. Replaying
the exact request cannot advance twice, including after progress from the
other interface. The response can contain that newer current projection.
Unknown saved formats or versions are preserved and rejected for interpretation.
The complete prior decision history is retained. After twelve unresolved
decisions, the learner is offered one supported final choice with explicit
coaching; choosing it completes the exercise with `coached: true`. This is
practice completion, not a certification or a report about real infrastructure.

`/academy/connect/chatgpt` provides setup instructions for the existing `/mcp`
resource. It does not claim an installed plugin or a live accepted connection.
The MCP adds `start_lesson`, `resume_lesson`, `inspect_evidence`,
`submit_decision` and `get_progress`, retaining the four worksheet tools.
Starting/submitting are accurately marked as writes. Ship the Academy server
and MCP source together so both use the same evaluator version.

`pnpm academy:test` covers generation, transcript reconstruction, preserved
worksheet records, owner isolation, conflicts/replays, HTTP-handler boundaries,
the actual MCP SDK in-memory transport, and browser-controller behavior.
Those tests use synthetic database/session adapters; they do not replace the
disposable PostgreSQL/Keycloak/browser journeys or an installed ChatGPT test.
The existing browser journeys explicitly open worksheet mode for their original
acceptance checks. The separate `test/chat-browser-e2e.mjs` and
`../witnessops-academy-mcp/test/chat-e2e.mjs` journeys exercise chat through real
Chromium, Keycloak, PostgreSQL and MCP HTTP in the existing disposable CI job.
They require `ACADEMY_E2E=1`, `ACADEMY_CHAT_DISPOSABLE=1`, the explicit
`session-only` fixture and loopback service addresses. They cover separate
learners, browser return, service restart and website-to-MCP progress for the
same identity, preserving worksheet records. Their sanitized evidence stays in
the existing CI evidence directory. These fixtures do not establish an installed
ChatGPT connection or production acceptance; those remain separate checks.

## HTTP and TLS

Plain `http://` is accepted only for a loopback listen address and a loopback public origin. That is the local development mode.

An `https://` public origin does not mean this process terminates TLS. Run that mode behind a TLS-terminating proxy. The proxy should connect to a loopback listen address unless you have a separate reason to bind elsewhere.

## Client address

`ACADEMY_TRUSTED_PROXIES` is a comma-separated list of proxy socket addresses. The server reads `X-Forwarded-For` only when the connecting socket is one of those addresses. It walks that header from right to left, skips trusted proxies, and uses the first remaining hop that `net.isIP` accepts. An invalid hop, or a socket that is not a trusted proxy, uses the socket address. An empty list, the default, never trusts the header. The per-client rate-limit map has a fixed cap and drops the oldest entries when it is full.

Login attempts are limited per client address. A limited response includes `Retry-After` set to the remaining seconds in that client's window.

## Login cookie

`ACADEMY_PREAUTH_KEY_FILE` (or a credential named `academy_preauth_key`) holds the secret used to seal the login cookie. The secret must be at least 32 bytes. The cookie is encrypted and authenticated, expires after 5 minutes, and can be used once. A replay or an expired cookie is rejected. The server keeps only a small, time-limited set of used cookie ids.

## Request bodies

A draft body larger than the accepted JSON worst case is answered with `413`. The server then stops reading the rest of that body.

## Keycloak

The lesson server checks access tokens by calling Keycloak token introspection. The realm config in `keycloak/academy-realm.json` adds an audience mapper on the `academy-app` client so issued access tokens include `academy-app` as an audience. Without that mapper, introspection does not establish that the token was intended for this client.

`ACADEMY_TOKEN_KEYRING_FILE` is required for the encrypted server-side token bundle;
see [A3](SESSION-TOKEN-PROTECTION.md) before running migrations or changing keys.
The MCP runtime uses `ACADEMY_MCP_DB_USER` (default `academy_mcp`) and
`ACADEMY_MCP_DB_PASSWORD_FILE`, separately from the lesson app role/secret.
Its reconciled grants exclude all session tables, DELETE and DDL.
Other secrets use the same `*_FILE` or `CREDENTIALS_DIRECTORY` rule as the rest of this package. Migrations are run explicitly with `scripts/migrate.sh`. The app does not migrate on startup.

## Production deployment checklist

This checklist is source guidance for a later operator review. It does not authorize deployment.

### I12. Academy client

The production Keycloak `academy-app` client must set exact `redirectUris`. Wildcard redirect URIs are not acceptable. Set the client attribute `pkce.code.challenge.method` to `S256`. The audience mapper that adds `academy-app` to the access token must be present. That mapper is recorded in `keycloak/academy-realm.json`.

### I9. One process

Pre-auth single-use and the login limiter are process-local. A cookie used on one process can still be presented to another, and the limiter does not share its counters. Check this before running more than one replica.

### I11. Forwarded client address

The proxy must always overwrite `X-Forwarded-For`, or append `$remote_addr` to it, before the request reaches the server. The server reads that header from the right, and only when the connecting socket is listed in `ACADEMY_TRUSTED_PROXIES`.

## A4: one lesson journey

The existing Report or evidence? and Same record, wrong scope? lessons render
at `/academy/learn/report-or-evidence` and `/academy/learn/same-scope`. Each set
of three public aliases redirects to its own saved lesson. Login returns to the
selected allowlisted lesson; URL parameters cannot create other return targets.
Drafts keep the existing `(owner_id, lesson_id)` key, without a migration or any
rewrite of existing progress. The server snapshots the same public files at startup; ship both
Academy packages at the same revision and restart after a source change.
The standalone static preview remains an unsaved preview.

On 14 November 2026 the owner explicitly selected **Keycloak to replace WorkOS
AuthKit for Academy**. Academy uses only the existing `(iss, sub)` identity and
PostgreSQL drafts. Product-app WorkOS authentication is outside this decision.
No provider, client, account or production configuration is changed by A4.

The browser loads before enabling edits, saves partial answers plus pasted
feedback and earlier attempts, and resumes on a new visit or fresh login.
It uses the existing CSRF token, session-derived owner, expected version and
save-request UUID. A network retry reuses the same request. A conflict leaves
edits available to copy and requires reloading before another save. Unknown
saved formats (including MCP text) are displayed as text; replacing them with
the lesson form needs an explicit choice. No learner text goes into HTML,
URLs, localStorage, sessionStorage or logs. Cached-page returns revalidate.
Draft content still has the API's 32 KiB cap; oversized work is never truncated.

Run service-free checks with `pnpm academy:test`. Against the existing disposable
CI stack, run `ACADEMY_E2E=1 node apps/witnessops-academy-server/test/browser-e2e.mjs`
from the repository root (after the HTTP probes and an app restart to reset the login limiter).
The browser runner uses Chromium; `ACADEMY_TEST_BROWSER_EXECUTABLE` optionally
selects an already installed binary. It writes only synthetic result summaries,
not credentials, tokens, cookies, traces or raw page HTML.

See [the complete unapplied Academy proxy candidate](ROUTING-A4.md) and
[the reviewed custody/cutover plan](CUTOVER-PLAN.md). Source completion is not
production acceptance. [A3 token protection](SESSION-TOKEN-PROTECTION.md) and
[the #573 reconciliation review](SECURITY-A3-RECONCILIATION.md) describe the
combined source changes, explicit cutover, rotation, rollback limits and remaining
operator acceptance. No production cutover or key provisioning has been applied.

## Self-service accounts

`/academy/account` is a public account entry page. An existing WitnessOps account
can sign in and reach Community and support without an Academy pilot grant.
The page reads the current grant before offering saved lessons; registering an
identity never creates a grant or changes the four-person pilot limit.

Public account creation is off by default. `ACADEMY_SELF_SERVICE_REGISTRATION`
accepts only `true` or `false`; unknown values stop startup. When explicitly
enabled, the page offers Create account at `/academy/auth/register`. Keycloak
26.8.2 supports registration through its ordinary authorization endpoint with
`prompt=create`; the deprecated `/registrations` endpoint is not used. The same
state, nonce, S256 PKCE, exact callback and encrypted single-use preauth context
are retained. Registration requests the `email` scope and requires a boolean
`email_verified=true` claim before creating an Academy session. The fixed return
destination is the account page. No password or verification token is handled
by Academy, and no arbitrary return URL is accepted.
This check covers the explicit Academy registration intent; it does not replace
the realm's required verification flow or enforce access for other clients.

Enabling the Academy flag alone does not enable safe public signup. The operator
must first accept the Keycloak registration flow, verified email delivery,
password recovery delivery and abuse controls for the intended realm, with
exact client redirect URIs and S256 unchanged. No live realm setting, mail
provider or access policy is changed by this source. The existing realm fixture
also remains closed by default. See the [versioned Keycloak registration
guidance](https://www.keycloak.org/docs/26.8.2/server_admin/#_user-registration).

`test/registration-journey-e2e.mjs` is a separate real browser acceptance phase in
the existing disposable Academy CI stack. It requires `ACADEMY_E2E=1`,
`ACADEMY_REGISTRATION_DISPOSABLE=1` and the `approved-free-pilot` fixture policy.
It captures only synthetic verification/recovery mail in memory, follows the
real Keycloak flow, and checks the account landing, stable identity and denied
lesson access without a grant. It restores the fixture's realm and application
settings and removes its own synthetic accounts. Passing this phase does not
establish live mail delivery or authorize public registration.

## Owner-approved initial free pilot

Academy remains a paid programme; the owner approved an initial group of one to
four learners free. The new server defaults to `ACADEMY_ACCESS_POLICY=approved-free-pilot`.
Sign-in alone does not grant access. Both saved lessons and their draft endpoints
require an unrevoked Academy pilot grant. Unknown policy values stop startup;
missing migration `004_academy_pilot_invitations` also stops the admitted profile.
The MCP server uses the same default policy and rechecks admission on every tool
invocation, including existing sessions. All nine tools require an active grant;
unavailable grant status fails closed. Its database role can execute only a
boolean admission predicate. MCP database acquisition/connection, client responses
and PostgreSQL statement execution each have a five-second limit; failed pooled
queries remove their connection. These are per-operation limits: identity lookup
and the grant check run sequentially, rather than sharing one five-second request
deadline. Stalled checks return `access_unavailable` without invoking the tool.
The database role has no direct invitation/grant table access or
rights to issue, redeem or revive access. Repeatable privilege reconciliation
retains that narrow predicate permission. The legacy reference curriculum remains
limited to the mapped Report or evidence? worksheet. The interactive MCP catalog
includes both saved lessons through the shared scenario engine; it does not
export another static reference entry.
The explicit `session-only` compatibility profile exists for earlier regression
fixtures and is not an accepted launch access policy.

Invitations name an exact Keycloak issuer and subject, expire within seven days,
and are consumed atomically into a fixed learner-only `approved_free` grant.
They grant neither administrative nor community access. Existing identities and
drafts are unchanged. The application can only preview/redeem invitations and
read grant status; only the operator role can create or revoke them. Revoking an
invitation and revoking granted access are separate actions. Revocation retains
saved work and prevents subsequent lesson/draft reads and writes.

The captured-email helper defaults to validation only:

```sh
node apps/witnessops-academy-server/scripts/prepare-pilot-invitations.mjs --help
```

Its apply mode accepts only an explicitly disposable loopback database, private
files and `.invalid` captured recipients. It does not send email. The invitation
bearer is delivered in a URL fragment, immediately removed from browser history,
then sent in a same-origin POST or encrypted PKCE login context. No token or
learner ID in a query string establishes access. Opening an invitation through
the correct account is required; a reused link cannot create another grant.
An operator must identify the real initial recipients and sender before any
separately authorized real invitation is issued or delivered.

Run `test/pilot-invitations-e2e.mjs` and `test/pilot-journey-e2e.mjs` directly with
Node 22 only against the disposable CI profile, setting both `ACADEMY_E2E=1`
and `ACADEMY_INVITATIONS_DISPOSABLE=1`. The PostgreSQL suite checks actual locking,
privileges, expiry, revocation and preservation. The browser journey uses two
synthetic learners, captured email, real Keycloak, saves, fresh login and restart.
These are separate from service-free `pnpm academy:test`.

No live checkout is included: payment provider, price/currency, access term,
cancellation/refund rules and invoice workflow remain owner decisions. The free
pilot does not imply a zero-priced public product or automatic enrollment.
Community sign-in, private room admission and removal remain a separately
verified integration; an Academy grant currently grants no chat membership.

`ACADEMY_COMMUNITY_URL` optionally configures the existing community entry point.
It accepts HTTPS, or loopback HTTP for isolated tests, without credentials, query
parameters or fragments. Signed-in lessons and invitation/admission pages open it
in a separate tab to retain unsaved work. Community navigation does not require
an Academy course grant; lesson and draft access still do. No Academy token is
forwarded. This navigation alone is not proof of SSO or room admission; the
community must enforce its own verified identity, persisted room membership,
exclusion and operator removal. The disposable journey
exports sanitized actual PostgreSQL grant states for attended community acceptance.

Invitation pages use `Referrer-Policy: same-origin` so native form POSTs retain
their exact Origin. Other server responses retain `no-referrer`. The invitation
controller removes the fragment before submission. Origin and CSRF checks remain
strict. Run the isolated native-form browser regression after installing Chromium:

```sh
ACADEMY_INVITATION_BROWSER=1 node apps/witnessops-academy-server/test/invitation-entry-browser.mjs
```

This regression uses actual HTML/controller/header policy and a synthetic loopback
receiver. It proves native form/header behavior, not external identity integration.
The separate two-learner Keycloak/PostgreSQL journey still verifies the full flow.
