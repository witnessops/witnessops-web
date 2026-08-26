# Deploy (AWS Frankfurt production target)

The intended routine production target for `witnessops.com` is the AWS
Lightsail Frankfurt plane `prod-aws-frankfurt`, not the retained old VPS and
not GHCR Compose. `topology.env.example` fixes that generic public plane;
exact host, instance, namespace, workload, Secret, storage, and mesh values
stay in ignored operator custody.

Accepted claim: "The witnessops-web apex/www production serving path operates
from AWS Lightsail in Frankfurt." Do not expand it to API, mesh-dev, rollback,
credentials, or the broader production environment.

| Lane | Deployment | Reachability |
| --- | --- | --- |
| **prod** | `DEPLOY_NS/PROD_DEPLOY` | Public via Caddy → loopback app bind |
| **mesh-dev** | `DEPLOY_NS/DEV_DEPLOY` | Private `MESH_DEV_URL` only |

Always prefer a **shared image** so prod and mesh-dev CSS/JS hashes match:

```bash
# monorepo root
pnpm deploy:k3s:both
pnpm deploy:k3s:smoke
pnpm deploy:k3s:test-parity   # image/CSS, envFrom, Secret-preflight, and deploy-reconciliation tests
```

The build, production status/smoke, production deploy, and production-host
hygiene helpers fail closed unless `PROD_TARGET_PROFILE=prod-aws-frankfurt`
and read-only remote hostname, IMDSv2 instance identity, and AWS region checks
match ignored operator custody. The audit did not prove that the Frankfurt host
has the Docker build/import prerequisite expected by `build_shared_image`;
resolve that in a separately authorized execution phase. Do not point
`DEPLOY_SSH` back to the old VPS as a workaround.

**Smoke enforces (fails on drift):** the exact ordered application-container
`envFrom` contract on both deployments, identical digest-qualified image refs,
each ready application's manifest-bound runtime image ID, HTTP 200 on both
homes, and matching primary CSS. The `envFrom` contract is
`BASE_ENV_SECRET`, then `ADMIN_OIDC_SECRET`, each as a `secretRef`
with an empty prefix and `optional=false`; source, order, prefix, or `optional`
drift fails.

**Intentional non-parity:** custodied mesh bind, emptyDir intake,
runtime `PORT`/`HOSTNAME`/`WITNESSOPS_VERIFY_BASE_URL`.

The prod helper preflights both shared Secrets, then atomically reconciles its
image and exact `envFrom`. `ADMIN_OIDC_SECRET` must contain
`WITNESSOPS_ADMIN_SECRET` plus
`WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST`,
`WITNESSOPS_GOOGLE_OIDC_CLIENT_ID`,
`WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET`,
`WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI`, and
`WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN`, and the bounded
`WITNESSOPS_ADMIN_ROLE` enum. Credential values are never decoded, emitted, or
logged; the role enum is decoded only into captured shell state and is not
printed. Extra dormant
Microsoft OIDC and legacy-key credential entries remain untouched and require a
separately authorized custody-cleanup pass to retire.

The legacy `deploy/k8s/apply.sh` path requires both a digest-qualified
`WITNESSOPS_WEB_IMAGE` and its build-recorded, manifest-bound
`WITNESSOPS_WEB_CONFIG_DIGEST`. It performs the same OIDC key-name preflight
before any cluster mutation, then verifies the deployed reference, readiness,
and running application image IDs after rollout. `DEPLOY_NS` and
`ADMIN_OIDC_SECRET` must already exist; it does not create or update that
Secret.

| pnpm script | Shell |
| --- | --- |
| `deploy:k3s:build` | `deploy/scripts/k3s-build-shared.sh` |
| `deploy:k3s:prod` | `deploy/scripts/k3s-deploy-prod.sh` |
| `deploy:k3s:dev` | `deploy/scripts/k3s-deploy-dev.sh` |
| `deploy:k3s:both` | `deploy/scripts/k3s-deploy-both.sh` |
| `deploy:k3s:smoke` | `deploy/scripts/smoke-prod-dev.sh` |
| `deploy:k3s:status` | `deploy/scripts/k3s-status.sh` |
| `deploy:k3s:test-parity` | `deploy/scripts/test-k3s-parity.sh` |
| `deploy:k3s:dev:teardown` | `deploy/scripts/k3s-dev-teardown.sh` |

Private topology and an intentional dirty-tree override:

```bash
cp deploy/topology.env.example deploy/topology.env
# replace every example with the restricted operator values, then:
set -a; source deploy/topology.env; set +a
# Review only; running a deploy still requires a separately authorized lane.
ALLOW_DIRTY=1 pnpm deploy:k3s:both
```

Preferred rollback redeploys the same recorded known-good digest-qualified image
through `deploy/scripts/k3s-deploy-both.sh`, then runs
`pnpm deploy:k3s:smoke`, so both lanes and their exact `envFrom` contracts are
realigned. A single-lane emergency rollback is degraded and pair smoke remains
failed until the other lane uses the same image. Rollout status alone does not
prove the runtime contract.

Authority: `docs/DEPLOYMENT_AUTHORITY.md`, custody: `docs/DEPLOYMENT_CUSTODY.md`,
agent contract: root `AGENTS.md`.

AWS infrastructure and deployment-automation source (not evidence of an
applied stack and not apply permission): [`aws/README.md`](./aws/README.md).

Legacy Compose/GHCR: `scripts/deploy.sh` + `INSTALL.md` (historical only).

GitHub release CI publishes and signs an artifact only. It performs no
production deployment; see `docs/DEPLOYMENT_AUTHORITY.md`.
