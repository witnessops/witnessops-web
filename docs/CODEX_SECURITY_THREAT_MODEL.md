# Codex Security Threat Model — witnessops-web

Status: `repo_prep_seed_for_codex_security`

This document is a repository-specific seed for Codex Security review and GitHub PR review. It is not a vulnerability report, not a scanner result, and not release authorization.

## Scope

This repository contains source for the public WitnessOps website, the
authenticated product app, the CLI and their shared packages:

- the Next.js application under `apps/witnessops-web`
- the `/verify` route
- the `/api/verify` route
- the receipt-first verification package used by this public surface
- public copy, route parity, buyer-path smoke checks, and local health checks
- `apps/witnessops-app`: accounts/workspaces, membership, checks/imports, saved
  evidence, report sharing, sandbox seat billing and documentation Help
- `packages/wops-cli` and the app-mediated authorization, capture and finalization
  implementation; shared packages and app build/acceptance tooling

These are source-review targets, not assertions of production enablement or
completed acceptance. Read the [app README](../apps/witnessops-app/README.md) and
[app API contract](../apps/witnessops-app/src/lib/api-contract.ts) at the reviewed
commit. Historical acceptance notes and deployed state must not be inferred from
this seed.

## Out of scope

Review of this source does not establish or authorize:

- separate private control-plane, mesh or OffSec systems
- arbitrary customer workflow execution or production collection
- custody or use of production signing keys, customer data or credentials
- changes to canonical receipt/proof contracts owned outside this repository
- deploy approval, release approval, live billing or public claim approval

The app's authorized import, evidence storage and server-check/finalization code
is in review scope. Production authority and operational custody are separate;
do not exclude defects in that code just because its operation involves private
evidence. Keep the public `/verify` and `/api/verify` receipt-only boundary intact.

## Authority boundaries

- `main` in `witnessops/witnessops-web` is the code authority for these repository implementations.
- `pnpm health` is the deterministic local validation command for this repo.
- `docs/DEPLOYMENT_AUTHORITY.md` is the deployment-authority classifier for this repo.
- Azure ACA material is retired and archived; it must not be treated as active deploy authority during review.
- Codex Security may identify findings and suggest patches.
- Codex Security findings do not authorize merge, deploy, verification-claim changes, or release.
- Human maintainer review remains required for changes that affect security, verifier behavior, receipt semantics, public claim language, or deployment posture.

## Primary entry points

Treat the following as first-class review surfaces:

1. `/verify`
   - public receipt paste/upload flow
   - user-facing verification result rendering
   - failure-state language shown to users

2. `/api/verify`
   - public programmatic receipt verification path
   - request-body parsing and validation
   - deterministic response shape and error handling

3. `packages/proof`
   - receipt-first verification helpers used by the web surface
   - parser and normalisation behavior
   - fixture and smoke-test expectations

4. Public smoke and route-parity checks
   - `tests/route-parity/`
   - `tests/receipt-smoke/`
   - `tests/public-smoke/`
   - `scripts/smoke-buyer-path.ts`

5. Active deployment-adjacent config
   - `apps/witnessops-web/Dockerfile`
   - package scripts and workspace build configuration
   - environment examples that shape runtime expectations

6. Retired deployment archive
   - `docs/archive/azure-aca-retired-20260508/azure.yaml`
   - `docs/archive/azure-aca-retired-20260508/infra/`
   - historical Azure ACA material only; not active deploy authority
   - no Azure command or rollback authority is implied by archive presence

### Authenticated app, recipient and provider entry points

Use the [app API contract](../apps/witnessops-app/src/lib/api-contract.ts) as the
route inventory and follow each declared handler to its database and service
checks. Do not treat these as additional public receipt-verifier inputs.

