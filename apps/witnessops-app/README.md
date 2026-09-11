# WitnessOps product foundation

UX reference: `witnessops/witnessops-demo-ui` at `4887c0fc5f2ac6742de0f4c9e11cb11e8603ade4`. This is a local integration, not a deployed or customer-authenticated service.

## Run locally

Use Node 22 and pnpm 9.15.4. From the monorepo root:

```sh
pnpm install --frozen-lockfile
pnpm dev
# In a second terminal:
WITNESSOPS_APP_DEV_SESSION=1 pnpm app:dev
```

The public web app binds to `127.0.0.1:3001`; the product app binds to `127.0.0.1:3020`. Open the latter and choose **Start local workspace**. Add a hostname, review the ten recommended checks, explicitly confirm ownership/authorization, then Observe. Rerun after one minute. Each completed run preserves the complete source snapshot; History and Reports link to that specific run. Failed execution does not create a security finding.

Only observe hostnames you own or are authorized to check. This uses real public network operations, bounded by the existing production engine; adding an asset does not run them. No scheduling, credentials, exploitation or arbitrary ports.

## Infrastructure choices

Reuses pnpm workspaces, Next 15/React 19, Node/tsx tests, ESLint, Playwright and shared HTTP security headers. There is no new build framework or dependency family. The runner, normalizer, snapshot validator and source types are imported internally from `witnessops-web`; no app-to-app HTTP request and no source extraction. The public endpoint and `/check` are unchanged.

Existing operator OIDC and issuance-specific claimant cookies are purpose-specific, not customer authentication. Existing filesystem intake storage is not customer workspace storage. This slice adopts neither. Prototype Better Auth, PGlite, Postgres/Kysely, TanStack/Vite, platform bridges, Zustand persistence and simulated execution are not ported.

## Development session boundary

This seam requires **both** `NODE_ENV=development` and `WITNESSOPS_APP_DEV_SESSION=1`, and an exact loopback Host/request authority. Production builds show an unavailable boundary even if the flag is accidentally set. This is not proof of a person's identity or a production authentication design.

An opaque random HttpOnly, SameSite=Strict cookie selects one in-process workspace. Nothing uses localStorage or writes a database/file. Sessions expire after one hour, clear explicitly, and disappear on a server restart. At most eight sessions, twenty assets per session and bounded retained runs. Limits reject additional work rather than delete prior runs. A clear during collection prevents retaining the result. This single-process development seam is unsuitable for multiple production workers.

Same-origin JSON mutations, a 1 KiB request body, body deadline, two concurrent runs, ten starts/minute and one start/hostname/minute protect local execution. User input cannot choose transport, check IDs, ports, time budgets or runner options. The production runner owns DNS/public-address safety, redirects, strict TLS, network budgets and cleanup.

Local API routes are declared in `src/lib/api-contract.ts` and tested against files and exported methods. Session, workspace, assets and runs are the complete API. None is an undocumented production customer endpoint.

## Evidence and change semantics

`ExternalSnapshotV1` is stored intact after the existing validator, with SHA-256 of its serialized source. It retains all check/version/method/status/observation/evidence/interpretation/limitations/recommendation/collection fields and usage/network provenance. Digest identity is not signing or source-system authentication. Network provenance describes bounded attempts, not guaranteed responses.

“Clear” means only the named observation matched its expected conditions. It never means secure or free of vulnerabilities. `CHECK_ERROR` remains Undetermined with the original status visible. DMARC and HSTS retain production semantics.

Environment compares collected source values under unchanged methods. Coverage tracks added/removed checks and method/profile versions; newly added checks are never environment changes. Non-comparable collection is uncertainty. Run timestamps, operation counts and the derived certificate-days-remaining countdown are not environment changes. Original sources remain unchanged by the UI comparison.

Only the fixed ten-check recommended bundle is runnable. **Edit checks** explains that fixed method; custom selection, cadence, Public Services/IP/ports, OFFSEC execution, invitations and real member administration are unavailable. Reports are readable views and downloadable source JSON, not a new PDF pipeline.

## Validation

```sh
pnpm app:test
pnpm --filter @witnessops/app lint
pnpm --filter @witnessops/app typecheck
pnpm app:build
pnpm test:app-browser # requires Playwright Chromium/WebKit installed
pnpm health
```

`pnpm health` includes app build/lint/typecheck/unit tests and the existing public gates. Browser tests are separate, using deterministic fixtures and a managed local dev server. They do not collect external targets. No formatter is configured in the repository; ESLint and `git diff --check` enforce the existing conventions.

## Before app.witnessops.com

Choose and implement customer authentication, workspace membership authorization and durable storage with retention/backup/deletion policy. Replace the local seam; require cross-workspace access tests and per-user/workspace execution limits. Plan a separately authorized app image/runtime, protected release path, DNS/TLS/hostname routing and secrets custody. None of those production changes is made here. Public deployment/release commands still target witnessops-web.
