# Microsoft Entra admin sign-in

Status: `PUBLIC_BOUNDARY_ONLY`

Phase 1 adds Microsoft Entra ID as a second admin sign-in provider beside Google Workspace. Google remains the default. Entra is off unless `WITNESSOPS_ADMIN_ENTRA_ENABLED` is exactly `1`. Unset, empty, `true`, `yes`, and every other value leave it off.

This does not add a password. It does not replace Google. An operator can still sign in with Google Workspace when Entra is enabled, so Google stays available if Entra is misconfigured or later turned off.

## Flag and environment names

No values belong in this repository. The runtime names are:

- `WITNESSOPS_ADMIN_ENTRA_ENABLED` — exact `1` enables the button and the Entra routes
- `WITNESSOPS_ENTRA_OIDC_TENANT_ID` — single directory tenant GUID
- `WITNESSOPS_ENTRA_OIDC_CLIENT_ID` — application client GUID
- `WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET` — confidential client secret
- `WITNESSOPS_ENTRA_OIDC_REDIRECT_URI` — must be exactly `https://witnessops.com/api/admin/entra/callback`
- `WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST` — comma-separated object-id GUIDs

`WITNESSOPS_ADMIN_SECRET` still signs the transaction cookie and the admin session cookie. `WITNESSOPS_ADMIN_ROLE` still selects the session role, the same way it does for Google.

The login page reads the flag on each request. The page is not frozen at build time, and the flag check uses a computed environment read so a later process start can see the value.

Missing, partial, or invalid Entra configuration fails closed. The start route redirects to `/admin/login?error=entra_not_configured` and does not describe which setting failed. Logs use fixed diagnostic codes only.

The personal Microsoft account tenant `9188040d-6c67-4c5b-b112-36a3a6521ec5` is rejected as a configured tenant and as an ID-token `tid`. Sign-in is single-tenant.

## Why the allowlist is the object id

Authorization uses the `oid` claim, after the ID token signature, issuer, audience, tenant (`tid`), nonce, and expiry checks succeed. `email` and `preferred_username` are mutable and are not an admin allowlist. A token with an allowed-looking address and a missing or unlisted `oid` is rejected.

The ID token issuer must be `https://login.microsoftonline.com/<tenant>/v2.0`. The authorize and token calls use that tenant's v2 endpoints (`/oauth2/v2.0/authorize` and `/oauth2/v2.0/token`) with PKCE S256, `nonce`, `state`, and `response_mode=form_post`. Keys come from `https://login.microsoftonline.com/<tenant>/discovery/v2.0/keys`.

## Session compatibility

Existing Google session cookies stay version 3 and keep working. Entra issues a version 4 cookie with `identityProvider: "microsoft"` and actor `oidc:https://login.microsoftonline.com/<tenant>/v2.0#<oid>`. A version 4 cookie whose provider, issuer, and actor disagree is rejected. While the flag is not exactly `1`, a Microsoft session is not admitted. Logout can still tombstone that cookie.

## Logout and rollback

Logout is local. It clears the admin session and both OIDC transaction cookies. Phase 1 does not call the Entra end-session endpoint. The site content-security-policy uses `form-action 'self'`, which can block a browser form or navigation to the identity provider on logout. An end-session redirect is a later change, not part of this slice.

Rollback: unset `WITNESSOPS_ADMIN_ENTRA_ENABLED` and restart the process that reads the environment. The login page returns to Google only, Entra start fails closed, and existing Entra sessions stop being admitted. Google sessions are unchanged. Turning the flag back on re-admits an unexpired Entra session that was not revoked.

## What this slice does not do

It does not register an Entra application, set environment values, change deployment manifests, or authorize a directory. A passing local test is not a production identity-provider round trip. Credential rotation and production publication stay separately authorized.