| Surface | Focus of the review |
| --- | --- |
| WorkOS `/login`, `/signup`, `/callback`, logout and `/api/workspace` | Trusted identity/session, validated return targets, account admission, atomic workspace creation and workspace selection. |
| `/api/members`, `/api/invitations`, `/api/assets`, `/api/runs` | Exact verified recipient, explicit acceptance, current role, workspace isolation, last-Owner protection, concurrency and revocation. |
| `/api/linux-checks`, CLI authorization/session/capture endpoints | Untrusted packages and captures, bounded parsing, current scoped authority, one-time device grants, durable admission and preserved source bytes. |
| `/api/shares`, `/api/shared-report` and recipient hosts | Explicit preview/publication, allowlisted fixed snapshot, reviewed email actions, token/password-session/host binding, expiry and revocation. |
| `/api/billing`, `/api/billing/webhook` | Owner/customer/workspace binding, server-selected test prices, raw-body signatures, idempotency, current-state reconciliation, leases/fenced writes and seat reservations. |
| `/api/help` | Explicit bounded question plus generic page category, secret screening before provider use, safe errors, citation URLs, enablement and cost limits. |

Relevant implementation roots are `apps/witnessops-app/src/lib/`, its `db/` and
`server-check/` subtrees, `apps/witnessops-app/db/migrations/`,
`packages/wops-cli/` and `deploy/app/`. The
[finalizer contract](../deploy/app/FINALIZER_RUNTIME.md) describes a separate
app path, not expanded authority for `packages/proof` or `/verify`.

## Untrusted inputs

Review all handling of:

- pasted receipt JSON
- uploaded receipt `.json` content
- `/api/verify` request bodies
- request headers and content types
- oversized, deeply nested, malformed, duplicate-key, or ambiguous JSON
- receipt fields that may contain URLs, identifiers, descriptions, timestamps, hashes, or signatures
- query parameters used by public pages
- public-copy changes that may overstate verification results
- invitation emails/return targets, workspace/resource IDs, roles and caller-supplied authority claims
- uploaded ZIP/signature/capture bytes, filenames, declared sizes, digests and machine identifiers
- share tokens, passwords, recipient addresses, report names, Host/forwarding headers and narrative content
- Checkout/Portal arguments and callback events; a redirect or event field is not entitlement evidence
- typed Help questions, provider output/errors and source links; no private context is implicitly trusted

## Security invariants

The following must remain true unless an explicit design change is reviewed and approved:

- The same valid receipt input produces the same verification result shape.
- Invalid, malformed, incomplete, or ambiguous receipt input cannot be presented as verified.
- Verification output must distinguish verified, declared, inferred, and not-proven facts where the route exposes those categories.
- The public verifier must not claim source-system honesty unless the mechanism exists and is named.
- The public receipt-verification path must not issue, sign, mutate, or backfill receipts.
- The public receipt-verification path must not store customer data as part of normal verification.
- Public pages must not expose internal-only proof details, operator-only assumptions, secrets, or custody paths.
- Proof-bundle support must not be implied on the public verifier unless implemented and tested on that route.
- Buyer-facing copy must not turn a receipt parse, smoke check, or UI result into a broader production/security claim.

### App and CLI invariants to check

These are review requirements, not a claim that this document ran their tests.

- Authentication, account admission, current workspace membership, seat entitlement
  and collection/CLI authority remain distinct. Neither signup, an invitation nor
  payment silently grants collection or signing permission. Historical consent
  must not become a new charge or a permission fallback.
- Owner/Contributor/Viewer checks apply server-side to reads, exports and mutations.
  Removal/role changes must invalidate stale grants and unfinished execution at
  the relevant authorization/persistence boundaries; rejoining must not revive
  old credentials. A user's other workspaces remain isolated and usable.
- Last-Owner and capacity checks must hold under concurrent transactions. Provider
  calls must not hold membership locks; stale billing operations must not overwrite
  newer decisions. Downgrades preserve existing members/evidence under the current
  seat-only contract while restricting over-capacity additions.
- Hostname collection retains public-address/redirect checks, scope and budgets.
  Capture admission must remain durable across plans and retries; rejected or
  interrupted writes must not silently refund retained capacity or bypass limits.
  Never use actual customer targets to validate these rules without separate authority.
- Imports/reopens retain original evidence and the accepted verifier/trust boundary.
  A digest, signature check or complete collection is not source-system truth or
  an overall security grade. Unknowns, partial outcomes and synthetic labels survive
  report/export projection. Retries must not overwrite evidence or repeat signing blindly.
