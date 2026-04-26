# AGENTS.md

## Scope

This repo is the live authoritative repo for the WitnessOps web surface.
Published remote: `https://github.com/witnessops/witnessops-web`
Default branch: `main`
Release authority: internal/manual for now

## Rules

- Treat `/verify` and `/api/verify` as first-class owned surfaces.
- Keep `packages/proof` limited to the receipt-only lane in this slice.
- Do not widen into canonical bundle verification or corpus work.
- Keep live package names on the `@witnessops/*` surface.
- Use the published remote as the operating source of truth.
- Use `pnpm health` for the full local check.
- Use `pnpm release` as the frozen release entrypoint; release remains manual/internal for now.
- Prefer route-parity evidence over interpretation.
- Do not expose internal-only proof details through operator-facing surfaces.

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
