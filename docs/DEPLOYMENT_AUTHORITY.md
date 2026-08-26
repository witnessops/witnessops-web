# Deployment authority

Status: `aws_lightsail_frankfurt_intended_production_target`
Last updated: 2026-08-26

This document classifies deployment-related repository surfaces for
`witnessops-web`. It is repo-local guidance and is not deploy approval, release
approval, production verification, cloud inventory, rollback approval, or server
administration authority.

## Accepted serving-path claim

"The witnessops-web apex/www production serving path operates from AWS
Lightsail in Frankfurt."

This claim does not include `api.witnessops.com`, mesh-dev availability,
credential remediation, rollback equivalence, or the broader WitnessOps
production environment.

## Intended production deployment authority

The single intended routine production target is the AWS Lightsail Frankfurt
plane `prod-aws-frankfurt`. Exact host and instance identity, namespace,
workload, Secret, storage, and private-network values remain in operator
custody and are injected through ignored `deploy/topology.env` using the names
in `deploy/topology.env.example`.

```text
Public:
  DNS
  -> AWS Lightsail Frankfurt production plane: prod-aws-frankfurt
  -> systemd caddy.service
  -> reverse_proxy 127.0.0.1:3000
  -> k3s namespace DEPLOY_NS
  -> deployment PROD_DEPLOY
  -> hostPort 127.0.0.1:3000

Optional mesh-dev (not public; not part of the accepted claim):
  operator client
  -> MESH_DEV_URL
  -> k3s deployment DEV_DEPLOY
  -> hostNetwork bind MESH_BIND_HOST:MESH_BIND_PORT
  -> emptyDir volumes (no prod PVC)
```

The retained old VPS is rollback-only and may host unrelated surfaces. It is
not the intended routine `witnessops-web` production deploy target. Rollback
use requires a separately authorized recovery lane and must not silently
change the accepted serving-path claim.

Custody map: [`DEPLOYMENT_CUSTODY.md`](./DEPLOYMENT_CUSTODY.md).

### Canonical deploy helpers (in this repo)

| Script | Purpose |
| --- | --- |
| `deploy/scripts/k3s-build-shared.sh` | Build one shared image from HEAD; import into k3s; no deploy |
| `deploy/scripts/k3s-deploy-prod.sh` | Build (optional) + preflight Secrets + atomically reconcile prod image and exact ordered `envFrom` |
| `deploy/scripts/k3s-deploy-dev.sh` | Build (optional) + validate image + apply mesh-dev manifest with exact ordered `envFrom` |
| `deploy/scripts/k3s-deploy-both.sh` | Build once → prod + mesh-dev + exact-contract smoke |
| `deploy/scripts/smoke-prod-dev.sh` | Exact runtime `envFrom` + digest-qualified image/runtime identity + HTTP 200 + CSS hash parity |
| `deploy/scripts/k3s-status.sh` | kubectl image/ready + exact-contract smoke |
| `deploy/scripts/k3s-status-prod-readonly.sh` | Production-only target/runtime/HTTP read gate; excludes optional mesh-dev |
| `deploy/scripts/run-status-with-topology.mjs` | Strict private-topology parser + read-only status subprocess; no deploy selection |
| `deploy/scripts/k3s-parity.sh` | Pure image/CSS, ordered `envFrom`, OIDC key-name, and image-ref validation helpers |
| `deploy/scripts/test-k3s-parity.sh` | Unit tests for parity, Secret preflight, and deploy reconciliation |
| `deploy/scripts/witnessops_live_state_aggregate_v1.py` | Read-only, exact-root, path-bound Phase 0 data metadata helper |
| `deploy/scripts/k3s-dev-teardown.sh` | Delete mesh-dev only |
| `deploy/scripts/k3s-disk-hygiene.sh` | Prune production-host build/runtime residue only after the same Frankfurt target check |

Before any shared build, production status/smoke, or production mutation, the
helpers require `PROD_TARGET_PROFILE=prod-aws-frankfurt`, then compare the
read-only remote hostname, IMDSv2 instance identity, and AWS region with
ignored operator custody and the checked-in regional contract. A mismatch
fails before image build, Secret inspection, or Kubernetes mutation. This
guard is validation, not deploy authorization.

pnpm aliases (monorepo root):
`deploy:k3s:build|prod|dev|both|smoke|status|test-parity|dev:teardown`.

Private-topology validation and read-only status use
`deploy:k3s:validate-topology` and `deploy:k3s:status:topology`. These commands
parse the ignored file as data and cannot choose a deployment command. The
status wrapper redacts its direct topology summary lines, but the underlying
SSH and Kubernetes diagnostics may contain private workload or endpoint
identifiers. Its combined stdout/stderr is restricted evidence and must be
captured in an owner-only file, never a public CI job or public log. The
fixed path uses non-interactive `sudo -n` only for its read-only k3s kubectl and
containerd queries and fails closed when that access is unavailable. This does
not authorize Kubernetes, containerd, service, or host mutation. The
topology wrapper selects the production-only gate so its evidence matches the
accepted apex/www claim. It performs no mesh runtime or reachability check, but
the shared topology file still requires syntactically valid dual-lane schema
fields. Optional mesh-dev remains a separate dual-lane status and smoke
concern. The
deterministic exact-root data helper is tested by
`deploy:k3s:test-state-aggregate`; its production execution remains a separate
read-only evidence action, not deploy authority.

Shared helpers: `deploy/scripts/k3s-lib.sh` + `k3s-parity.sh`. Manifest template for
mesh-dev: `deploy/k8s/dev-mesh-deployment.yaml`.

Do **not** use external mesh-agent helpers as the sole authority when this repo’s
scripts cover the lane. Prefer in-repo scripts so agents and humans share one path.

