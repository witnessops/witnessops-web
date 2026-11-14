# Academy lesson server

This package is the Academy lesson server: Keycloak sign-in, server-side sessions, and owner-scoped drafts. It is not the authenticated product app.

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

The existing `witnessops-academy/public/lessons/report-or-evidence/` content is
rendered at `/academy/learn/report-or-evidence`. All three public lesson aliases
redirect there. The server snapshots the same public files at startup; ship both
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

See [the unapplied A4 routing proposal](ROUTING-A4.md). Source completion is not
production acceptance. A3 token-at-rest protection and the independent review of
PR #573 remain release-readiness work, outside this integration.
