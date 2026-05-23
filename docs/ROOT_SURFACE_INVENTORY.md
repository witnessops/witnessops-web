# Root surface inventory

This document records the stale-surface sweep performed after public proof-surface hardening.

## Scope

Inventory target: repository root authority files, repository-local docs, AGENTS files, and obvious stale public-surface leftovers discoverable through GitHub connector search.

This is not a full filesystem audit. It records the bounded connector-backed sweep and the current deletion gate for future cleanup.

## Observed active root authority files

The following root files were inspected and treated as active authority surfaces:

- `README.md` — repo orientation and current public proof-surface boundary.
- `commands.md` — frozen operator command contract aligned to root `package.json` scripts.
- `SECURITY.md` — vulnerability reporting and public proof-surface reporting boundary.
- `AGENTS.md` — root operator and agent instructions.
- `pnpm-workspace.yaml` — workspace package scope.
- `package.json` — root script and dependency authority.

## Observed active subtree authority files

- `apps/witnessops-web/AGENTS.md` — app subtree operator and proof-surface instructions.
- `apps/witnessops-web/next.config.js` — active Next.js runtime/build configuration.
- `apps/witnessops-web/Dockerfile` — active standalone runtime image definition.
- `docs/README.md` — repository-local docs index.
- `docs/CODEX_SECURITY_THREAT_MODEL.md` — seed context for Codex Security review.
- `docs/DEPLOYMENT_AUTHORITY.md` — repo-local deployment authority classification.

## Observed retired deployment archive

The following files are preserved as historical reference only and are not active
deployment authority:

- `docs/archive/azure-aca-retired-20260508/azure.yaml` — retired Azure Developer CLI service definition.
- `docs/archive/azure-aca-retired-20260508/infra/` — retired Azure Container Apps Bicep material.

The active hosting lane is classified in `docs/DEPLOYMENT_AUTHORITY.md`.

## Sweep results

No deletion candidates were approved during this pass.

Observed findings:

- Root `README.md` was active but stale in scope; refreshed separately.
- `commands.md` was active but stale in command coverage; refreshed separately.
- `SECURITY.md` was active but stale in public proof-surface scope; refreshed separately.
- `docs/README.md` was active but placeholder-like; refreshed separately.
- Root and app `AGENTS.md` were active but stale in public proof-surface and root-hygiene guidance; refreshed separately.
- Searches for stale public labels, TODO/FIXME/deprecated markers, backup/temp markers, and mutable sample links did not produce deletion-ready targets.
- 2026-05-23 update: root `azure.yaml` and `infra/**` were classified as retired Azure ACA material and moved to `docs/archive/azure-aca-retired-20260508/`.

## Deletion gate

A future stale-file deletion PR must name each target file and include evidence for each target:

- reference search result
- command/script usage check
- route or import ownership check where applicable
- replacement file or superseding authority, if any
- reason deletion is safer than refresh
- validation command set

Without that evidence, prefer refresh, index, or explicit hold over deletion.

## Boundary

This inventory is repository-local documentation. It does not change public site copy, verifier behavior, receipt semantics, package scripts, Azure resources, server-provider state, or customer-facing flows.