### Image contract and enforced parity

- Human-readable alias: `docker.io/library/witnessops-web:main-<shortsha>-<UTC>`
- Deployed form: `docker.io/library/witnessops-web@sha256:<manifest-digest>`
- Both Node 22 build stages use the reviewed digest-qualified base declared by
  `PINNED_NODE22_IMAGE`; tag-only base inputs are rejected.
- Shared bake always sets public origin (`NEXT_PUBLIC_OS_SITE_URL=https://witnessops.com`)
  so prod and mesh-dev CSS/asset hashes match when the image identity matches.
- **`pnpm deploy:k3s:smoke` fails when prod image ≠ mesh-dev image**, when an
  image reference is not digest-qualified, or when a ready application pod's
  runtime image ID is not the config digest bound by the expected OCI manifest.
  It also requires HTTP 200 on both homes, matching CSS, and the exact ordered
  application-container `envFrom` contract on both lanes.
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

The legacy `deploy/k8s/apply.sh` helper requires a digest-qualified
`WITNESSOPS_WEB_IMAGE` plus its build-recorded, manifest-bound
`WITNESSOPS_WEB_CONFIG_DIGEST`. It runs the OIDC key-name preflight before any
cluster mutation, then verifies the deployed reference, readiness, and running
application image IDs after rollout. Its `DEPLOY_NS` namespace and
`ADMIN_OIDC_SECRET` must therefore be preprovisioned; the helper does not create
or update that Secret.

### Intentional non-parity (not drift)

- Mesh-dev runtime env overrides: `PORT=MESH_BIND_PORT`,
  `HOSTNAME=MESH_BIND_HOST`, `WITNESSOPS_VERIFY_BASE_URL=MESH_DEV_URL`
- Mesh-dev `hostNetwork` + emptyDir volumes (no prod PVC)
- Prod hostPort `127.0.0.1:3000` + public Caddy edge

### Selected operator controls

The table below is not the complete topology contract. The deployment scripts
fail closed unless every required value in `deploy/topology.env.example` is
loaded before they are invoked.

| Variable | Source | Notes |
| --- | --- | --- |
| `DEPLOY_SSH` | required private operator custody | SSH alias or host for the custodied target |
| `PROD_TARGET_PROFILE` | checked-in public contract | Must be `prod-aws-frankfurt` |
| `PROD_EXPECTED_HOSTNAME` | required private operator custody | Exact remote hostname; compared at preflight |
| `PROD_EXPECTED_INSTANCE_ID` | required private operator custody | Exact AWS instance ID; compared through IMDSv2 |
| `ALLOW_DIRTY` | unset | Set `1` to build from dirty tree |
| `MESH_DEV_URL` | required private custody | Local smoke target |
| `PROD_URL` | `https://witnessops.com` | Public smoke target |

The configured private network path is required for mesh-dev smoke and private
SSH. Network profile, peer and CIDR details stay outside this public repo.

### CI/CD boundary

`.github/workflows/release.yml` builds, verifies, signs, and publishes an
immutable release artifact. It does **not** SSH to a host, apply Kubernetes
manifests, restart services, or deploy production. Its receipt records no
deployment and points operators back to this authority document. Production
execution remains an explicit manual/internal lane.

### Known execution limitation

The migration audit observed k3s on the Frankfurt target but did not prove that
the current remote Docker build/import path is usable there. Target identity
is now fail-closed, but the build/import prerequisite remains a Phase 2 blocker;
do not redirect the helper to the old VPS to work around it.

## Authority split

Public web content authority:

- web app source
- package scripts
- catalog/source content
- route parity and buyer-path verification

Deploy authority:

- timestamped shared image build with the tag alias, OCI manifest digest, and
  manifest-bound config digest captured
- in-repo k3s scripts targeting the injected `PROD_DEPLOY` and/or `DEV_DEPLOY`
- rollout status and dual-lane smoke when both are in scope
- known-good rollback image redeployed through the prod reconciler, with exact
  `envFrom` reconciliation and smoke captured in the receipt
- restricted target-identity receipt showing the generic Frankfurt plane and
  matching expected/observed private host and instance identity without
  publishing those private identifiers

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

## AWS infrastructure automation source: not active deploy authority

The bounded target architecture and migration gates are defined in
[`AWS_LIGHTSAIL_MIGRATION_ARCHITECTURE.md`](./AWS_LIGHTSAIL_MIGRATION_ARCHITECTURE.md)
and [`deploy/aws/README.md`](../deploy/aws/README.md). The machine-readable
contracts are
[`deploy/aws/migration-contract.v1.json`](../deploy/aws/migration-contract.v1.json)
and
[`deploy/aws/github-deployment-contract.v1.json`](../deploy/aws/github-deployment-contract.v1.json).
The parameterized CloudFormation file under `deploy/aws/cloudformation/` is
reviewable source, not evidence of the stack that created the current host. No
GitHub AWS-deployment workflow or host adapter is active in this phase.

These files remain design, evidence, and fail-closed acceptance surfaces only.
They do not authorize creating AWS resources, deploying workloads, copying
production data, changing DNS, writing Secrets, or cutting traffic over. The
current Frankfurt serving path at the top of this document is authoritative;
that point-in-time runtime evidence does not prove this automation source was
applied to build it.

The candidate preserves the existing deployment seam and runtime shape:
`DEPLOY_SSH` selects the host, Caddy terminates the public edge, the app binds
to loopback, and a single-node k3s instance owns the production PVCs, Secrets,
and digest-qualified image. It does not activate Public Exposure Review
production signing keys or change the production verification key registry;
those actions require a separate custody and activation lane after AWS
acceptance.

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
