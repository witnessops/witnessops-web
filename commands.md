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

## Public Buyer-Path Smoke

`pnpm smoke:buyer-path`

Checks the public buyer path with a deterministic Node helper instead of shell text-processing assumptions.
The command reads `WITNESSOPS_SMOKE_BASE_URL` when set and defaults to `https://witnessops.com`.

## Homepage Hero UI Proof

`pnpm ui-proof:hero`

Builds `witnessops-web`, runs the homepage hero mobile UI proof locally, and emits generated artifacts under `artifacts/ui-proof/`.

`pnpm ui-proof:hero:ci`

Runs the same homepage hero UI proof runner used by GitHub Actions.

### Blocking policy

After calibration, the GitHub Actions `Homepage Hero UI Proof` workflow blocks on:

- build failure
- runner startup failure
- missing `artifacts/ui-proof/homepage-hero/latest.json`
- critical homepage hero semantic failures

Warning-only failures remain non-blocking. The `mobile-280-light-extreme` scenario is warning-only. The supported mobile floor is 320px.

### Override process

A blocking homepage hero UI proof failure may only be overridden as a temporary exception.
The PR must include an explicit override comment with:

- reason
- owner
- design/product approval
- failed scenario or check
- follow-up issue
- expiry condition

Permanent silent overrides are not allowed.
