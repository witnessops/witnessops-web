# WitnessOps Web Deployment Custody

Status: current production + mesh-dev custody note for `witnessops.com`
Last updated: 2026-08-13

This document records how the public WitnessOps web surface (and the mesh-only
dev twin) is served, built, deployed, verified, and rolled back. It is
documentation, not deploy approval. Any production change still needs an
explicit apply lane.

## Current Live Path

### Public (prod)

```text
witnessops.com / www.witnessops.com
-> DNS
-> private DEPLOY_SSH target
-> systemd caddy.service
-> /etc/caddy/Caddyfile
-> reverse_proxy 127.0.0.1:3000
-> k3s namespace DEPLOY_NS
-> deployment PROD_DEPLOY
-> container port 3000 (hostPort 127.0.0.1:3000)
-> image docker.io/library/witnessops-web:main-<sha>-<UTC>
-> PVC-backed intake / mail volumes
```

### Mesh-dev (private twin)

```text
operator laptop (private network)
-> MESH_DEV_URL
-> private hostNetwork bind
-> k3s deployment DEV_DEPLOY
-> same shared image tag as prod when aligned
-> emptyDir intake (isolated from prod PVC)
```

Pod names and exact image tags are observations that change every apply.
Record the live tag in the apply receipt; do not treat sample tags in this file
as permanent.

## Source

Current source custody:

- Repo: `witnessops-web` (`https://github.com/witnessops/witnessops-web`)
- Default branch: `main`
- Operator checkouts may live on Mac (`~/WitnessOps/repos/witnessops-web`) or
  other private nodes; build always rsyncs the checkout to `DEPLOY_SSH` via
  `deploy/scripts/k3s-lib.sh`.

Every apply lane must record starting HEAD and dirty state. Use
`ALLOW_DIRTY=1` only when intentionally shipping uncommitted work, and note
that in the receipt.

## Build

Production-quality builds use **Node 22** inside Docker on the private deploy target.

Canonical path (in-repo):

```bash
# from monorepo root
pnpm deploy:k3s:build              # image only
pnpm deploy:k3s:both               # shared image → prod + mesh-dev + smoke
# source the ignored private topology first
set -a; source deploy/topology.env; set +a
pnpm deploy:k3s:both
```

`k3s-lib.sh` `build_shared_image`:

1. Optional dirty-tree gate (`ALLOW_DIRTY=1` to skip)
2. rsync checkout → `/tmp/witnessops-web-build-<tag>/` on `DEPLOY_SSH`
3. Docker build with public origin baked in
4. `k3s ctr images import` on the node
5. Prints full image ref on stdout

Legacy `deploy/Dockerfile.mesh` remains as a reference Dockerfile; the dual-lane
scripts generate `deploy/Dockerfile.shared` on the build host for the shared bake.

Docker Compose is **not** current runtime authority for `witnessops.com`.

## Image

Tag form:

```text
docker.io/library/witnessops-web:main-<shortsha>-<UTC>
```

Example: `docker.io/library/witnessops-web:main-9f23217-20260730T015507Z`

Apply receipt must capture:

- source HEAD
- dirty state before and after
- image tag
- image ID
- previous image tag or digest (prod; and dev if replaced)
- build command and result
- which lanes received the image (`prod`, `dev`, or both)

Do not rely on a mutable tag alone as rollback evidence.

## Transfer And Deploy

Canonical helpers (repo root):

| Command | Effect |
| --- | --- |
| `pnpm deploy:k3s:prod` | build if needed → preflight Secrets → atomically reconcile image and ordered `envFrom` on `PROD_DEPLOY` |
| `pnpm deploy:k3s:dev` | build if needed → validate the image → apply `dev-mesh-deployment.yaml` with the exact ordered `envFrom` contract |
| `pnpm deploy:k3s:both` | one build → both deploys → `smoke_pair` |
| `pnpm deploy:k3s:smoke` | exact runtime `envFrom` + image + HTTP 200 + CSS parity |
| `pnpm deploy:k3s:dev:teardown` | delete mesh-dev only |

SSH target, fallback and private-network configuration come from operator custody
and are not defaulted in public source.

Secrets: the application container in both deployments uses exactly these
ordered `secretRef` sources in `DEPLOY_NS`, each with an empty
prefix and `optional=false`:

1. `BASE_ENV_SECRET`
2. `ADMIN_OIDC_SECRET`

The OIDC Secret must contain these six required key names:

1. `WITNESSOPS_ADMIN_SECRET`
2. `WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST`
3. `WITNESSOPS_GOOGLE_OIDC_CLIENT_ID`
4. `WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET`
5. `WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI`
6. `WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN`

The production helper fails before mutation when either Secret is unavailable
or the OIDC Secret lacks any required key name. Preflight emits only Secret key
names for validation; Secret values are never decoded, emitted, or logged. Its
atomic patch replaces undeclared `envFrom` drift, including source order,
prefix, and `optional` drift, with the exact contract while updating the image.
The mesh-dev manifest carries the same exact contract. Mesh-dev does **not**
mount prod PVCs.

