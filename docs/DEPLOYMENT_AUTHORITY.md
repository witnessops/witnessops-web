# Deployment authority

Status: `goal0_unified_public_edge02_retired`
Last updated: 2026-06-21

This document classifies deployment-related repository surfaces for
`witnessops-web`. It is repo-local guidance and is not deploy approval, release
approval, production verification, cloud inventory, rollback approval, or server
administration authority.

## Active hosting lane (target)

The **unified public origin** is **goal0-edge-01** (`167.235.12.232`, mesh
`10.44.0.5`). On that host:

- **Caddy** terminates TLS for `witnessops.com` / `www` (see lane packet
  `witnessops-public.Caddyfile` in OffSec-Lane).
- **Docker** runs this app on `127.0.0.1:3000` (`deploy/docker-compose.yml`).
- **OffSec product vhosts** (static + Gitea) share the same public IP — see
  OffSec-Lane `offsec-public.Caddyfile`.

Operator lane doc: OffSec-Lane `docs/local-mesh/SINGLE-PUBLIC-HOST.md`.

### Migration from Servury / edge02

Historically, production ran on Servury **edge02** (`89.213.118.222`). Cutover
steps:

1. Install `/srv/witnessops` + compose on goal0 (`deploy/INSTALL.md`).
2. Import `witnessops-public.Caddyfile` into goal0 Caddy; reload.
3. Point Cloudflare A records for `witnessops.com` / `www` to `167.235.12.232`.
4. Smoke public routes; then retire edge02 container.

Until DNS moves, edge02 may still serve traffic — treat goal0 as the **only**
long-term public compute surface.

This repository's active runtime inputs are:

- web app source
- package scripts
- `apps/witnessops-web/Dockerfile`
- `deploy/` compose, Caddy snippet, `deploy.sh`
- environment examples
- local validation commands (`pnpm health` on Node 22, or `pnpm health:node22` / `pnpm health:node22:goal0` — see `docs/NODE22-BUILDER.md`)

Provider-side server configuration, DNS operations, secrets, billing, and host
administration are outside this repository unless a separate lane explicitly
names those surfaces.

## Retired Azure lane: hard boundary

The Azure Container Apps material is retired and archived at:

```text
docs/archive/azure-aca-retired-20260508/
```

That archive is historical reference only. Do not run `az`, `azd`, or Bicep
from this repo unless an explicit Azure reopening lane authorizes it.

## Review boundary

Changes to this deployment authority classification should remain separate from
public copy, verifier semantics, receipt semantics, and release tagging.

Any PR that reactivates Azure or changes the active host must name validation
commands, DNS state, and rollback (previous digest via `deploy.sh rollback`).