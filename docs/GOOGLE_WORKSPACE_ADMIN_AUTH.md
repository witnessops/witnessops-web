# Google Workspace Admin Authentication

The WitnessOps admin console accepts Google Workspace OIDC as its only
production authentication method. Microsoft OIDC and legacy-key routes are not
part of the active application surface.

## Google Cloud configuration

Configure one OAuth web application:

- Application name: `WitnessOps Admin Console`
- Audience: Workspace-internal, when the organization supports it
- Authorized redirect URI:
  `https://witnessops.com/api/admin/google/callback`
- Scopes: `openid`, `email`, and `profile` only
- Response mode: `form_post`

The callback is POST-only so the authorization code and state do not enter the
request URL or ordinary edge access logs. Plain-HTTP local Google callback is
not supported because the cross-site transaction cookie requires
`SameSite=None; Secure`.

The integration does not use Google Admin SDK, domain-wide delegation, Google
Groups, group membership, service-account impersonation, refresh tokens,
offline access, or broader Google API scopes.

## Runtime configuration and custody

The server requires the existing admin signing secret plus all five Google
values:

- `WITNESSOPS_ADMIN_SECRET`
- `WITNESSOPS_GOOGLE_OIDC_CLIENT_ID`
- `WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET`
- `WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI`
- `WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN`
- `WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST`

The Google configuration is all-or-nothing. Missing, blank, partial, malformed,
or duplicate-bearing configuration fails closed. The redirect URI must exactly
match the production URI above. The allowlist is a comma-separated list of
individual operator email addresses; Workspace-domain membership alone does
not authorize access.

Keep these server-only values in the established Kubernetes secret custody.
Do not place real values in Git, build arguments, browser-visible variables,
screenshots, logs, or test fixtures. `WITNESSOPS_ADMIN_SECRET` signs the Google
transaction and the versioned Google admin session; it is not a legacy login
credential.

Google authenticates identity. The existing `WITNESSOPS_ADMIN_ROLE` remains an
environment-wide authorization setting, so all allowlisted operators receive
the same effective WitnessOps role. The configured role is captured in the
signed WitnessOps session at login and is never derived or elevated from Google
claims. Changing the configured role requires operators to sign in again.

## Operator verification

1. Confirm the application name, internal audience, exact production redirect
   URI, and the three scopes above in Google Cloud. Confirm no broader scope,
   offline access, Admin SDK, delegation, or group lookup is enabled.
2. Confirm both live deployments reference the established admin OIDC secret
   by name and that all six required variable names are present. Verify names
   only; do not print or decode values.
3. Run the mocked-provider authentication suite and the full Node 22
   `pnpm health` check on the exact combined tree being deployed.
4. Confirm unauthenticated `/admin` redirects to the canonical
   `https://witnessops.com/admin/login` URL and the page exposes only Google
   Workspace sign-in.
5. Start sign-in and confirm Google receives the exact callback URI,
   `openid email profile`, `response_mode=form_post`, state, nonce, and PKCE
   S256. Confirm no client secret or authorization code appears in a URL.
6. Complete one sign-in using an already-authorized allowlisted Workspace
   operator. Confirm the callback POST returns to `/admin` or a sanitized
   relative `/admin` descendant and creates a versioned session bound to the
   exact Google issuer and stable `sub`.
7. Confirm an external return URL, wrong issuer, wrong audience, bad signature,
   missing or bad state/nonce, unverified email, wrong Workspace domain, and
   non-allowlisted email all fail without a partial session.
8. Confirm protected routes reject a previously signed Microsoft or legacy-key
   session. Confirm logout clears the admin session and Google transaction
   cookie and returns to the canonical login URL.
9. Inspect edge and application logs using sanitized metadata only. New real
   callbacks must be POST requests with no query string, and neither layer may
   log request bodies, cookies, codes, tokens, state, nonce, or email claims.
10. Repeat the same checks on each authorized deployment lane. Browser-level
    success remains unverified until the full Google round trip is completed by
    a human operator.

## Rollback

Rollback uses the recorded pre-cutover image or source commit, followed by its
full authentication test and deployment smoke. Retain the prior Microsoft and
legacy credential material in secret custody, inactive and unreferenced, until
the Google-only path has completed human production verification. Do not
rotate `WITNESSOPS_ADMIN_SECRET` as part of routine rollback.

After Google-only verification and separate secret-custody approval, remove
`WITNESSOPS_ADMIN_KEY_HASH` and all `WITNESSOPS_ADMIN_OIDC_*` values from active
runtime custody. Once those credentials are retired, image-only rollback is
insufficient; the approved fallback credentials must also be restored before
the prior image can authenticate.
