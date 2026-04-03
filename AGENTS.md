# AGENTS.md

## Scope

This repo is the local bootstrap repo for the WitnessOps web surface.

## Rules

- Treat RR-002 as the source of truth for the first cut.
- Keep `packages/proof` limited to the receipt-only lane in this slice.
- Do not widen into canonical bundle verification or corpus work.
- Keep live successor package names on the `@witnessops/*` surface and do not revert them to the legacy authority boundary.
- Treat `content/vaultmesh`, `proofs/**`, `tests/protocol-conformance/**`, and remote bootstrap as out of scope.
- Prefer route-parity evidence over interpretation.

## Validation

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter @witnessops/proof test`
- `pnpm docs:validate`
- `pnpm signals:validate`
- route parity against the frozen baseline captured at slice start
