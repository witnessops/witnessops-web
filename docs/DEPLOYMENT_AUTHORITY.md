# Deployment authority

Status: `github_ecr_ssm_frankfurt_active_routine_authority`
Last updated: 2026-08-27

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

## Active routine production deployment authority

The single routine production target is the AWS Lightsail Frankfurt
plane `prod-aws-frankfurt`. Exact host and instance identity, namespace,
workload, Secret, storage, and private-network values remain in operator
custody.

The only routine production mutation path is:

```text
exact merged main commit
-> .github/workflows/aws-release.yml (manual dispatch)
-> build one linux/amd64 image without AWS authority
-> aws-image-publish environment and immutable Frankfurt ECR repository
-> digest-bound ECR scan evidence
-> aws-production protected environment (required reviewer; self-review blocked)
-> least-privilege production OIDC role
-> one bounded production SSM document
-> installed witnessops-deploy-v1 host adapter
-> digest-qualified image in Frankfurt k3s
```

Publication is not deployment authority. The production environment gate and
the SSM document are required after ECR publication. The workflow requires the
expected current digest, so a stale or concurrent production state fails
closed.

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

### Active and retired helpers

| Surface | Authority |
| --- | --- |
| `.github/workflows/aws-release.yml` + `aws-release-reusable.yml` | Active routine build, publish, evidence, protected-environment, and SSM path |
| `deploy/aws/host/witnessops-deploy-v1` | Installed host-side SSM adapter contract for Frankfurt k3s |
| `pnpm deploy:k3s:build`, `deploy:k3s:prod`, `deploy:k3s:both` | **Retired**; fail with `RETIRED_PRODUCTION_DEPLOY_PATH` |
| `deploy/scripts/k3s-build-shared.sh`, `k3s-deploy-prod.sh`, `k3s-deploy-both.sh` | Historical/manual-recovery implementation only; direct invocation is not routine authority |
| `deploy/scripts/k3s-deploy-dev.sh` | Build (optional) + validate image + apply mesh-dev manifest with exact ordered `envFrom` |
| `deploy/scripts/smoke-prod-dev.sh` | Exact runtime `envFrom` + digest-qualified image/runtime identity + HTTP 200 + CSS hash parity |
| `deploy/scripts/k3s-status.sh` | kubectl image/ready + exact-contract smoke |
| `deploy/scripts/k3s-status-prod-readonly.sh` | Production-only target/runtime/HTTP read gate; excludes optional mesh-dev |
| `deploy/scripts/run-status-with-topology.mjs` | Strict private-topology parser + read-only status subprocess; no deploy selection |
| `deploy/scripts/k3s-parity.sh` | Pure image/CSS, ordered `envFrom`, OIDC key-name, and image-ref validation helpers |
| `deploy/scripts/test-k3s-parity.sh` | Unit tests for parity, Secret preflight, and deploy reconciliation |
| `deploy/scripts/witnessops_live_state_aggregate_v1.py` | Read-only, exact-root, path-bound Phase 0 data metadata helper |
| `deploy/scripts/k3s-dev-teardown.sh` | Delete mesh-dev only |
| `deploy/scripts/k3s-disk-hygiene.sh` | Prune production-host build/runtime residue only after the same Frankfurt target check |

The retained topology-based production commands are read-only status and smoke
surfaces. Their target checks are validation, not deploy authorization. A
separately authorized recovery may inspect the historical helpers, but must not
silently restore them as the routine path.

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

- Routine production form:
  `<aws-account>.dkr.ecr.eu-central-1.amazonaws.com/witnessops-web@sha256:<manifest-digest>`
- The source-SHA ECR tag is an immutable lookup alias; the deployed reference is
  digest-qualified.
- Historical local `docker.io/library/witnessops-web@sha256:...` images are not
  routine production authority.
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
- The SSM host adapter reconciles the image after fail-closed target, current
  digest, Secret, and runtime preflights. The OIDC Secret must
  contain `WITNESSOPS_ADMIN_SECRET` plus the five
  `WITNESSOPS_GOOGLE_*` key names used by Google admin authentication. Credential
  values are never decoded, emitted, or logged. The bounded
  `WITNESSOPS_ADMIN_ROLE` enum is decoded into captured shell state, validated,
  and used only to bind migration of an exactly matching legacy explicit role.
- Extra dormant Microsoft OIDC or legacy-key credential entries are deliberately
  untouched. Removing them requires separate custody-cleanup authorization.

The legacy `deploy/k8s/apply.sh` helper and direct SSH/kubectl production
scripts are retired from routine authority. Their presence supports historical
review and bounded recovery analysis only.

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

`.github/workflows/release.yml` remains artifact-release only. Production image
movement is owned separately by `.github/workflows/aws-release.yml`; it builds,
publishes to immutable ECR, validates scan evidence, waits at the protected
`aws-production` environment, and invokes only the production SSM document.

## Authority split

Public web content authority:

- web app source
- package scripts
- catalog/source content
- route parity and buyer-path verification

Deploy authority:

- exact merged `main` commit and immutable ECR image/config digests
- successful digest-bound ECR scan evidence from the named publication run
- required approval at the protected `aws-production` environment
- least-privilege production OIDC role invoking only the production SSM document
- installed host adapter reconciling the exact digest on Frankfurt k3s
- expected-current-digest compare-and-swap, rollout health, and rollback evidence

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

## AWS GitHub/ECR/SSM lane: active routine deploy authority

The bounded target architecture and migration gates are defined in
[`AWS_LIGHTSAIL_MIGRATION_ARCHITECTURE.md`](./AWS_LIGHTSAIL_MIGRATION_ARCHITECTURE.md)
and [`deploy/aws/README.md`](../deploy/aws/README.md). The machine-readable
contracts are
[`deploy/aws/migration-contract.v1.json`](../deploy/aws/migration-contract.v1.json)
and
[`deploy/aws/github-deployment-contract.v1.json`](../deploy/aws/github-deployment-contract.v1.json).
The GitHub workflows, ECR publication role, protected production environment,
production deployer role, bounded SSM document, and installed host adapter are
the active routine path. The CloudFormation source remains a reviewable desired
state; this document does not claim it created every observed live resource.

This authority does not include DNS changes, Secret writes, production signing
key activation, verification-key registry changes, or arbitrary SSM commands.

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
