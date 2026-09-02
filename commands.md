# Commands

Frozen contributor entrypoints for `witnessops-web`.

This file documents public repository commands that are safe to expose as part
of the product/source surface. If a root script changes, update this contract in
the same lane or explicitly state why the command surface is unchanged.

## Deployment command boundary

This repository does not document production host identity, cloud trust policy,
secret inventories, private network topology, rollback endpoints, or operator
credential locations.

- `pnpm release` builds the app artifact only.
- A merge to `main` does **not** itself authorize or perform production publication or deployment.
- Production mutation requires a separate explicit operator action under separately custodied deployment authority.
- Retired deployment paths are not valid shortcuts and must not be reactivated from this command contract.
- Retired cloud material under `docs/archive/` is historical reference only.

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

Builds the live app artifact for the current internal/manual release process.
Promotion beyond the build step remains operator-managed and separately
authorized.

## Public Buyer-Path Smoke

`pnpm smoke:buyer-path`

Checks the public buyer path with a deterministic Node helper instead of shell
text-processing assumptions. The command reads `WITNESSOPS_SMOKE_BASE_URL` when
set and defaults to `https://witnessops.com`.

`pnpm smoke:buyer-path:test`

Runs the buyer-path smoke test harness without fetching the live site. Use this
when public buyer/proof-surface copy, sample markers, route copy, or proof-surface
contract markers change.

## Homepage Hero UI Proof

`pnpm ui-proof:hero`

Builds `witnessops-web`, runs the homepage hero mobile UI proof locally, and
emits generated artifacts under `artifacts/ui-proof/`.

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

Warning-only failures remain non-blocking. The `mobile-280-light-extreme`
scenario is warning-only. The supported mobile floor is 320px.

### Override process

A blocking homepage hero UI proof failure may only be overridden as a temporary
exception. The PR must include an explicit override comment with:

- reason
- owner
- design/product approval
- failed scenario or check
- follow-up issue
- expiry condition

Permanent silent overrides are not allowed.
