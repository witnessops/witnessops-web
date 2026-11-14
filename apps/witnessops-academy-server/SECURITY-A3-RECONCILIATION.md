# A3 and PR #573 reconciliation review

Scope: source review and fixes on draft PR #575. Inputs: A4 commit
`fd70b11f032842eb06700fcc05d2243bf625196f` and #573 head
`1346c2fb9e166f764bd2bb0e41494ff1a26c55a0`. No PR merge, production deployment,
provider/account change or production migration is performed. This is an agent
source review, not independent human acceptance or an external security audit.

## Addressed findings

1. **High — reusable identity-provider credentials in database plaintext.**
   Session insertion and refresh persisted ID/access/refresh tokens directly.
   A database read or leaked dump could expose credentials. A3 now stores an
   AES-256-GCM bundle with row/identity/issuer/client binding, a separate strict
   file-backed keyring, active/retained key support, no plaintext fallback and
   a database constraint/startup gate. See [the cutover and rotation contract](SESSION-TOKEN-PROTECTION.md).
2. **Medium — stale JWKS outage status changed invalid-token semantics.**
   #573 used the last HTTP JWKS status for every later JWT verification failure.
   After a 5xx, a bad signature could receive 503 instead of the required 401.
   Only a JWKS generic-response error uses that status; invalid-signature errors
   stay 401. The regression includes a prior 503 status.
3. **Medium — repeated MCP reconciliation did not reset role attributes.**
   #573 stripped memberships and direct object grants, but role attributes such
   as CREATEDB/BYPASSRLS/INHERIT survived a later migration-only reconciliation.
   Reconciliation now restores all non-admin attributes as well. The disposable
   privilege probe deliberately drifts these attributes before reconciliation
   and checks the effective runtime denials afterward.

## Reconciliation decisions

#573 source changes are incorporated into #575, keeping A4's actual lesson
controller rather than restoring the old stand-in form. The unedited A4 form
keeps Save disabled; its handler also rejects an unedited/no-pending save.
Both API and MCP reject empty strings and lone UTF-16 surrogates. Unknown saved
text remains protected by A4's explicit replacement choice.

Retained #573 changes include outage semantics, schema lint, saved-text-as-data
wording, status-only MCP health, exact metadata routing, issuer/subject session
limits, and the dedicated least-privilege MCP database role. CI combines schema
lint, browser acceptance and the explicit A3 cutover with the existing suites.
The source proxy example excludes the deprecated bare metadata route; no active
proxy configuration is changed.

#573's branch and draft status are left unchanged. It must not be applied again
as a separate overlapping change without reviewing the combined #575 result.

## Remaining operator checks

Review the combined draft, then validate the complete candidate reverse-proxy
configuration without applying it. Verify production Keycloak exact redirects,
S256/audience settings, database roles, new key custody and the explicit cutover
plan under a separate apply authorization. Production state and authenticated
production acceptance remain unknown. Process-local login/preauth controls still
require one app process; no multi-replica readiness claim is made.

The existing MCP A6b probe still records the provider behavior that an unexpired
access token can become active again when a disabled user is re-enabled without
ending its Keycloak sessions. #572 identifies sticky revocation as separate C2
work. This reconciliation does not invent a new revocation authority or claim
that C2 is closed; the lesson app's locally revoked sessions remain denied.
