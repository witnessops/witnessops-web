# witnessops-web

Live authoritative repo for the WitnessOps web surface.

## Authority

- Canonical remote: `https://github.com/witnessops/witnessops-web`
- Default branch: `main`
- Release authority: internal/manual for now

## Owned surfaces

- `apps/witnessops-web` is the live app surface.
- `content/witnessops` is the live content root.
- `packages/config`, `packages/content`, `packages/proof`, `packages/ui`, and `packages/tsconfig` are the shared support packages required by the app.
- `packages/proof/src/receipt` is the only proof lane in this repo.
- `/verify` and `/api/verify` are first-class owned surfaces.

## Operator entrypoints

- Health: `pnpm health`
- Release: `pnpm release`

See [`commands.md`](./commands.md) for the frozen command contract.

## Validation

The health command covers build, lint, typecheck, tests, docs validation, signals validation, route parity, receipt smoke, and `@witnessops/proof` tests.
