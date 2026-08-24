# Deploy (private dual-lane)

Current live path for `witnessops.com` is private k3s, not GHCR Compose. Concrete
topology stays in operator custody and is injected using the variable names in
`topology.env.example`.

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
ALLOW_DIRTY=1 pnpm deploy:k3s:both
```

Preferred prod rollback redeploys a recorded known-good digest-qualified image through
`deploy/scripts/k3s-deploy-prod.sh`, then runs `pnpm deploy:k3s:smoke`, so the
exact `envFrom` contract is reconciled as well as the image. If emergency
`kubectl rollout undo` is used, immediately run that reconciler and smoke;
rollout status alone does not prove the runtime contract.

Authority: `docs/DEPLOYMENT_AUTHORITY.md`, custody: `docs/DEPLOYMENT_CUSTODY.md`,
agent contract: root `AGENTS.md`.

Planned AWS Lightsail host migration (not active authority and no apply
permission): [`aws/README.md`](./aws/README.md).

Legacy Compose/GHCR: `scripts/deploy.sh` + `INSTALL.md` (historical only).
