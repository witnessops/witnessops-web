---
name: optimize-witnessops-web
description: >
  Investigate and apply performance or architecture optimizations for the witnessops-web
  monorepo (Next.js 15, TypeScript, @witnessops/proof).
  Use when the user asks to optimize witnessops-web, choose a language for verify/UI,
  run pnpm health, or runs /optimize-witnessops-web. Read
  docs/OPTIMIZATION-LANGUAGE.md before proposing rewrites or new runtimes.
  Deployment classification is docs/DEPLOYMENT_AUTHORITY.md.
  pnpm deploy:k3s:build, deploy:k3s:prod, and deploy:k3s:both are retired.
metadata:
  short-description: "Optimize witnessops-web (TS-first; see DEPLOYMENT_AUTHORITY)"
---

# Optimize witnessops-web

This is the Cursor project copy of `.grok/skills/optimize-witnessops-web/SKILL.md`.
The original stays in place. `pnpm optimize:quick-check` runs this copy's
`scripts/quick-check.sh`, which propagates a `pnpm proof:test` failure.
The `.grok` script has the same fail-closed `proof:test` line. Do not delete the original.
This copy's deploy section follows `docs/DEPLOYMENT_AUTHORITY.md`. Leave the `.grok` skill unchanged
unless a separate change asks to update it.

Repo root for all paths below: **this monorepo** (`witnessops-web`).

The shell hook in `.cursor/hooks.json` blocks live deploy entrypoints (`deploy:k3s` deploy, status, smoke, teardown, and hygiene; `deploy/k8s/apply.sh`; registry publish; the host-adapter installer; and `gh workflow run` of the AWS release workflows), plus `kubectl`, `git push --force`, and `rm -rf`. Report those as founder actions. Do not work around the hook.

## Four deliverables (this lane)

| # | Path |
|---|------|
| 1 | `docs/OPTIMIZATION-LANGUAGE.md` |
| 2 | `.grok/skills/optimize-witnessops-web/SKILL.md` and this Cursor copy |
| 3 | `.grok/skills/optimize-witnessops-web/scripts/quick-check.sh` |
| 4 | `AGENTS.md` — section **Optimization and language strategy** |

Close the loop: `pnpm install --frozen-lockfile` then `pnpm optimize:quick-check`; use **`pnpm health:node22`** before release (see `docs/NODE22-BUILDER.md`).

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
- Deploy: follow [`docs/DEPLOYMENT_AUTHORITY.md`](../../../docs/DEPLOYMENT_AUTHORITY.md). `pnpm deploy:k3s:build`, `pnpm deploy:k3s:prod`, and `pnpm deploy:k3s:both` are retired. The active routine website release is `.github/workflows/aws-release.yml` with `aws-release-reusable.yml` and `deploy/aws/**`. A merge does not deploy.

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

## Deployment authority

Routine production deploy is not a local `pnpm deploy:k3s:*` command.
`pnpm deploy:k3s:build`, `pnpm deploy:k3s:prod`, and `pnpm deploy:k3s:both` run
`deploy/scripts/retired-production-deploy.mjs` and exit with an error. They are retired.

Current classification is [`docs/DEPLOYMENT_AUTHORITY.md`](../../../docs/DEPLOYMENT_AUTHORITY.md):

- Active routine website release: `.github/workflows/aws-release.yml` and `.github/workflows/aws-release-reusable.yml`, with `deploy/aws/**` as the website deployment source. Dispatch is a separate operator action. A merge does not deploy.
- `deploy/k8s/**` and retained `deploy/scripts/k3s-*` helpers are retained runtime, dev, and recovery source, not the routine production path.
- Legacy Compose/GHCR direct-deploy helpers and retired Azure material stay historical.

Do not run those deploy, status, smoke, teardown, or hygiene commands from this skill. The shell hook blocks them. Report production publication as a founder action.

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
# runs the fail-closed Cursor copy:
# bash .cursor/skills/optimize-witnessops-web/scripts/quick-check.sh
```

Runs proof tests + verify + mesh-gate route tests (faster than full `pnpm health`).
A `pnpm proof:test` failure in the Cursor copy stops the script.

## When to stop and ask the user

- Proposing **Go/Rust sidecar**, **blake3 in production web verify**, or **widening proof** into full bundle/corpus verify.
- Any change that alters **public verification claims** or ships without `pnpm health` (or documented equivalent) on the change host.
