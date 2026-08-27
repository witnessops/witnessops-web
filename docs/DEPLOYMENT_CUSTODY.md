# WitnessOps Web Deployment Custody

Status: GitHub/ECR/SSM to AWS Frankfurt active routine custody
Last updated: 2026-08-27

This document records how the public WitnessOps web surface (and the mesh-only
dev twin) is served, built, deployed, verified, and rolled back. It is
documentation, not deploy approval. Any production change still needs an
explicit apply lane.

## Current Live Path

### Public (prod)

```text
witnessops.com / www.witnessops.com
-> DNS
-> AWS Lightsail Frankfurt production plane prod-aws-frankfurt
-> systemd caddy.service
-> /etc/caddy/Caddyfile
-> reverse_proxy 127.0.0.1:3000
-> k3s namespace DEPLOY_NS
-> deployment PROD_DEPLOY
-> container port 3000 (hostPort 127.0.0.1:3000)
-> image <aws-account>.dkr.ecr.eu-central-1.amazonaws.com/witnessops-web@sha256:<manifest-digest>
-> current on-host custody paths (hostPath in the migration audit)
```

### Mesh-dev (private twin)

```text
operator laptop (private network)
-> MESH_DEV_URL
-> private hostNetwork bind
-> k3s deployment DEV_DEPLOY
-> same digest-qualified shared image reference as prod when aligned
-> emptyDir intake (isolated from prod PVC)
```

The accepted claim is limited to: "The witnessops-web apex/www production
serving path operates from AWS Lightsail in Frankfurt." It does not accept API,
mesh-dev, credential, data-equivalence, or rollback-equivalence surfaces.

Pod names, tag aliases, and exact image digests are observations that change every apply.
Record the live tag alias, manifest digest, and config digest in the apply
receipt; do not treat sample coordinates in this file as permanent.

## Source

Current source custody:

- Repo: `witnessops-web` (`https://github.com/witnessops/witnessops-web`)
- Default branch: `main`
- Routine production input is an exact commit already merged to `main`.
- The manual AWS workflow validates repository, ref, source commit, image
  digest, config digest, publication run, and expected current digest.
- A local Mac checkout is not production artifact or mutation custody.

## Build

The AWS release workflow checks out the exact merged commit, runs the repository
supply-chain gate, and builds one `linux/amd64` archive without AWS credentials.
Only the `aws-image-publish` job may obtain the scoped publisher identity. It
verifies the archive before AWS access, writes the immutable source tag to the
Frankfurt ECR repository, and retains digest-bound scan evidence.

The former remote Mac/SSH build-import route is retired from routine production
authority. Its package aliases fail closed with
`RETIRED_PRODUCTION_DEPLOY_PATH`.

Docker Compose is **not** current runtime authority for `witnessops.com`.

## Image

Immutable lookup tag:

```text
<aws-account>.dkr.ecr.eu-central-1.amazonaws.com/witnessops-web:source-<40-char-sha>
```

Deployed image reference:

```text
<aws-account>.dkr.ecr.eu-central-1.amazonaws.com/witnessops-web@sha256:<manifest-digest>
```

Apply receipt must capture:

- source HEAD
- immutable source tag
- OCI manifest digest and digest-qualified deploy reference
- manifest-bound config digest expected in pod `imageID`
- previous digest-qualified image reference (prod; and dev if replaced)
- publication run ID/attempt and ECR scan evidence
- protected production environment approval and SSM command result

Do not rely on a mutable tag alone as rollback evidence.

## Transfer And Deploy

Routine and retained surfaces:

| Command | Effect |
| --- | --- |
| `.github/workflows/aws-release.yml` | exact commit → immutable ECR → protected `aws-production` → bounded SSM → Frankfurt k3s |
| `pnpm deploy:k3s:build`, `deploy:k3s:prod`, `deploy:k3s:both` | retired; fail closed |
| `pnpm deploy:k3s:dev` | build if needed → validate the image → apply `dev-mesh-deployment.yaml` with the exact ordered `envFrom` contract |
| `pnpm deploy:k3s:smoke` | exact runtime `envFrom` + digest-qualified image/runtime identity + HTTP 200 + CSS parity |
| `pnpm deploy:k3s:dev:teardown` | delete mesh-dev only |

