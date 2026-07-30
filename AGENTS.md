# AGENTS.md

## Scope

This repo is the live authoritative repo for the WitnessOps web surface.
Published remote: `https://github.com/witnessops/witnessops-web`
Default branch: `main`
Release authority: internal/manual for now

## Rules

- Treat `/verify` and `/api/verify` as first-class owned surfaces.
- Keep `packages/proof` limited to the receipt-only lane in this slice.
- Do not widen into canonical bundle verification or corpus work unless a separate lane explicitly authorizes it.
- Keep live package names on the `@witnessops/*` surface.
- Use the published remote as the operating source of truth.
- Use `pnpm health` for the full local check.
- Use `pnpm release` as the frozen release entrypoint; release remains manual/internal for now.
- Prefer route-parity evidence over interpretation.
- Do not expose internal-only proof details through operator-facing surfaces.

## Deployment authority

- Use [`docs/DEPLOYMENT_AUTHORITY.md`](./docs/DEPLOYMENT_AUTHORITY.md) before any deploy-adjacent work.
- Custody map: [`docs/DEPLOYMENT_CUSTODY.md`](./docs/DEPLOYMENT_CUSTODY.md).
- **Active dual-lane path (ops-dev-01 k3s, namespace `witnessops`):**
  - **prod** — deployment `witnessops-web` — public `https://witnessops.com` via Caddy → `127.0.0.1:3000` (hostPort).
  - **mesh-dev** — deployment `witnessops-web-dev` — mesh-only `http://10.44.0.2:3015` (`hostNetwork`, emptyDir intake — never shares prod PVC).
- Both lanes must run the **same shared image tag** for fair CSS/UI compare. Shared builds always bake `NEXT_PUBLIC_OS_SITE_URL=https://witnessops.com`.
- **`pnpm deploy:k3s:smoke` enforces** (exit non-zero on failure):
  1. **identical container image refs** on prod and mesh-dev (not CSS-only),
  2. HTTP 200 on prod home and mesh-dev home,
  3. matching primary CSS hash.
  Unit tests for the image/CSS compare helpers: `pnpm deploy:k3s:test-parity`.
- **Intentional non-parity (do not “fix” these):**
  - mesh-dev bind: `hostNetwork` `HOSTNAME=10.44.0.2` `PORT=3015`
  - mesh-dev `WITNESSOPS_VERIFY_BASE_URL=http://10.44.0.2:3015`
  - mesh-dev **emptyDir** intake (never prod PVC)
  - prod hostPort `127.0.0.1:3000` + Caddy public edge
- **Secret/envFrom parity:** mesh-dev must include the same non-lane `secretRef`s as prod (`witnessops-web-env`, `witnessops-web-admin-oidc`). Lane-only env keys stay under the mesh-dev env block.
- **Repo deploy entrypoints** (prefer these over ad-hoc docker/kubectl):

  | Goal | Command |
  | --- | --- |
  | Build shared image only | `pnpm deploy:k3s:build` |
  | Deploy prod | `pnpm deploy:k3s:prod` |
  | Deploy mesh-dev | `pnpm deploy:k3s:dev` |
  | Build once → both lanes | `pnpm deploy:k3s:both` |
  | Status + image/HTTP/CSS smoke | `pnpm deploy:k3s:smoke` or `pnpm deploy:k3s:status` |
  | Parity unit tests | `pnpm deploy:k3s:test-parity` |
  | Remove mesh-dev only | `pnpm deploy:k3s:dev:teardown` |

  Scripts live under `deploy/scripts/k3s-*.sh` and source `k3s-lib.sh` / `k3s-parity.sh`.
- **Env for agents / local Mac:**
  - `DEPLOY_SSH=ops-dev-01` (default; needs WireGuard mesh jump). Fallback: `DEPLOY_SSH=root@194.147.221.89`.
  - Dirty tree: `ALLOW_DIRTY=1` (required if uncommitted work must ship; still record dirty state in receipts).
  - Mesh smoke needs WG up: `sudo wg-quick up wg-edge-01`. Hub must allow peer TCP on `wg0` (`10.44.0.0/24`).
- DNS/Cloudflare, Caddy rewrites, API/app exposure, and OffSec product-surface exposure require separate explicit lanes.
- A public web deploy does not imply SaaS, app, API, or OffSec readiness.
- **Do not use** legacy `deploy/scripts/deploy.sh` / GHCR / goal0 Compose as live authority (historical only; see INSTALL.md).
- Azure Container Apps is retired. Root `azure.yaml` and `infra/**` were archived under `docs/archive/azure-aca-retired-20260508/`.
- Do not run `az`, `azd`, Bicep deployment, Azure inventory, Azure cleanup, Azure rollback, or Azure restore work from this repo unless a separate explicit Azure reopening lane names the allowed cloud surfaces, commands, receipts, and stop boundary.
- Do not treat archived Azure files as active deploy authority, rollback authority, or evidence that Azure resources exist.

