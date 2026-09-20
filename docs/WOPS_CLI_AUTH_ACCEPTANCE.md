# Wops CLI authentication — Slice 4A

Local candidate only. No deployment, publication, collection, upload, signing or run creation. Base app commit: `a8530d3a4a42bbbd8fca89226c00e768d9238870`.

## Current web auth model

`/login` calls AuthKit `getSignInUrl`; `/callback` uses `handleAuth` with the configured base origin. AuthKit 4.3.1 owns PKCE/state, provider exchange and sealed cookie creation/refresh. `authenticatedWebSession()` checks `withAuth()`, rejects impersonation and requires an unrevoked provider session. `authenticatedIdentity()` remains the existing identity-only adapter.

`resolveIdentity()` maps `(provider, issuer, subject)` to the existing internal user. Email is only a verified display snapshot, never durable identity. Existing PostgreSQL users, Early Access, workspaces and memberships remain authoritative. `requireWorkspaceMembership()` checks current account/cohort/workspace/member state and locks the relevant rows. Owner and Viewer are existing roles.

Web sessions are not mirrored as tokens in PostgreSQL: AuthKit retains its sealed session; `revoked_sessions` persists local session revocation. Web logout checks Origin/Fetch Metadata, records revocation before cookie/provider sign-out, and does not delete product data.

## CLI auth flow

[WorkOS CLI Auth](https://workos.com/docs/authkit/cli-auth) supports OAuth device authorization and provider tokens. This slice instead uses an **application-mediated exchange**, not an implementation advertised as OAuth Device Authorization Grant. It reuses the existing cookie-authenticated adapter and workspace confirmation, without introducing provider bearer-token validation or storing provider tokens in the CLI.

1. `wops auth login` creates a bounded login transaction through `/api/cli/login`.
2. CLI displays a terminal code and opens the fixed `/cli/authorize` URL. The secret polling credential never appears in the browser URL or terminal output.
3. If needed, `/cli/login` starts normal AuthKit login with a fixed `/cli/authorize` return path. Existing callback PKCE/state handling applies. No user-controlled return URL is added.
4. Browser shows identity, workspace and role. The user manually enters their terminal code and explicitly confirms they initiated this sign-in. Codes sent by others must not be approved. Multiple workspaces require a selection; one selects automatically.
5. Authenticated browser POST binds the transaction once. The displayed internal identity must still equal the authenticated identity; membership is checked server-side.
6. Bounded CLI polling redeems once, issuing a separate opaque session credential. Only its hash is stored server-side.

Decline terminates the transaction. Closing the browser or interrupting the CLI leaves an expiring transaction, not an authorized product action. Lost redemption responses cannot be replayed: start a new login. Any unreceived credential expires within one hour.

## Identity binding

CLI sessions reference the same internal user resolved from the browser's provider identity. No CLI-only user, email-based identity, independent account database or alternative role system exists. The browser context includes internal references for server binding; normal CLI output does not display them.

## Workspace / role model

Each CLI session is fixed to the selected workspace. Current membership is checked on status; no local workspace field can override it. Owner→Viewer changes are reflected immediately. Removed membership, disabled account, paused Early Access or archived workspace denies use. Viewer may authenticate; no future Owner-only server-check right is granted here.

## Login transaction lifecycle

Migration `0009_cli_auth.sql` adds only `cli_login_transactions` and `cli_sessions`, with indexes and bounded field/state constraints. Existing migrations and run/evidence tables are unchanged.

Transactions have a 256-bit random device secret and 48-bit human code (three groups of four hex characters), both stored as SHA-256 hashes. Lifetime: ten minutes. States: pending → authenticated → redeemed, or pending → denied. Expiry is enforced at use time regardless of stored state; no scheduler is needed. Expired transactions are pruned during creation.

Row locks make binding/redemption atomic. Polling is limited to once per five seconds per transaction. Creation has a database-wide cap of 30 per minute and 1,000 retained unexpired transactions; the service permits eight concurrent requests per process. Small bodies reuse the existing 1 KiB / five-second bounded reader. Caps may require tuning before wider distribution; they do not promise protection from all volumetric denial of service.

## CLI session model

Opaque 256-bit random bearer credential, SHA-256 hash at rest, one-hour lifetime, no refresh token. Columns bind internal user/workspace and originating web issuer/session, with issued/expiry/revocation timestamps. The only permitted scope is `cli:session`.

Only `/api/cli/session` accepts this bearer credential: GET status, POST revocation. Existing product routes still require browser authentication and cannot be used with CLI credentials. Status returns a display identity, workspace name, current role, scope and expiry; it never returns internal UUIDs or provider identifiers.

## Local storage

Unpublished, dependency-free `@witnessops/cli` package exposes the `wops` bin. Repository invocation: `node packages/wops-cli/src/main.mjs auth login --server <local app origin>`; no installer or global installation is provided.

macOS uses the user's Application Support/WitnessOps-specific directory; Linux uses XDG config (or the user's `.config`) under `witnessops`. Directory 0700, auth file 0600, owner checks and no-follow reads. Native Windows secure-storage support is not claimed. File contains only server origin, credential and expiry. Writes use a private exclusive temporary file, fsync and atomic rename. A private exclusive lock serializes commands; after an interrupted process a stale lock may require deliberate removal once no command is running.

