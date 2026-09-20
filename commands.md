# Commands

Frozen contributor entrypoints for `witnessops-web`.

This file documents public repository commands that are safe to expose as part
of the product/source surface. If a root script changes, update this contract in
the same lane or explicitly state why the command surface is unchanged.

## Deployment command boundary

This repository does not document production host identity, cloud trust policy,
secret inventories, private network topology, rollback endpoints, or operator
credential locations.

- `pnpm release` builds the public website package (`witnessops-web`) only, not the separate authenticated app.
- A merge to `main` does **not** itself authorize or perform production publication or deployment.
- Production mutation requires a separate explicit operator action under separately custodied deployment authority.
- Retired deployment paths are not valid shortcuts and must not be reactivated from this command contract.
- Retired cloud material under `docs/archive/` is historical reference only.

## Health

`pnpm health`

Runs the Node 22 local repository health chain in [package.json](./package.json),
in the following order. A failure stops the remaining steps:

```text
pnpm --filter witnessops-web build
pnpm --filter witnessops-web lint
pnpm --filter witnessops-web typecheck
pnpm ticket-triage:typecheck
pnpm test
pnpm docs:validate
pnpm signals:validate
pnpm app:build
pnpm --filter @witnessops/app lint
pnpm --filter @witnessops/app typecheck
```

The nested `pnpm test` chain is:

```text
pnpm --filter witnessops-web test
pnpm --filter @witnessops/proof test
pnpm ticket-triage:test
pnpm route-parity
pnpm receipt-smoke
pnpm smoke:buyer-path:test
pnpm verify:public-seo:test
pnpm deploy:aws:test
pnpm deploy:ghcr:test
pnpm app:test
pnpm cli:test
```

The first test command targets the public website package; `app:test` targets
the separate `@witnessops/app` package, and `cli:test` targets `@witnessops/cli`.
The deployment-related entries are repository test/syntax-check commands, not
production deployment or image-publication commands.

These are the direct health/test chains, not every available package script.
From the repository root, inspect the current definitions without running them:

```bash
node -p "require('./package.json').scripts.health"
node -p "require('./package.json').scripts.test"
```

Keep both lists aligned with script changes. Repository health is browser-free;
it does not replace the app's separate database/browser acceptance suites
listed in [the app README](./apps/witnessops-app/README.md), the PDF/browser
gates below, or hosted-provider acceptance. A health result is not evidence of
production deployment, live payment/mail delivery, or completed operator approval.
Use `pnpm health:node22` as documented in [the Node 22 builder guide](./docs/NODE22-BUILDER.md)
when the host is not already running Node 22.

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

## PDF Pagination Gate

`pnpm build && pnpm test:pdf-pagination`

Builds the public website and runs the four fixture-only A4 PDF regressions (clean External
Exposure, attention, long finding, and Local Audit). Install Chromium first with
`pnpm exec playwright install chromium --with-deps`.

The dedicated `PDF Pagination Gate` CI workflow runs these cases after its build.
Playwright owns the loopback server and cleans it up after success or failure.
No live hostname collection occurs. This browser gate is separate from the
browser-free `pnpm health` / `pnpm health:node22` contract. A failed PDF test fails
its workflow; repository branch-protection requirements are configured separately.

## Release

`pnpm release`

Runs `pnpm --filter witnessops-web build` for the public website artifact.
The authenticated application has its separate `pnpm app:build` command.
Neither build publishes an image or deploys production; promotion remains
operator-managed and separately authorized.

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