## Local vs mesh-dev vs prod (when working on web)

| Mode | Use when | How |
| --- | --- | --- |
| Local dev server | UI/API iteration on laptop | `pnpm dev` (app filter) — never points public DNS at localhost |
| mesh-dev (k3s) | Shared runtime parity, form/mail, “does it look like prod?” | `pnpm deploy:k3s:dev` or `pnpm deploy:k3s:both`; open `http://10.44.0.2:3015` over WG |
| prod | Buyer-visible public site | `pnpm deploy:k3s:prod` or both; verify `https://witnessops.com` |

Default for “deploy this so we can check on mesh and public”: **`pnpm deploy:k3s:both`** (one image, both lanes). After deploy: **`pnpm deploy:k3s:smoke`**.

## Root file hygiene

- Treat project-root files as operator authority surfaces. Do not delete or rename root files unless the PR names the target files and proves they are stale.
- A root-file deletion PR must include evidence that the file is unused, superseded, or duplicate: search references, command references, package-script references, and replacement location where applicable.
- Do not remove active root authority files such as repo instructions, command contracts, security policy, workspace/package contracts, or public README material as part of unrelated page work.
- Keep root cleanup separate from public copy, verifier semantics, receipt semantics, release, or deploy changes.

## Public proof-surface and sample artifact contract

- The AI Agent Action Proof Run sample page is a public proof-surface, not proof authority by itself.
- Keep sample artifact identity in `apps/witnessops-web/src/app/review/sample-cases/ai-agent-action-proof-run/sample-artifact-contract.ts`.
- Do not hard-code sample commits, manifest hashes, artifact digests, or sample URLs directly in the page when a contract field exists.
- Keep `artifact-links.test.ts` aligned with the sample artifact contract.
- Keep `scripts/smoke-buyer-path.ts` aligned with buyer-visible proof markers.
- Current web-side boundary: the web contract records pinned sample manifest provenance and displays artifact digests, but it does not recompute individual source artifact hashes locally.
- Cross-repo sample artifact verification must be handled in a separate lane before claiming source artifact bytes were independently recomputed by this repo.

## Codex Security review

Use [`docs/CODEX_SECURITY_THREAT_MODEL.md`](./docs/CODEX_SECURITY_THREAT_MODEL.md) as the seed context for Codex Security review.

Codex Security may identify findings and propose patches, but it does not authorize merge, deploy, public verification claims, release, or customer-impacting changes.

For security-sensitive changes, preserve these boundaries:

- `/verify` and `/api/verify` accept untrusted receipt input.
- Invalid, incomplete, ambiguous, or malformed receipt input must not be presented as verified.
- Receipt parsing, public result rendering, copy, smoke tests, and route parity must not overclaim what the verifier proved.
- The web surface does not issue, sign, mutate, backfill, or store receipts as part of normal verification.
- Do not add production secrets, customer data, signing keys, cloud credentials, or private evidence bundles to tests, examples, prompts, or fixtures.

## Optimization and language strategy

- Before proposing a new runtime (Go/Rust sidecar, WASM crypto, full rewrite), read [`docs/OPTIMIZATION-LANGUAGE.md`](./docs/OPTIMIZATION-LANGUAGE.md).
- Grok project skill: `.grok/skills/optimize-witnessops-web/SKILL.md` (`/optimize-witnessops-web`).
- Fast regression after proof/verify edits: `pnpm optimize:quick-check` (requires `pnpm install`).
- **Node 22 builder** may live in a container or staging node rather than the fleet VM (Node 20): see [`docs/NODE22-BUILDER.md`](./docs/NODE22-BUILDER.md). Use `pnpm health:node22` (local Docker) or an explicitly authorized mesh build lane for release-quality validation.

## Validation

- `pnpm health` — requires **Node 22** on the host (see `.nvmrc`) or run `pnpm health:node22`
- route parity against the frozen baseline captured at slice start
- buyer-path smoke when public buyer or proof-surface copy changes: `pnpm smoke:buyer-path:test`
- after k3s apply: `pnpm deploy:k3s:smoke` (prod + mesh-dev HTTP/CSS when both are up)
