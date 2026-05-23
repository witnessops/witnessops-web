# Codex Security Threat Model — witnessops-web

Status: `repo_prep_seed_for_codex_security`

This document is a repository-specific seed for Codex Security review and GitHub PR review. It is not a vulnerability report, not a scanner result, and not release authorization.

## Scope

This repository owns the public WitnessOps web surface:

- the Next.js application under `apps/witnessops-web`
- the `/verify` route
- the `/api/verify` route
- the receipt-first verification package used by this public surface
- public copy, route parity, buyer-path smoke checks, and local health checks

## Out of scope

This repository does not own:

- the WitnessOps control plane
- customer workflow execution
- receipt issuance or signing authority
- production custody of customer data
- canonical proof-bundle verification semantics outside the receipt-first web slice
- deploy approval, release approval, or public claim approval

Do not infer that a passing Codex Security review verifies any out-of-scope system.

## Authority boundaries

- `main` in `witnessops/witnessops-web` is the code authority for this web surface.
- `pnpm health` is the deterministic local validation command for this repo.
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

## Security invariants

The following must remain true unless an explicit design change is reviewed and approved:

- The same valid receipt input produces the same verification result shape.
- Invalid, malformed, incomplete, or ambiguous receipt input cannot be presented as verified.
- Verification output must distinguish verified, declared, inferred, and not-proven facts where the route exposes those categories.
- The public verifier must not claim source-system honesty unless the mechanism exists and is named.
- The web surface must not issue, sign, mutate, or backfill receipts.
- The web surface must not store customer data as part of normal verification.
- Public pages must not expose internal-only proof details, operator-only assumptions, secrets, or custody paths.
- Proof-bundle support must not be implied on the public verifier unless implemented and tested on that route.
- Buyer-facing copy must not turn a receipt parse, smoke check, or UI result into a broader production/security claim.

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
- preserve the current scope boundary: this is a receipt-first public web verifier, not the control plane and not the proof engine

## Suggested Codex Security scan configuration

Initial scan seed:

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
