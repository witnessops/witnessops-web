# AGENTS.md

## Scope

This repo is the live authoritative repo for the WitnessOps web surface.
Published remote: `https://github.com/witnessops/witnessops-web`
Default branch: `main`
Release authority: internal/manual for now

## Rules

- Treat `/verify` and `/api/verify` as first-class owned surfaces.
- Keep `packages/proof` limited to the receipt-only lane in this slice.
- Do not widen into canonical bundle verification or corpus work unless a separate lane explicitly authorizes it.
- Keep live package names on the `@witnessops/*` surface.
- Use the published remote as the operating source of truth.
- Use `pnpm health` for the full local check.
- Use `pnpm release` as the frozen release entrypoint; release remains manual/internal for now.
- Prefer route-parity evidence over interpretation.
- Do not expose internal-only proof details through operator-facing surfaces.

## Deployment authority

- Use [`docs/DEPLOYMENT_AUTHORITY.md`](./docs/DEPLOYMENT_AUTHORITY.md) before any deploy-adjacent work.
- The active WitnessOps web hosting lane is Servury/edge02 clean-server hosting.
- Azure Container Apps is retired for this repo. Root `azure.yaml` and `infra/**` were archived under `docs/archive/azure-aca-retired-20260508/`.
- Do not run `az`, `azd`, Bicep deployment, Azure inventory, Azure cleanup, Azure rollback, or Azure restore work from this repo unless a separate explicit Azure reopening lane names the allowed cloud surfaces, commands, receipts, and stop boundary.
- Do not treat archived Azure files as active deploy authority, rollback authority, or evidence that Azure resources exist.

## Root file hygiene

- Treat project-root files as operator authority surfaces. Do not delete or rename root files unless the PR names the target files and proves they are stale.
- A root-file deletion PR must include evidence that the file is unused, superseded, or duplicate: search references, command references, package-script references, and replacement location where applicable.
- Do not remove active root authority files such as repo instructions, command contracts, security policy, workspace/package contracts, or public README material as part of unrelated page work.
- Keep root cleanup separate from public copy, verifier semantics, receipt semantics, release, or deploy changes.

## Public proof-surface and sample artifact contract

- The AI Agent Action Proof Run sample page is a public proof-surface, not proof authority by itself.
- Keep sample artifact identity in `apps/witnessops-web/src/app/review/sample-cases/ai-agent-action-proof-run/sample-artifact-contract.ts`.
- Do not hard-code sample commits, manifest hashes, artifact digests, or sample URLs directly in the page when a contract field exists.
- Keep `artifact-links.test.ts` aligned with the sample artifact contract.
- Keep `scripts/smoke-buyer-path.ts` aligned with buyer-visible proof markers.
- Current web-side boundary: the web contract records pinned sample manifest provenance and displays artifact digests, but it does not recompute individual source artifact hashes locally.
- Cross-repo sample artifact verification must be handled in a separate lane before claiming source artifact bytes were independently recomputed by this repo.

## Codex Security review

Use [`docs/CODEX_SECURITY_THREAT_MODEL.md`](./docs/CODEX_SECURITY_THREAT_MODEL.md) as the seed context for Codex Security review.

Codex Security may identify findings and propose patches, but it does not authorize merge, deploy, public verification claims, release, or customer-impacting changes.

For security-sensitive changes, preserve these boundaries:

- `/verify` and `/api/verify` accept untrusted receipt input.
- Invalid, incomplete, ambiguous, or malformed receipt input must not be presented as verified.
- Receipt parsing, public result rendering, copy, smoke tests, and route parity must not overclaim what the verifier proved.
- The web surface does not issue, sign, mutate, backfill, or store receipts as part of normal verification.
- Do not add production secrets, customer data, signing keys, cloud credentials, or private evidence bundles to tests, examples, prompts, or fixtures.

## Validation

- `pnpm health`
- route parity against the frozen baseline captured at slice start
- buyer-path smoke when public buyer or proof-surface copy changes: `pnpm smoke:buyer-path:test`
