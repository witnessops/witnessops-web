# Commands

Frozen operator entrypoints for `witnessops-web`.

This file documents root `package.json` scripts. If a root script changes, update this contract in the same lane or explicitly state why the command surface is unchanged.

## Deployment command boundary

This repo has no active Azure deployment command surface.

- `pnpm release` builds the app artifact only.
- Azure `az`, `azd`, Bicep, ACA, rollback, inventory, cleanup, and restore commands are not repo entrypoints.
- Archived Azure material under `docs/archive/azure-aca-retired-20260508/` is historical reference only.
- Any future Azure command requires a separate explicit Azure reopening lane with allowed cloud surfaces, validation commands, receipts, and stop boundary.

### Active AWS production and private mesh-dev boundary

Routine production publication and deployment are available only through a
manual `.github/workflows/aws-release.yml` dispatch from `refs/heads/main`.
The workflow operations are `publish-image`, `deploy-staging`, and
approval-gated `deploy-production`. Merging does not dispatch them.

Retained root entrypoints (also in root `AGENTS.md` /
`docs/DEPLOYMENT_AUTHORITY.md`):

| Script | Command |
| --- | --- |
| Deploy mesh-dev only | `pnpm deploy:k3s:dev` |
| Status + smoke (image+HTTP+CSS) | `pnpm deploy:k3s:status` or `pnpm deploy:k3s:smoke` |
| Parity unit tests | `pnpm deploy:k3s:test-parity` |
| Teardown mesh-dev | `pnpm deploy:k3s:dev:teardown` |
| Disk hygiene | `pnpm deploy:k3s:hygiene` |

Smoke fails when prod/mesh-dev **image refs differ** (not CSS-only). Intentional
non-parity: mesh bind/emptyDir/PORT/HOSTNAME/VERIFY_BASE. Shared secrets:
the `BASE_ENV_SECRET` + `ADMIN_OIDC_SECRET` contract.

`pnpm deploy:k3s:build`, `pnpm deploy:k3s:prod`, and
`pnpm deploy:k3s:both` are retired aliases that fail closed with
`RETIRED_PRODUCTION_DEPLOY_PATH`. Production drift is reconciled through the
AWS workflow; mesh-dev may then be aligned separately.

Env: source the private ignored `deploy/topology.env`; use `ALLOW_DIRTY=1` only for intentional dirty-tree builds.

`deploy:k3s:hygiene` is a destructive disk-maintenance operation with its own
guards. Run it only under separate authorization after resolving the exact
private target; it is not part of ordinary build, deploy, smoke, or rollback.

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
- ticket-triage tests
- route parity
- receipt smoke
- public buyer-path smoke test
- public SEO tests

## Focused validation commands

`pnpm proof:test`

Runs `@witnessops/proof` tests.

`pnpm route-parity`

Runs route parity against the frozen manifest baseline.

`pnpm receipt-smoke`

Runs receipt smoke tests.

`pnpm docs:validate`

Validates public MDX under `content/witnessops/docs` and its metadata. It does
not scan repository-local `docs/*.md`.

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
