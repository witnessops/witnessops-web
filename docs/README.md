# Repository docs

Repository-local docs for `witnessops-web` live here when they describe repo
operation, security review context, product decisions, or maintenance rules
that are not public site content.

## Current docs

- [`commercial/`](./commercial/README.md) — commercial delivery kit.
- [`EMAIL-SIGNATURE-RESEND.md`](./EMAIL-SIGNATURE-RESEND.md) — public ops signature paste rules.
- [`CODEX_SECURITY_THREAT_MODEL.md`](./CODEX_SECURITY_THREAT_MODEL.md) — seed context for Codex Security review.
- [`ROOT_SURFACE_INVENTORY.md`](./ROOT_SURFACE_INVENTORY.md) — root/subtree authority-file inventory and stale-file deletion gate.
- [`OPTIMIZATION-LANGUAGE.md`](./OPTIMIZATION-LANGUAGE.md) — language/runtime strategy for optimizing witnessops-web.
- [`NODE22-BUILDER.md`](./NODE22-BUILDER.md) — Node 22 validation guidance without host-specific custody details.
- [`R2-LOCAL-SERVER-AUDIT-VERIFY-ADAPTER.md`](./R2-LOCAL-SERVER-AUDIT-VERIFY-ADAPTER.md) — Local-server-audit structural receipt adapter for `/api/verify`.

## Boundaries

- This folder is repository-local documentation, not canonical public proof law.
- Public site docs live under `content/witnessops/docs/` and are rendered through the app docs routes.
- Do not place production secrets, customer evidence, private proof bundles, signing keys, cloud credentials, host identity, private network topology, credential locations, or operator-only rollback details here.
- Do not delete repository-local docs as part of public copy, route, verifier, receipt, or deployment work unless the PR names the file and proves the replacement or stale status.
- Archived cloud/deployment material is historical reference only and must not be treated as current deployment, rollback, or restore authority.
- Production mutation and runtime-state claims require separately authorized operator custody and release-specific evidence; repository-local prose is not sufficient evidence of live state.

## Validation

`pnpm docs:validate` validates public MDX under `content/witnessops/docs`; it does
not scan repository-local `docs/*.md`. For changes in this folder, also inspect
the changed references directly and run the repository health gate:

```bash
pnpm docs:validate
pnpm health
```