Network calls require HTTPS except explicit local `127.0.0.1` HTTP, reject redirects, use deadlines and bound JSON response bytes. Browser launch uses fixed executable arguments, never a shell. Tokens are not placed in argv, URLs, logs or normal diagnostics. Status contacts the server; an existing file alone never establishes an active session.

## Revocation

CLI logout revokes server-side, then removes the local file. Already absent/expired/revoked credentials are harmless. If offline, the local credential is removed and the command reports **unconfirmed server revocation**, with a nonzero exit; it does not claim remote logout succeeded. Malformed files receive the same bounded local cleanup warning.

**Web logout invalidates CLI sessions authorized by that particular web session**, through the existing durable `revoked_sessions` check on every CLI use/redemption. It does not revoke CLI sessions from unrelated web sessions. Account disablement and current membership/cohort/workspace checks provide central denial. Specific CLI credentials can be revoked independently.

Out-of-band provider revocation is not newly synchronized here: the existing app has no provider-event revocation synchronization. Operator revocation must use the existing durable local revocation/account controls; otherwise the CLI credential expires within one hour. Re-enabling a membership/account before expiry can restore eligibility unless the CLI or originating session was explicitly revoked.

## Security boundary

CLI authentication is not Local Audit signing authority. No signing key/provider token is read, copied or issued. No endpoint invokes collection, finalization, signing, upload or run creation. CLI package tests assert absence of those dependencies, and database/service tests prove its credential does not authenticate existing product routes.

Browser approval requires normal auth, same-origin POST, explicit terminal-code entry and confirmation. Existing anti-framing headers apply. No approval action occurs on GET, no code is accepted automatically from a URL, and no package public key or client-selected registry participates. Manual-code phishing remains a social-engineering risk; approve only a command initiated in your own terminal. No device/host identity authentication is claimed.

## Known limitations

- Internal fixture-backed browser/database/command acceptance is not production AuthKit or external-user acceptance.
- Runtime is a local Node 22 package, not a published CLI distribution or installer.
- Private filesystem storage protects against other ordinary OS users, not compromise of the same OS account/root; no OS keychain integration yet.
- No refresh token, resume of consumed redemption, or automatic stale-lock recovery.
- No provider-event synchronization; see revocation bounds above.
- Development processes retaining module singletons need restart after code changes. Migrations are explicit, never run at startup.
- The new migration is exercised only in isolated test schemas in this slice; other databases need the existing migration procedure before enabling this path.

## Future server check scopes

