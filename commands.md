# Commands

Frozen operator entrypoints for `witnessops-web`.

This file documents root `package.json` scripts. If a root script changes, update this contract in the same lane or explicitly state why the command surface is unchanged.

## Deployment command boundary

This repo has no active Azure deployment command surface.

- `pnpm release` builds the app artifact only.
- Azure `az`, `azd`, Bicep, ACA, rollback, inventory, cleanup, and restore commands are not repo entrypoints.
- Archived Azure material under `docs/archive/azure-aca-retired-20260508/` is historical reference only.
- Any future Azure command requires a separate explicit Azure reopening lane with allowed cloud surfaces, validation commands, receipts, and stop boundary.

### Active k3s dual-lane (ops-dev-01)

Canonical entrypoints (also in root `AGENTS.md` / `docs/DEPLOYMENT_AUTHORITY.md`):

| Script | Command |
| --- | --- |
| Build shared image | `pnpm deploy:k3s:build` |
| Deploy prod only | `pnpm deploy:k3s:prod` |
| Deploy mesh-dev only | `pnpm deploy:k3s:dev` |
| Build once → both | `pnpm deploy:k3s:both` |
| Status + smoke | `pnpm deploy:k3s:status` or `pnpm deploy:k3s:smoke` |
| Teardown mesh-dev | `pnpm deploy:k3s:dev:teardown` |

Env: `DEPLOY_SSH` (default `ops-dev-01`; fallback `root@194.147.221.89`), `ALLOW_DIRTY=1` for dirty trees.

Legacy `deploy/scripts/deploy.sh` (GHCR / Compose) is not live authority.

## Health

`pnpm health`

Runs the full live-repo check:

- build
- lint
- typecheck
- tests through `pnpm test`
- docs validation
- signals validation

`pnpm test` currently includes:

- app tests
- `@witnessops/proof` tests
- route parity
- receipt smoke
- public buyer-path smoke test

## Focused validation commands

`pnpm proof:test`

Runs `@witnessops/proof` tests.

`pnpm route-parity`

Runs route parity against the frozen manifest baseline.

`pnpm receipt-smoke`

Runs receipt smoke tests.

`pnpm docs:validate`

Validates public docs content and docs metadata.

`pnpm signals:validate`

Validates signal content.

## Release

`pnpm release`

Builds the live app artifact for the current internal/manual release process. Promotion beyond the build step remains operator-managed for now.

## Public Buyer-Path Smoke

`pnpm smoke:buyer-path`

Checks the public buyer path with a deterministic Node helper instead of shell text-processing assumptions.
The command reads `WITNESSOPS_SMOKE_BASE_URL` when set and defaults to `https://witnessops.com`.

`pnpm smoke:buyer-path:test`

Runs the buyer-path smoke test harness without fetching the live site. Use this when public buyer/proof-surface copy, sample markers, route copy, or proof-surface contract markers change.

## Homepage Hero UI Proof

`pnpm ui-proof:hero`

Builds `witnessops-web`, runs the homepage hero mobile UI proof locally, and emits generated artifacts under `artifacts/ui-proof/`.

`pnpm ui-proof:hero:ci`

Runs the same homepage hero UI proof runner used by GitHub Actions.

`pnpm ui-proof:open`

Opens the generated Playwright report under `artifacts/ui-proof/playwright-report`.

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
