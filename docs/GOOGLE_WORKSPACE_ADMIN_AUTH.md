# Google Workspace Admin Authentication

This handoff covers the operator-owned Google Workspace OIDC configuration for
the WitnessOps admin console. It does not authorize a deployment, secret
change, Google Cloud change, or production rollout by itself.

## Google Cloud configuration

Configure one OAuth web application with the following settings:

- Application name: `WitnessOps Admin Console`
- Audience: Workspace-internal is recommended when the organization supports
  it. An external audience does not replace the server-side Workspace-domain
  and operator-email checks.
- Production redirect URI:
  `https://witnessops.com/api/admin/google/callback`
- Local redirect URI:
  `http://localhost:3001/api/admin/google/callback`
- Local support is limited to that exact loopback host in nonproduction. Do not
  register or use a LAN, mesh, preview, forwarded, or wildcard local redirect.
- Scopes: `openid`, `email`, and `profile` only.

This integration does not use the Google Admin SDK, domain-wide delegation,
Google Groups, group membership, service-account impersonation, refresh-token
offline access, or broader Google API scopes.

## Runtime configuration and custody

The server reads exactly these five values as one all-or-nothing configuration
set; a missing, blank, partial, malformed, or duplicate-bearing set fails
closed:

- `WITNESSOPS_GOOGLE_OIDC_CLIENT_ID`
- `WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET`
- `WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI`
- `WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN`
- `WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST`

`WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST` is a comma-separated list of the
individual operator email addresses allowed to enter the admin console. The
Workspace domain and explicit email allowlist are both enforced; neither one
replaces the other.

Keep the client secret and all other server-only values in the existing
Kubernetes secret custody named `witnessops-web-admin-oidc`. Do not place real
values in Git, build arguments, browser-visible environment variables, command
transcripts, screenshots, or validation receipts.

The checked-in production manifest at `deploy/k8s/deployment.yaml` currently
does not reference `witnessops-web-admin-oidc`; the mesh-dev manifest does.
That source observation does not prove the live production wiring. Before any
rollout, an operator acting under deployment authority must verify the secret
reference on both live deployments without reading or recording secret values.
Do not correct the manifest or live workload as part of an authentication-only
source lane.

## Verification procedure

Perform these checks only after the Google application, secret custody, source
change, and deployment have each received their required authority:

1. Confirm the Google application name, audience, exact redirect URIs, and
   three scopes against the settings above. Confirm that no Admin SDK,
   delegation, group, offline-access, or broader scope is enabled.
2. Inspect only Kubernetes deployment metadata and confirm that both
   `witnessops-web` and `witnessops-web-dev` reference
   `witnessops-web-admin-oidc`. Do not print, decode, or copy the Secret data.
3. Confirm all five environment-variable names are present together in the
   authorized secret custody. Verify presence only; do not put their values in
   the test record. A partial set is not a supported rollout state.
4. Before deployment, run the repository's focused mocked-provider tests and
   retain only their pass/fail result. They must prove exact Google issuer and
   single-client audience checks, signed-token and expiry rejection, required
   stable `sub`, state, nonce, PKCE, verified email, Workspace domain, explicit
   email allowlist, bounded provider errors, and one-time code handling. Do not
   use live tokens or record claims for these negative cases.
5. In a clean unauthenticated browser, request `/admin` and confirm it redirects
   to `/admin/login`. Confirm the login page names Google Workspace as the
   primary path and does not expose configuration details.
6. Start sign-in from the login page. Confirm the browser is sent to Google's
   authorization endpoint with the configured client identifier, the exact
   callback URI, `openid email profile`, and non-empty state and nonce values.
   Confirm no client secret appears in the URL or browser storage.
7. Complete sign-in with an already-authorized Workspace operator. Confirm the
   callback returns to `/admin`, or to a requested relative `/admin` descendant,
   establishes the existing secure admin session identified by Google's exact
   issuer and stable `sub`, and does not expose the authorization code, ID
   token, state, nonce, or raw provider errors in the rendered page, URL, logs,
   or receipt. Confirm external, protocol-relative, backslash-bearing,
   control-character, and non-admin return paths fall back to `/admin`.
8. In separately authorized negative checks, confirm that a non-Workspace
   account, a mismatched Workspace domain, an email absent from the explicit
   allowlist, a missing or unverified email claim, and invalid state or nonce
   each fail without issuing an admin session.
9. Confirm an unauthenticated protected admin API still returns `401`, an
   authenticated Google OIDC session retains the existing `oidc_session`
   boundary, and logout expires the admin session plus the Google and Microsoft
   transaction cookies using their established paths and cookie attributes,
   then returns to the login page.
10. Repeat the authorized happy-path and negative boundary checks on each
   deployed lane. Record only status, redirect destination, cookie attributes,
   and bounded outcome labels; never record credentials, cookies, tokens,
   claims, or full operator addresses.

The verification is incomplete if the live secret reference, callback, denied
identity cases, protected-route boundary, and logout behavior have not all been
observed through the stated mechanisms.

## Rollback

Rollback is an operator-authorized source and deployment action, not a browser
workaround. Restore Microsoft as the primary login path through the approved UI
and source rollback, then validate its existing callback and session boundary.
Leave Microsoft credentials, the legacy-key material, and the admin session
signing secret intact. Do not rotate the session secret as routine rollback.

Remove or disable the five Google configuration values only under explicit
operator and secret-custody authority, after the Microsoft primary path is
restored and verified. Do not delete shared Kubernetes secret custody, mutate
legacy authentication, or revoke unrelated Google Workspace access as part of
this rollback.
