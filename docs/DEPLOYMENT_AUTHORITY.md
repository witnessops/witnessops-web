# Deployment authority

Status: `ops_dev_01_caddy_k3s_dual_lane`
Last updated: 2026-07-29

This document classifies deployment-related repository surfaces for
`witnessops-web`. It is repo-local guidance and is not deploy approval, release
approval, production verification, cloud inventory, rollback approval, or server
administration authority.

## Current production authority (dual-lane)

Current public + mesh-dev runtime path on **ops-dev-01**:

```text
Public:
  DNS A 194.147.221.89
  -> ops-dev-01
  -> systemd caddy.service
  -> reverse_proxy 127.0.0.1:3000
  -> k3s namespace witnessops
  -> deployment witnessops-web
  -> hostPort 127.0.0.1:3000

Mesh-dev (not public; WireGuard only):
  client on 10.44.0.0/24
  -> 10.44.0.2:3015
  -> k3s deployment witnessops-web-dev
  -> hostNetwork bind HOSTNAME=10.44.0.2 PORT=3015
  -> emptyDir volumes (no prod PVC)
```

Custody map: [`DEPLOYMENT_CUSTODY.md`](./DEPLOYMENT_CUSTODY.md).

### Canonical deploy helpers (in this repo)

| Script | Purpose |
| --- | --- |
| `deploy/scripts/k3s-build-shared.sh` | Build one shared image from HEAD; import into k3s; no deploy |
| `deploy/scripts/k3s-deploy-prod.sh` | Build (optional) + deploy prod |
| `deploy/scripts/k3s-deploy-dev.sh` | Build (optional) + deploy mesh-dev |
| `deploy/scripts/k3s-deploy-both.sh` | Build once → prod + mesh-dev + smoke |
| `deploy/scripts/smoke-prod-dev.sh` | Image ref + HTTP 200 + CSS hash parity |
| `deploy/scripts/k3s-status.sh` | kubectl image/ready + smoke |
| `deploy/scripts/k3s-parity.sh` | Pure image/CSS compare helpers (unit-tested) |
| `deploy/scripts/test-k3s-parity.sh` | Unit tests for parity helpers |
| `deploy/scripts/k3s-dev-teardown.sh` | Delete mesh-dev only |

pnpm aliases (monorepo root):
`deploy:k3s:build|prod|dev|both|smoke|status|test-parity|dev:teardown`.

Shared helpers: `deploy/scripts/k3s-lib.sh` + `k3s-parity.sh`. Manifest template for
mesh-dev: `deploy/k8s/dev-mesh-deployment.yaml`.

Do **not** use external mesh-agent helpers as the sole authority when this repo’s
scripts cover the lane. Prefer in-repo scripts so agents and humans share one path.

### Image contract and enforced parity

- Tag form: `docker.io/library/witnessops-web:main-<shortsha>-<UTC>`
- Shared bake always sets public origin (`NEXT_PUBLIC_OS_SITE_URL=https://witnessops.com`)
  so prod and mesh-dev CSS/asset hashes match when the image tag matches.
- **`pnpm deploy:k3s:smoke` fails when prod image ≠ mesh-dev image**, even if CSS
  happens to match. Also requires HTTP 200 on both homes and matching CSS.
- Mesh-dev **secret refs** must match prod non-lane secrets:
  `witnessops-web-env`, `witnessops-web-admin-oidc`.

### Intentional non-parity (not drift)

- Mesh-dev runtime env overrides: `PORT=3015`, `HOSTNAME=10.44.0.2`,
  `WITNESSOPS_VERIFY_BASE_URL=http://10.44.0.2:3015`
- Mesh-dev `hostNetwork` + emptyDir volumes (no prod PVC)
- Prod hostPort `127.0.0.1:3000` + public Caddy edge

### Operator env

| Variable | Default | Notes |
| --- | --- | --- |
| `DEPLOY_SSH` | `ops-dev-01` | Mesh jump SSH. Fallback: `root@194.147.221.89` |
| `ALLOW_DIRTY` | unset | Set `1` to build from dirty tree |
| `MESH_DEV_URL` | `http://10.44.0.2:3015` | Local smoke target |
| `PROD_URL` | `https://witnessops.com` | Public smoke target |

WireGuard required for mesh-dev smoke and for default SSH host `ops-dev-01`
(`ProxyJump wg-edge-01`). Hub must allow peer-to-peer TCP on `wg0` for
`10.44.0.0/24`.

## Authority split

Public web content authority:

- web app source
- package scripts
- catalog/source content
- route parity and buyer-path verification

Deploy authority:

- timestamped shared image build with image ID captured
- in-repo k3s scripts targeting `witnessops-web` and/or `witnessops-web-dev`
- rollout status and dual-lane smoke when both are in scope
- rollback image or `kubectl rollout undo` captured in the receipt

DNS/Cloudflare authority:

- separate lane only
- no DNS write, Cloudflare write, record cleanup, TTL change, or proxy change in
  normal web deploy lanes

Caddy authority:

- separate lane only unless a web apply lane explicitly authorizes a narrow
  public-route gate adjustment
- no broad Caddy rewrites or reloads as part of routine content deploys

App/API exposure authority:

- separate lane only
- a public web deploy does not expose or launch unfinished APIs, admin panels,
  or unfinished product portals to the public internet
- mesh-dev is intentionally reachable only on the WireGuard mesh; do not publish
  it via Caddy/DNS without a separate exposure lane

OffSec/product surface authority:

- separate lane only
- a public web deploy does not imply SaaS/app/offsec readiness

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

Any future lane that reactivates goal0/Docker Compose, GHCR release deployment,
Azure, or another active host must name validation commands, DNS state, image
custody, and rollback.

## Historical goal0 / Docker Compose lane

Older docs describe **goal0-edge-01** (`167.235.12.232`) as a unified public
host using Caddy and Docker Compose. That path existed as an intended or
historical deployment lane, but it is not the current production authority for
`witnessops.com`.

Keep those notes as history unless a future lane explicitly reactivates them.
Do not use `deploy/docker-compose.yml`, `deploy/scripts/deploy.sh`, or the old
goal0 Caddy snippets as live authority without a fresh authority lane.
