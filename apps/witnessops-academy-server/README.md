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
