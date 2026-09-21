# AGENTS.md

## Scope

This is the authoritative source repository for the WitnessOps public website,
authenticated product app, CLI and shared packages. These root instructions
apply repository-wide; also read subtree `AGENTS.md` files where present.
Source inclusion does not establish production enablement or acceptance.
Published remote: `https://github.com/witnessops/witnessops-web`
Default branch: `main`
Release authority: explicit operator action; merge alone is not deployment authority.

## Repository-wide rules

- Keep live package names on the `@witnessops/*` surface.
- Use the published remote as the operating source of truth for product source.
- Use `pnpm health` for the full local check.
- Use `pnpm release` as the frozen public-website release build entrypoint; promotion remains separately authorized. App-specific build and lifecycle source under `deploy/app/` is separate; do not assume the website command deploys the app.
- Prefer route-parity evidence over interpretation.
- Do not expose internal-only proof details through operator-facing surfaces.

## Commercial naming work

For offer names, descriptors, CTAs or catalogue identity changes, start with the
[commercial index](./docs/commercial/README.md) and the applicable offer record.
The [offer identity and naming proposal](./docs/commercial/OFFER_IDENTITY_AND_NAMING_POLICY.md)
and [supporting research](./docs/commercial/OFFER_NAMING_RESEARCH_20260921.md) are
**proposed, not adopted**. They do not override current contracts or grant rename,
billing, collection or deployment authority.

## Public receipt-only lane

- Treat `/verify` and `/api/verify` as first-class owned surfaces.
- Keep `packages/proof` limited to the receipt-only lane in this slice.
- Do not widen into canonical bundle verification or corpus work unless a separate lane explicitly authorizes it.
- Existing app import, storage and report-sharing paths do not widen public receipt-verifier inputs or confer new proof authority.

## Authenticated app and CLI boundaries

- `apps/witnessops-app/` owns the product's account/workspace, membership, saved-result, report-sharing and sandbox seat-billing implementation. Read its [README](./apps/witnessops-app/README.md) and [API contract](./apps/witnessops-app/src/lib/api-contract.ts) before changing these paths.
- WorkOS authentication, current workspace membership, product entitlements and collection/CLI authorization are separate checks. Preserve Owner/Contributor/Viewer restrictions and revocation behavior.
- Signup, joining a workspace and payment never authorize collection by themselves. Preserve existing historical admission/consent behavior; do not silently convert it into new billing terms.
- Preserve original source evidence, material unknowns and synthetic labels. Report sharing uses an explicit recipient projection and a fixed revision; it grants no workspace membership and must not expose unselected source data.
- The CLI source in `packages/wops-cli/` and the app's separately scoped server-check/finalization implementation are not the receipt-only verifier. Their presence does not authorize collection, signing, provider activation or deployment.
- Sandbox billing is not a live catalogue. Provider-backed Help, mail delivery and payments require their own configuration and acceptance; fixture tests do not establish them.

## Deployment boundary

- This public repository is product source, not a public operator handbook.
- A merge to `main` does not by itself authorize or perform production publication or deployment.
- Production mutation requires a separate explicit operator action and separately custodied deployment/runtime evidence.
- Do not add or restate host identity, cloud account identifiers, secret-object/key inventories, private network topology, rollback endpoints, workstation paths, or credential locations in public repo instructions.
- Do not treat repository prose as evidence that a particular release is live. Production state requires release-specific runtime evidence.
- DNS, edge/proxy changes, new API/app exposure, and security-product exposure require separate explicit lanes.
- Never place production receipt-signing private keys, customer secrets, cloud credentials, or private evidence bundles in this repository.
- Retired cloud/deployment material is historical reference only. Do not reactivate a retired path without a separately authorized reopening lane.
- Existing production workflow paths and trust bindings must not be renamed, moved, or semantically changed as part of documentation/public-surface cleanup.

## Public docs host contract

