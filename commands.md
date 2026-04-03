# Commands

Frozen operator entrypoints for `witnessops-web`.

## Health

`pnpm health`

Runs the full live-repo check:

- build
- lint
- typecheck
- tests
- docs validation
- signals validation
- route parity
- receipt smoke
- `@witnessops/proof` tests

## Release

`pnpm release`

Builds the live app artifact for the current internal/manual release process. Promotion beyond the build step remains operator-managed for now.