The generic target contract is explicit in public source:

- `PROD_TARGET_PROFILE=prod-aws-frankfurt`

`DEPLOY_SSH`, `PROD_EXPECTED_HOSTNAME`, and `PROD_EXPECTED_INSTANCE_ID` remain
ignored read-only status custody. Production mutation uses the environment-bound
managed node, production SSM document, and installed host-adapter configuration.

Secrets: the application container in both deployments uses exactly these
ordered `secretRef` sources in `DEPLOY_NS`, each with an empty
prefix and `optional=false`:

1. `BASE_ENV_SECRET`
2. `ADMIN_OIDC_SECRET`

The OIDC Secret must contain these seven required key names:

1. `WITNESSOPS_ADMIN_SECRET`
2. `WITNESSOPS_ADMIN_ROLE`
3. `WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST`
4. `WITNESSOPS_GOOGLE_OIDC_CLIENT_ID`
5. `WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET`
6. `WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI`
7. `WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN`

The production host adapter fails before mutation when either Secret is unavailable
or the OIDC Secret lacks any required key name. Preflight emits only Secret key
names for validation. Credential values are never decoded, emitted, or logged;
the bounded admin-role enum is decoded only into captured shell state and is
not printed. Its
atomic patch replaces undeclared `envFrom` drift, including source order,
prefix, and `optional` drift, with the exact contract while updating the image.
The mesh-dev manifest carries the same exact contract. Mesh-dev does **not**
mount prod PVCs.

Dormant Microsoft OIDC and legacy-key credential entries may remain in the
custodied OIDC Secret as extra keys; this lane neither uses nor removes them.
Their retirement requires a separately authorized custody-cleanup pass.

The legacy `deploy/k8s/apply.sh` and direct `k3s-deploy-prod.sh` paths are
historical/manual-recovery code, not routine production authority.

## Edge

Public edge for apex and `www` is Caddy on the intended Frankfurt target:

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

### Read-only production and optional dual-lane smoke

```bash
pnpm deploy:k3s:smoke
# or
bash deploy/scripts/smoke-prod-dev.sh
pnpm deploy:k3s:test-parity   # image/CSS, envFrom, Secret-preflight, and deploy-reconciliation tests
```

Expect (all enforced; smoke exits non-zero on failure):

- **identical digest-qualified container image refs** on `PROD_DEPLOY` and `DEV_DEPLOY`
- every ready application pod reports the manifest-bound config digest in its
  runtime `imageID`, on both lanes
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

Every public web apply record must retain:

- lane name and authority class
- private host identity (in the restricted receipt, not public Git)
- expected and observed Frankfurt target identity
- exact merged source commit
- workflow run ID and attempt
- files changed
- ECR source tag, OCI manifest digest, digest-qualified deploy reference, and
  manifest-bound config digest
- previous image (prod; dev if applicable)
- environment approval and SSM command result
- rollout result
- dual-lane smoke result when both were targeted
- public route sweep / forbidden scan when buyer surface changed
- rollback image and exact `envFrom` reconciliation path
- DNS / Caddy / API-app-offsec exposure statements

## Rollback

The retained old VPS is a rollback surface, not routine deployment authority.
Using it requires a separately authorized recovery lane that checks its access,
security posture, image/data currency, and public-routing implications. This
document does not assert rollback equivalence. The 2026-08-26 migration closure
decision classifies it as break-glass only.

Preferred production rollback is a separately authorized
`deploy-production` operation through the same protected GitHub environment and
SSM document, naming the known-good ECR manifest/config digests and the exact
current production digest. Direct kubectl or SSH rollback is break-glass only.

Emergency direct kubectl rollback may restore an older pod template with stale
runtime configuration. It is not routine authority and rollout status alone is
not rollback completion.

To remove mesh-dev entirely after a separately authorized lane change:

```bash
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

The former direct Mac/SSH and `deploy/scripts/k3s-*.sh` production mutation
path is retired. Read-only status/parity helpers and the separate mesh-dev lane
remain available.