- Canonical English docs are under `https://witnessops.com/docs` and `/docs/*`.
- Legacy docs-host behavior must remain aligned with the separately maintained edge-routing contract; do not change DNS/TLS/redirect behavior in an unrelated docs patch.
- Polish docs remain under `/pl/docs`.
- Helpers: `apps/witnessops-web/src/lib/docs-host-routing.ts` (unit-tested). `getDocsUrl` returns apex `/docs` URLs.

## Root file hygiene

- Treat project-root files as authority surfaces. Do not delete or rename root files unless the PR names the target files and proves they are stale.
- A root-file deletion PR must include evidence that the file is unused, superseded, or duplicate: search references, command references, package-script references, and replacement location where applicable.
- Do not remove active root authority files such as repo instructions, command contracts, security policy, workspace/package contracts, or public README material as part of unrelated page work.
- Keep root cleanup separate from public copy, verifier semantics, receipt semantics, release, or deploy changes.

## Public proof-surface and sample artifact contract

- The AI Agent Action Proof Run sample page is a public proof-surface, not proof authority by itself.
- Keep sample artifact identity in `apps/witnessops-web/src/app/review/sample-cases/ai-agent-action-proof-run/sample-artifact-contract.ts`.
- Do not hard-code sample commits, manifest hashes, artifact digests, or sample URLs directly in the page when a contract field exists.
- Keep `artifact-links.test.ts` aligned with the sample artifact contract.
- Keep `scripts/smoke-buyer-path.ts` aligned with buyer-visible proof markers.
- Current web-side boundary: the fixed compromised-key specimen is mirrored as exact same-origin bytes. Its sample-specific browser/offline verifier checks the purpose-limited demo signer, evidence hashes, receipt references, authority, scope, and declared synthetic rotation transition.
- That verification does not establish a real provider action, real credential compromise, source-system truth, production signing-key custody, legal compliance, or whole-environment assurance. Keep `/verify` and `/api/verify` receipt-only.

## Codex Security review

Use [`docs/CODEX_SECURITY_THREAT_MODEL.md`](./docs/CODEX_SECURITY_THREAT_MODEL.md) as the seed context for Codex Security review.

Codex Security may identify findings and propose patches, but it does not authorize merge, deploy, public verification claims, release, or customer-impacting changes.

For security-sensitive changes, preserve these boundaries:

- `/verify` and `/api/verify` accept untrusted receipt input.
- Invalid, incomplete, ambiguous, or malformed receipt input must not be presented as verified.
- Receipt parsing, public result rendering, copy, smoke tests, and route parity must not overclaim what the verifier proved.
- The public receipt-verification surface does not issue, sign, mutate, backfill, or store receipts as part of normal verification. Do not apply this description to the app's separate authorized import/storage/finalization paths or use those paths to widen `/verify`.
- Do not add production secrets, customer data, signing keys, cloud credentials, or private evidence bundles to tests, examples, prompts, or fixtures.

## Optimization and language strategy

- Before proposing a new runtime (Go/Rust sidecar, WASM crypto, full rewrite), read [`docs/OPTIMIZATION-LANGUAGE.md`](./docs/OPTIMIZATION-LANGUAGE.md).
- Grok project skill: `.grok/skills/optimize-witnessops-web/SKILL.md` (`/optimize-witnessops-web`).
- Fast regression after proof/verify edits: `pnpm optimize:quick-check` (requires `pnpm install`).
- Release-quality validation uses Node 22: see [`docs/NODE22-BUILDER.md`](./docs/NODE22-BUILDER.md) and use `pnpm health:node22` when the host is not already on Node 22.

## Validation

- `pnpm health` — full repository health gate on Node 22.
- route parity against the frozen baseline captured at slice start.
- buyer-path smoke when public buyer or proof-surface copy changes: `pnpm smoke:buyer-path:test`.
- App database and browser acceptance commands are documented in `apps/witnessops-app/README.md`; `pnpm health` does not replace these separate suites or hosted-provider acceptance.
- Deploy/runtime validation belongs to a separately authorized operator lane; do not infer it from local repository health.
