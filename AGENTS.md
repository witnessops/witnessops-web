# AGENTS.md

## Scope

This repo is the live authoritative repo for the WitnessOps public web surface.
Published remote: `https://github.com/witnessops/witnessops-web`
Default branch: `main`
Release authority: explicit operator action; merge alone is not deployment authority.

## Rules

- Treat `/verify` and `/api/verify` as first-class owned surfaces.
- Keep `packages/proof` limited to the receipt-only lane in this slice.
- Do not widen into canonical bundle verification or corpus work unless a separate lane explicitly authorizes it.
- Keep live package names on the `@witnessops/*` surface.
- Use the published remote as the operating source of truth for product source.
- Use `pnpm health` for the full local check.
- Use `pnpm release` as the frozen release build entrypoint; promotion remains separately authorized.
- Prefer route-parity evidence over interpretation.
- Do not expose internal-only proof details through operator-facing surfaces.

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
- The web surface does not issue, sign, mutate, backfill, or store receipts as part of normal verification.
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
- Deploy/runtime validation belongs to a separately authorized operator lane; do not infer it from local repository health.
