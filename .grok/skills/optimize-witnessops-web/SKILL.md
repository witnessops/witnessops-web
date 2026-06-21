---
name: optimize-witnessops-web
description: >
  Investigate and apply performance or architecture optimizations for the witnessops-web
  monorepo (Next.js 15, TypeScript, @witnessops/proof, goal0 mesh deploy). Use when the user
  asks to optimize witnessops-web, choose a language for verify/UI/deploy, run pnpm health,
  mesh deploy smoke, or runs /optimize-witnessops-web. Read docs/OPTIMIZATION-LANGUAGE.md
  before proposing rewrites or new runtimes.
metadata:
  short-description: "Optimize witnessops-web (TS-first, mesh deploy)"
---

# Optimize witnessops-web

Repo root for all paths below: **this monorepo** (`witnessops-web`).

## Four deliverables (this lane)

| # | Path |
|---|------|
| 1 | `docs/OPTIMIZATION-LANGUAGE.md` |
| 2 | `.grok/skills/optimize-witnessops-web/SKILL.md` (this file) |
| 3 | `.grok/skills/optimize-witnessops-web/scripts/quick-check.sh` |
| 4 | `AGENTS.md` — section **Optimization and language strategy** |

Close the loop: `pnpm install --frozen-lockfile` then `pnpm optimize:quick-check`; use **`pnpm health:node22`** (Docker) or **`pnpm health:node22:goal0`** before release — fleet VM Node 20 is not the builder (see `docs/NODE22-BUILDER.md`).

## Language decision (read first)

Open [`docs/OPTIMIZATION-LANGUAGE.md`](../../../docs/OPTIMIZATION-LANGUAGE.md) and follow its layered table:

- **Default:** stay **TypeScript** for app, APIs, and `@witnessops/proof`.
- **Python:** offline mesh/Shield scripts and `tools/witnessops-security-validators` only — not in the Next request path.
- **Rust/WASM or Go sidecar:** only after profiling + parity tests + explicit ADR; never as the first optimization.

Do not recommend a full language rewrite without user authorization and a written benchmark gap.

## Authority boundaries (`AGENTS.md`)

- `/verify` and `/api/verify` accept **untrusted** receipt input; never overclaim verification.
- `packages/proof` stays receipt-only unless a separate lane widens scope.
- Mesh gate (`/api/mesh-gate`, `src/lib/mesh-gate.ts`) is **operator mesh hygiene** — not customer security proof.
- Deploy: **goal0-edge-01** per `docs/DEPLOYMENT_AUTHORITY.md`; no Azure ACA from this repo.

## Investigation workflow

1. **Classify the bottleneck** — build time, bundle size, verify CPU, I/O (OIDC/intake), or static/docs weight.
2. **Map to layer** — app UI, API route, `@witnessops/proof`, static `public/` samples, or off-repo Python (Shield/mesh).
3. **Prefer TS-local fixes** — bounded body reads, adapter thinness, server-only imports, standalone output already enabled in `apps/witnessops-web/next.config.js`.
4. **If crypto/canonicalization** — extend tests in `packages/proof` and `fixtures/mesh-gate/`; match Python `sort_keys` + SHA256 rules in `mesh-gate.ts`.
5. **Document** — update `docs/OPTIMIZATION-LANGUAGE.md` only when the language strategy changes.

## Verification commands (run from repo root)

Full gate (release-quality, **Node 22**):

```bash
pnpm health:node22
# remote on goal0 after sync:
pnpm health:node22:goal0
```

On a host that already has Node 22 (`.nvmrc`): `pnpm install --frozen-lockfile && pnpm health`.

Targeted (after proof or verify changes):

```bash
pnpm proof:test
pnpm --filter witnessops-web test
node --import tsx --test apps/witnessops-web/src/app/api/verify/route.test.ts
node --import tsx --test apps/witnessops-web/src/app/api/mesh-gate/route.test.ts
```

Public buyer / proof-surface copy changes:

```bash
pnpm smoke:buyer-path:test
```

If `pnpm` is missing on a fleet VM, use the same commands from a host with Node 22 + corepack, or run tests via `node --import tsx` as in `package.json` scripts.

## Mesh build and deploy (goal0)

Working copy on fleet VM often lives under `~/DEV/OffSec/working/sources/witnessops-web`.

| Step | Reference |
|------|-----------|
| Docker mesh image | `deploy/Dockerfile.mesh` (Node 22, `pnpm build`, standalone) |
| Lane README | `README-LANE.md` |
| Bastion-driven mesh | `~/DEV/OffSec/scripts/run-witnessops-mesh-goal0.sh` |
| Sync witnessops-web | `LANE_TOP=~/DEV/OffSec ./scripts/sync-to-node-via-bastion.sh` (explicit `witnessops-web` hop) |
| goal0 deploy script | `/opt/offsec/scripts/deploy-witnessops-web-mesh.sh` (on goal0) |

Smoke after deploy (examples):

```bash
curl -sI https://witnessops.com/
curl -sS https://witnessops.com/.well-known/mesh-receipt-index.json | head
curl -sS -X POST https://witnessops.com/api/mesh-gate -H 'content-type: application/json' -d '{}' | head
```

Publish lanes (OffSec working tree, not always in this repo):

- Shield sample: `~/DEV/OffSec/working/scripts/publish-shield-sample-witnessops.sh`
- Mesh public: `~/DEV/OffSec/working/scripts/publish-mesh-public-witnessops.sh`

## Hot files (optimization touch map)

| Area | Paths |
|------|--------|
| Verify API | `apps/witnessops-web/src/app/api/verify/route.ts`, `src/lib/verify-adapter.ts` |
| Mesh gate | `apps/witnessops-web/src/app/api/mesh-gate/route.ts`, `src/lib/mesh-gate.ts` |
| Proof kernel | `packages/proof/src/receipt/**` |
| Next bundle | `apps/witnessops-web/next.config.js` (`transpilePackages`, `blake3` alias false) |
| Samples | `apps/witnessops-web/public/samples/`, `src/app/review/sample-cases/` |

## Optional helper script

```bash
pnpm optimize:quick-check
# or: bash .grok/skills/optimize-witnessops-web/scripts/quick-check.sh
```

Runs proof tests + verify + mesh-gate route tests (faster than full `pnpm health`).

## When to stop and ask the user

- Proposing **Go/Rust sidecar**, **blake3 in production web verify**, or **widening proof** into full bundle/corpus verify.
- Any change that alters **public verification claims** or ships without `pnpm health` (or documented equivalent) on the change host.