- Preview/read actions must not publish or send. Published reports contain only
  selected recipient-safe content and stay fixed. Tokens, optional password sessions
  and configured report hosts must not cross-bind shares or expose workspace routes.
  Expiry/revocation must deny subsequent access; caches, referrers and logs must not
  defeat that boundary. Already viewed/downloaded bytes cannot be recalled.
- Billing remains sandbox-only in this implementation. Exact workspace/customer,
  price and quantity checks, signature authentication, deduplication and current
  provider-state reconciliation must precede paid seat admission. A success URL
  grants nothing; complimentary access is not a fabricated payment.
- Help sends only the explicit question and generic page context, not automatic
  workspace/report/member contents. Reject detected secrets before provider calls;
  pattern detection is not a guarantee all secrets are detected. Safe rendering,
  generic provider errors, enablement and bounded use remain required. Help cannot
  perform operational actions; documentation and human contact remain separate.
- Runtime database privileges, migration/older-writer compatibility and finalizer
  custody must be checked against the selected release. Tests using an owning role
  or mocked providers do not establish restricted-runtime or hosted acceptance.

## High-priority finding classes

Treat the following as P1 for review purposes:

- acceptance of invalid or malformed receipt JSON as verified
- nondeterministic verification output for the same input
- route behavior that bypasses parser or schema checks
- hidden widening from receipt-first verification into proof-bundle acceptance
- server-side file/path handling reachable from upload or receipt fields
- leakage of internal proof details, local paths, environment names, operator notes, or secrets
- unsafe error messages that expose internals or make false verification claims
- public copy that overclaims what the verifier proved
- any change that makes `pnpm health`, route parity, receipt smoke, or buyer-path smoke less strict without a named reason

For the app/CLI also investigate cross-workspace access, privilege escalation,
stale-credential reuse, recipient data exposure, unauthorized collection/signing,
unbounded capture/provider work, evidence mutation and incorrect paid entitlement.
Report concrete impact, reachability and the affected configuration; source presence
alone is not evidence that an exploit is reachable in production.

## Lower-priority but relevant finding classes

Review but do not automatically treat as P1 without demonstrated impact:

- missing generic marketing-page security headers
- volumetric denial-of-service without a specific parser or compute amplification path
- cosmetic copy changes that do not affect verification claims
- dependency advisories already covered by deterministic advisory tooling, unless exploitability is reachable through this repo

## Review instructions for Codex

When reviewing this repository:

- prefer small, surgical findings over broad refactors
- name the affected route, file, parser, helper, or test
- include a concrete exploit path or failure mode where possible
- do not propose production secrets, cloud credentials, signing keys, or customer data as test inputs
- do not weaken verifier semantics to make a test pass
- do not collapse public presentation, execution authority, evidence capture, and verification semantics into one layer
- preserve `pnpm health` as the baseline validation command
- preserve the receipt-only public verifier while also reviewing the separate app/CLI implementation when affected
- bind findings and tests to the exact commit; distinguish source inspection, isolated tests, hosted acceptance and deployment
- review the changed surface and directly relevant callers first; reuse unchanged commit-bound evidence instead of repeatedly scanning unrelated history
- run affected regressions during a patch and broader health/acceptance checks at integration boundaries; do not weaken required CI
- app database/browser suites and real WorkOS, mail, Stripe and Help-provider acceptance are separate from `pnpm health`; consult the app README and use disposable fixtures, not production data
- an interrupted scan or failed report finalization is incomplete evidence, not a completed clean scan

## Suggested Codex Security scan configuration

Initial broad-scan seed (not a requirement to rescan 180 days for every PR).
A targeted review should name its base/head, affected surface, reused evidence
and actual checks; this documentation edit does not itself request a new scan:

- repository: `witnessops/witnessops-web`
- branch: `main`
- history window: `180 days`
- environment family: `Node / pnpm`
- setup command: `corepack enable && pnpm install --frozen-lockfile`
- validation command for proposed patches: `pnpm health`
- agent secrets: none
- production credentials: prohibited
- customer data fixtures: prohibited

## Closure condition for this prep artifact

This prep artifact is sufficient when:

- Codex Security scan context can be seeded from this file.
- `AGENTS.md` points reviewers to this file.
- No runtime code, verifier semantics, secrets, production settings, or active deploy authority were changed by this prep artifact.
