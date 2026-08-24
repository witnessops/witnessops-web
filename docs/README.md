# Repository docs

Repository-local docs for `witnessops-web` live here when they describe repo operation, security review context, or maintenance rules that are not public site content.

## Current docs

- [`commercial/`](./commercial/README.md) — **P0 commercial delivery kit** (fit-check replies, delivery email, claim blurbs, 15-min demo script, CSR + One Server dry-run).
- [`EMAIL-SIGNATURE-RESEND.md`](./EMAIL-SIGNATURE-RESEND.md) — Resend/Gmail signature paste rules.
- [`CODEX_SECURITY_THREAT_MODEL.md`](./CODEX_SECURITY_THREAT_MODEL.md) — seed context for Codex Security review.
- [`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md) — repo-local deployment authority classification; the current repository contract is private Caddy → k3s with prod and mesh-dev on one shared digest-qualified image. Azure ACA is retired.
- [`ROOT_SURFACE_INVENTORY.md`](./ROOT_SURFACE_INVENTORY.md) — root/subtree authority-file inventory and stale-file deletion gate.
- [`OPTIMIZATION-LANGUAGE.md`](./OPTIMIZATION-LANGUAGE.md) — language/runtime strategy for optimizing witnessops-web (TS-first, mesh deploy).
- [`NODE22-BUILDER.md`](./NODE22-BUILDER.md) — fleet VM vs goal0; run `pnpm health` on Node 22 (Docker or goal0).
- [`R2-LOCAL-SERVER-AUDIT-VERIFY-ADAPTER.md`](./R2-LOCAL-SERVER-AUDIT-VERIFY-ADAPTER.md) — Local-server-audit structural receipt adapter for `/api/verify` (primary WitnessOps schema + dual-read legacy offsecshield).

## Boundaries

- This folder is repository-local documentation, not canonical public proof law.
- Public site docs live under `content/witnessops/docs/` and are rendered through the app docs routes.
- Do not place production secrets, customer evidence, private proof bundles, signing keys, or cloud credentials here.
- Do not delete repository-local docs as part of public copy, route, verifier, receipt, or deployment work unless the PR names the file and proves the replacement or stale status.
- The Azure retirement archive lives under [`archive/`](./archive/). Other files may preserve explicitly labelled historical deployment paths in place for reconstruction.
- Agents must not treat archived Azure material as active deployment, rollback, or restore authority.
- Azure work requires a separate explicit Azure reopening lane; otherwise route deploy-adjacent work through [`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md).

## Validation

`pnpm docs:validate` validates public MDX under `content/witnessops/docs`; it does
not scan repository-local `docs/*.md`. For changes in this folder, also inspect
the changed references directly and run the repository health gate:

```bash
pnpm docs:validate
pnpm health
```