`server_check:create` and `server_check:upload_capture` are design candidates only. This slice grants neither. A subsequent authorized design must retain Owner checks, existing Local Audit capture and authenticated upload boundaries, and separately governed off-host finalization. Production signing keys remain off target. Nothing here changes or authorizes that future signing architecture.

## Acceptance

**READY FOR SERVER CHECK SLICE (design), technically accepted locally.** No production readiness or hosted-provider live sign-in is claimed.

The command demonstration uses disposable internal test identities through the actual service/store and CLI command implementation; hosted provider authentication is represented by the existing validated-identity test seam, not bypassed in production. It produced signed-in workspace/Owner status, server-confirmed active status, signed-out confirmation, then “Not signed in.” Replaying the retained old credential returned revoked. A separate subprocess test exercises the actual command entrypoint in an isolated home directory.

Validation with Node 22:

| Command | Result |
| --- | --- |
| `pnpm health` | PASS: 1,865 tests, zero failures across 13 reported groups, including 55 app tests and the original eight CLI tests; builds, lint, typechecks, route/receipt checks and docs validation passed. |
| `pnpm cli:test` (final test additions) | 10/10 PASS; includes real fetch redirect rejection and native command entrypoint. |
| `pnpm --filter @witnessops/app test:db:cli` | 17/17 PASS using isolated TEST_DATABASE_URL schemas. |
| `pnpm --filter @witnessops/app test:db` | 27/27 PASS. |
| `pnpm --filter @witnessops/app test:db:live` | 1/1 PASS, synthetic test signing only. |
| `pnpm test:app-browser` | Existing 65 regression cases passed; ten CLI cases passed. Two new CLI cases had ambiguous alert selectors matching the Next route announcer, not an application failure. |
| `pnpm exec playwright test --config tests/app-foundation/playwright.config.ts cli-auth.spec.ts` | Final narrowed selectors: 12/12 PASS, Chromium and WebKit. |
| `git diff --check` | PASS. |

Desktop and 390px authorization screenshots were inspected: identity/workspace/role, manual code, scope and explicit approval are readable and actions remain reachable. Screenshots remain private test artifacts, not committed.

Security diff review found one initial availability defect: retaining expired transactions could exhaust the issuance cap. Cleanup now removes expired transactions before capacity checks; a 1,000-expired-row regression passes. No unresolved findings remain in reviewed current source. The sealed review distinguishes its original snapshot from remediated source/test addenda; final test-only additions and these result counts are post-seal evidence.

No production credentials were used. No production/dev application database migration was applied: migrations ran only in disposable test schemas. No real collection, customer capture/upload, production signing, real run creation, installer, push, merge or deployment occurred. Existing regression suites use isolated fixture data.

## Hosted pilot-auth follow-up — 2026-09-20

The current CLI artifact candidate was exercised against the hosted app with two isolated local credential directories. In both cases, a user initiated `wops auth login`, entered the terminal code in the browser, gave explicit consent, and the already-polling CLI redeemed automatically. A second process confirmed persisted active status; the local directory and credential file were owner-only (`0700` and `0600`). Supported logout removed the local credential, and a follow-up session request returned `401 revoked`. The pre-existing default CLI configuration and browser session were not replaced or logged out.

One path reused an authenticated browser session. A second used an Incognito window; the user reported choosing Google authentication and receiving a Google security alert. No provider inbox or email one-time code was inspected, so this does not establish email-OTP delivery. The user reports that email login worked in an earlier test; that claim was not replayed here.

Both issued sessions reported `cli:session server_check:create`, including the auth-only follow-up where the optional browser selection was intended to remain off. The submitted selection state was not independently captured, so this is a review item rather than proof of a scope-escalation defect. No server-check endpoint, collection, upload or signing path was invoked.

This hosted follow-up establishes the browser-consent, polling, persistence, status, logout and server-revocation path for the tested candidate. It is not a production-readiness, provider-delivery or general-user acceptance claim.