Dormant Microsoft OIDC and legacy-key credential entries may remain in the
custodied OIDC Secret as extra keys; this lane neither uses nor removes them.
Their retirement requires a separately authorized custody-cleanup pass.

The legacy `deploy/k8s/apply.sh` path also preflights the six OIDC key names
before its first cluster mutation. Because that preflight occurs first, the
`DEPLOY_NS` and `ADMIN_OIDC_SECRET` must already be
provisioned before invoking the legacy helper. That helper does not create or
update the OIDC Secret.

## Edge

Public edge for apex and `www` is Caddy on the private deploy target:

```text
witnessops.com, www.witnessops.com -> reverse_proxy 127.0.0.1:3000
```

Mesh-dev must **not** be published on the public Caddy path without a separate
exposure lane. Access is only through the custodied private `MESH_DEV_URL`.

Caddy changes require their own lane unless a web apply lane explicitly
authorizes a narrow, named public-route gate adjustment.

## DNS

Cloudflare/DNS is separate authority and must not be changed by web deploy
lanes.

## Product Boundary

The public website deploy path does not mean SaaS, app, API, or OffSec product
surfaces are launched. Mesh-dev is an operator/dev twin, not a public staging
hostname.

## Verification

### Dual-lane smoke (every both-lane apply)

```bash
pnpm deploy:k3s:smoke
# or
bash deploy/scripts/smoke-prod-dev.sh
pnpm deploy:k3s:test-parity   # image/CSS, envFrom, Secret-preflight, and deploy-reconciliation tests
```

Expect (all enforced; smoke exits non-zero on failure):

- **identical container image refs** on `PROD_DEPLOY` and `DEV_DEPLOY`
- exact ordered runtime `envFrom` contract on both deployments, including an
  empty prefix and `optional=false` on both Secret refs
- `https://witnessops.com/` → HTTP 200
- `MESH_DEV_URL` → HTTP 200 over the private network
- matching primary CSS hash

Image or runtime `envFrom` drift (source, order, prefix, or `optional`) fails
even when CSS coincidentally matches (`k3s-parity.sh`).

**Intentional non-parity (not smoke failures):** private mesh bind,
emptyDir intake, runtime `PORT`/`HOSTNAME`/`WITNESSOPS_VERIFY_BASE_URL`. Mesh-dev
must still carry the same secret refs as prod (`BASE_ENV_SECRET`,
`ADMIN_OIDC_SECRET`).

If mesh smoke fails, confirm the custodied private network path without adding
its identifiers to this repository.

### Public apply completeness (prod content lanes)

Also pass before calling a public content apply complete:

- route sweep for buyer-facing routes (`/`, `/catalog`, `/review/request`,
  `/why`, `/why-witnessops`, `/docs`, `/verify`, `/library`, `/support`,
  `/privacy`, `/terms`, `/security`, and contact/engage as in scope)
- forbidden href/src/action scan against buyer pages
- cache-busted apex/www observer checks when copy changed
- explicit note that raw fixture text on `/verify` is not a buyer link target

Forbidden buyer targets include localhost, private IP URLs, app signup routes,
staging hosts, admin hosts, private console URLs, and unfinished external
product portals. Mesh-dev private URLs must not appear as buyer CTAs on prod.

## Receipts

Every public web apply receipt must record:

- lane name and authority class
- private host identity (in the restricted receipt, not public Git)
- repo path and `DEPLOY_SSH`
- start HEAD and end HEAD
- dirty state / `ALLOW_DIRTY`
- files changed
- image tag and image ID
- previous image (prod; dev if applicable)
- which lanes updated
- rollout result
- dual-lane smoke result when both were targeted
- public route sweep / forbidden scan when buyer surface changed
- rollback image and exact `envFrom` reconciliation path
- DNS / Caddy / API-app-offsec exposure statements

## Rollback

Preferred prod rollback is to redeploy a previously recorded, known-good image
through the production reconciler so the exact ordered `envFrom` contract is
restored at the same time:

```bash
bash deploy/scripts/k3s-deploy-prod.sh docker.io/library/witnessops-web:<known-good-tag>
pnpm deploy:k3s:smoke
```

Emergency `kubectl -n "${DEPLOY_NS}" rollout undo "deployment/${PROD_DEPLOY}"` may
restore an older pod template with stale `envFrom`. If it is used, immediately
redeploy the resulting known-good image through `k3s-deploy-prod.sh` and run
`pnpm deploy:k3s:smoke`; do not treat rollout status alone as rollback
completion.

Mesh-dev:

```bash
bash deploy/scripts/k3s-deploy-dev.sh docker.io/library/witnessops-web:<known-good-tag>
pnpm deploy:k3s:smoke
# or remove entirely
pnpm deploy:k3s:dev:teardown
```

If Caddy was changed in the same authorized lane, restore prior Caddy config
through that lane’s rollback plan.

## Historical Notes

Older documentation describes Docker Compose, GHCR release images, and
Servury/edge02 migration paths. Those paths are historical or legacy unless a
future lane explicitly reactivates them. Do not delete those records merely
because the current runtime path is dual-lane k3s; keep the history but do not
treat it as current production authority.

Previous external helpers are superseded for agent/operator use by **in-repo**
`deploy/scripts/k3s-*.sh`.
