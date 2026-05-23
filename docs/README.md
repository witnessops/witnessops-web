# Repository docs

Repository-local docs for `witnessops-web` live here when they describe repo operation, security review context, or maintenance rules that are not public site content.

## Current docs

- [`CODEX_SECURITY_THREAT_MODEL.md`](./CODEX_SECURITY_THREAT_MODEL.md) — seed context for Codex Security review.
- [`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md) — repo-local deployment authority classification; Servury/edge02 is the active hosting lane and Azure ACA material is retired.
- [`ROOT_SURFACE_INVENTORY.md`](./ROOT_SURFACE_INVENTORY.md) — root/subtree authority-file inventory and stale-file deletion gate.

## Boundaries

- This folder is repository-local documentation, not canonical public proof law.
- Public site docs live under `content/witnessops/docs/` and are rendered through the app docs routes.
- Do not place production secrets, customer evidence, private proof bundles, signing keys, or cloud credentials here.
- Do not delete repository-local docs as part of public copy, route, verifier, receipt, or deployment work unless the PR names the file and proves the replacement or stale status.
- Historical deployment material lives under [`archive/`](./archive/) only when a PR explicitly classifies it as non-active.
- Agents must not treat archived Azure material as active deployment, rollback, or restore authority.
- Azure work requires a separate explicit Azure reopening lane; otherwise route deploy-adjacent work through [`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md).

## Validation

For doc-only changes in this folder, run:

```bash
pnpm docs:validate
pnpm health
```
