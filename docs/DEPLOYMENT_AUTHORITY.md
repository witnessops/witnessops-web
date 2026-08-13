# Deployment authority

Status: `private_caddy_k3s_dual_lane`
Last updated: 2026-08-13

This document classifies deployment-related repository surfaces for
`witnessops-web`. It is repo-local guidance and is not deploy approval, release
approval, production verification, cloud inventory, rollback approval, or server
administration authority.

## Current production authority (dual-lane)

Current public + mesh-dev runtime path. Concrete host, address, namespace,
workload, Secret and PVC names are held outside this public repository and
injected through the variables listed in `deploy/topology.env.example`.

```text
Public:
  DNS
  -> private target from DEPLOY_SSH custody
  -> systemd caddy.service
  -> reverse_proxy 127.0.0.1:3000
  -> k3s namespace DEPLOY_NS
  -> deployment PROD_DEPLOY
  -> hostPort 127.0.0.1:3000

Mesh-dev (not public; private network only):
  operator client
  -> MESH_DEV_URL
  -> k3s deployment DEV_DEPLOY
  -> hostNetwork bind MESH_BIND_HOST:MESH_BIND_PORT
  -> emptyDir volumes (no prod PVC)
```

Custody map: [`DEPLOYMENT_CUSTODY.md`](./DEPLOYMENT_CUSTODY.md).

### Canonical deploy helpers (in this repo)

| Script | Purpose |
| --- | --- |
| `deploy/scripts/k3s-build-shared.sh` | Build one shared image from HEAD; import into k3s; no deploy |
| `deploy/scripts/k3s-deploy-prod.sh` | Build (optional) + preflight Secrets + atomically reconcile prod image and exact ordered `envFrom` |
| `deploy/scripts/k3s-deploy-dev.sh` | Build (optional) + validate image + apply mesh-dev manifest with exact ordered `envFrom` |
| `deploy/scripts/k3s-deploy-both.sh` | Build once → prod + mesh-dev + exact-contract smoke |
| `deploy/scripts/smoke-prod-dev.sh` | Exact runtime `envFrom` + image ref + HTTP 200 + CSS hash parity |
| `deploy/scripts/k3s-status.sh` | kubectl image/ready + exact-contract smoke |
| `deploy/scripts/k3s-parity.sh` | Pure image/CSS, ordered `envFrom`, OIDC key-name, and image-ref validation helpers |
| `deploy/scripts/test-k3s-parity.sh` | Unit tests for parity, Secret preflight, and deploy reconciliation |
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
  happens to match. It also requires HTTP 200 on both homes, matching CSS, and
  the exact ordered application-container `envFrom` contract on both lanes.
- That exact `envFrom` contract is `BASE_ENV_SECRET`, then
  `ADMIN_OIDC_SECRET`, each as a `secretRef` with an empty prefix and
  `optional=false`. Source, order, prefix, or `optional` drift fails smoke.
- The production deploy helper reconciles the image and exact `envFrom`
  contract atomically after a fail-closed Secret preflight. The OIDC Secret must
  contain `WITNESSOPS_ADMIN_SECRET` plus the five
  `WITNESSOPS_GOOGLE_*` key names used by Google admin authentication. Credential
  values are never decoded, emitted, or logged. The bounded
  `WITNESSOPS_ADMIN_ROLE` enum is decoded into captured shell state, validated,
  and used only to bind migration of an exactly matching legacy explicit role.
- Extra dormant Microsoft OIDC or legacy-key credential entries are deliberately
  untouched. Removing them requires separate custody-cleanup authorization.

The legacy `deploy/k8s/apply.sh` helper runs the OIDC key-name preflight before
any cluster mutation. Its `DEPLOY_NS` namespace and `ADMIN_OIDC_SECRET` must
therefore be preprovisioned; the helper does not create or update that Secret.

### Intentional non-parity (not drift)

- Mesh-dev runtime env overrides: `PORT=MESH_BIND_PORT`,
  `HOSTNAME=MESH_BIND_HOST`, `WITNESSOPS_VERIFY_BASE_URL=MESH_DEV_URL`
- Mesh-dev `hostNetwork` + emptyDir volumes (no prod PVC)
- Prod hostPort `127.0.0.1:3000` + public Caddy edge

### Operator env

| Variable | Source | Notes |
| --- | --- | --- |
| `DEPLOY_SSH` | required private custody | SSH target |
| `ALLOW_DIRTY` | unset | Set `1` to build from dirty tree |
| `MESH_DEV_URL` | required private custody | Local smoke target |
| `PROD_URL` | `https://witnessops.com` | Public smoke target |

The configured private network path is required for mesh-dev smoke and private
SSH. Network profile, peer and CIDR details stay outside this public repo.

## Authority split

Public web content authority:

- web app source
- package scripts
- catalog/source content
- route parity and buyer-path verification

Deploy authority:

- timestamped shared image build with image ID captured
- in-repo k3s scripts targeting the injected `PROD_DEPLOY` and/or `DEV_DEPLOY`
- rollout status and dual-lane smoke when both are in scope
- known-good rollback image redeployed through the prod reconciler, with exact
  `envFrom` reconciliation and smoke captured in the receipt

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

Any future lane that reactivates Docker Compose, GHCR release deployment,
Azure, or another active host must name validation commands, DNS state, image
custody, and rollback.

## Historical Docker Compose lane

Older docs describe a unified public host using Caddy and Docker Compose. That
path is historical and is not the current production authority for
`witnessops.com`; its concrete topology is deliberately omitted here.

Keep those notes as history unless a future lane explicitly reactivates them.
Do not use `deploy/docker-compose.yml`, `deploy/scripts/deploy.sh`, or the old
retired Caddy snippets as live authority without a fresh authority lane.
