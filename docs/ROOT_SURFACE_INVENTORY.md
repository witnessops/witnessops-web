# Root surface inventory

This file keeps the historical sweep below and records bounded follow-up reviews.
It is not a complete repository inventory or production-state record.

## Source-scope review — 2026-09-19

Source baseline: [`beada60e313199e7432841e1d1b0a93e140f1fc1`](https://github.com/witnessops/witnessops-web/tree/beada60e313199e7432841e1d1b0a93e140f1fc1).
This pass updates four orientation/scope documents only. It does not revalidate
all older documents or replace their commit-bound acceptance records.

| Reviewed file | Decision in this pass |
| --- | --- |
| `README.md` | Keep and update: distinguish the public website, authenticated app, CLI and shared packages; link to their maintained source/contracts. |
| `SECURITY.md` | Keep and update: include the app's authentication, membership, evidence, sharing and sandbox billing implementation in repository reporting scope without changing disclosure channels or response commitments. |
| `AGENTS.md` | Keep and update: separate repository-wide instructions, the public receipt-only lane and authenticated app/CLI boundaries; retain release restrictions. |
| `docs/ROOT_SURFACE_INVENTORY.md` | Keep the historical sweep and deletion gate; record the current scope without treating old findings as a fresh audit. |

### Source pointers added to the inventory

- [`apps/witnessops-app/README.md`](../apps/witnessops-app/README.md) — account/workspace admission, membership, evidence/imports, sharing, Help, sandbox billing and separate acceptance commands.
- [`apps/witnessops-app/src/lib/api-contract.ts`](../apps/witnessops-app/src/lib/api-contract.ts) — app route/action declarations and authentication boundaries; not a live endpoint inventory.
- [`packages/wops-cli/package.json`](../packages/wops-cli/package.json) — private CLI package, entrypoint and test command; not proof of published distribution.
- [`deploy/app/FINALIZER_RUNTIME.md`](../deploy/app/FINALIZER_RUNTIME.md) — separate app finalization contract, not an expansion of public `/verify`.

Root `tsconfig.base.json` and `witnessops-web-ui-map.md` remain held removal
candidates pending the deletion gate below; neither is removed or declared
unused by this pass. The July working-note cleanup is a separate change. Active
adapter documentation, archived deployment material and undecided research or
architecture notes are not reclassified here.

## Historical sweep after public proof-surface hardening

The following is the earlier bounded sweep, including its 2026-05-23 archive
update. Its scope, findings and "current" labels describe that earlier pass, not
an assessment of the later authenticated app. Original findings are preserved.

### Scope

Inventory target: repository root authority files, repository-local docs, AGENTS files, and obvious stale public-surface leftovers discoverable through GitHub connector search.

This is not a full filesystem audit. It records the bounded connector-backed sweep and the current deletion gate for future cleanup.

### Observed active root authority files

The following root files were inspected and treated as active authority surfaces:

- `README.md` — repo orientation and current public proof-surface boundary.
- `commands.md` — frozen operator command contract aligned to root `package.json` scripts.
- `SECURITY.md` — vulnerability reporting and public proof-surface reporting boundary.
- `AGENTS.md` — root operator and agent instructions.
- `pnpm-workspace.yaml` — workspace package scope.
- `package.json` — root script and dependency authority.

### Observed active subtree authority files

- `apps/witnessops-web/AGENTS.md` — app subtree operator and proof-surface instructions.
- `apps/witnessops-web/next.config.js` — active Next.js runtime/build configuration.
- `apps/witnessops-web/Dockerfile` — active standalone runtime image definition.
- `docs/README.md` — repository-local docs index.
- `docs/CODEX_SECURITY_THREAT_MODEL.md` — seed context for Codex Security review.
- `docs/DEPLOYMENT_AUTHORITY.md` — repo-local deployment authority classification.

### Observed retired deployment archive

The following files are preserved as historical reference only and are not active
deployment authority:

- `docs/archive/azure-aca-retired-20260508/azure.yaml` — retired Azure Developer CLI service definition.
- `docs/archive/azure-aca-retired-20260508/infra/` — retired Azure Container Apps Bicep material.

The active hosting lane is classified in `docs/DEPLOYMENT_AUTHORITY.md`.

### Sweep results

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

This inventory is repository-local documentation. It does not change public site copy, app or verifier behavior, receipt semantics, package scripts, provider state, deployment configuration, or customer-facing flows. Source presence is not production enablement or acceptance.
