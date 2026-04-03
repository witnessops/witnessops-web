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

## Validation

- `pnpm health`
- route parity against the frozen baseline captured at slice start
