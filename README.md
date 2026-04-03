# witnessops-web

Local bootstrap repo for the WitnessOps web surface.

## Scope

- `apps/witnessops-web` is the live app surface.
- `content/witnessops` is the live content root.
- `packages/config`, `packages/content`, `packages/proof`, `packages/ui`, and `packages/tsconfig` are the shared support packages required by the app.
- `packages/proof/src/receipt` is the only proof lane moved in this cut.

## Retained Behind

- canonical bundle verification and the corpus that exercises it
- `tests/protocol-conformance`
- `content/vaultmesh`
- `proofs/**`
- remote bootstrap under `github.com/witnessops/witnessops-web`

## Validation

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter @witnessops/proof test`
- `pnpm docs:validate`
- `pnpm signals:validate`

Namespace cleanup is complete for the live successor surface in this slice. Retained-behind proof/corpus lanes stay in `public-surfaces`.
