# Deploy (ops-dev-01 dual-lane)

Current live path for `witnessops.com` is **k3s on ops-dev-01**, not GHCR Compose.

| Lane | Deployment | Reachability |
| --- | --- | --- |
| **prod** | `witnessops/witnessops-web` | Public via Caddy → `127.0.0.1:3000` |
| **mesh-dev** | `witnessops/witnessops-web-dev` | WireGuard only `http://10.44.0.2:3015` |

Always prefer a **shared image** so prod and mesh-dev CSS/JS hashes match:

```bash
# monorepo root
pnpm deploy:k3s:both
pnpm deploy:k3s:smoke
pnpm deploy:k3s:test-parity   # image/CSS, envFrom, Secret-preflight, and deploy-reconciliation tests
```

**Smoke enforces (fails on drift):** the exact ordered application-container
`envFrom` contract on both deployments, identical image refs, HTTP 200 on both
homes, and matching primary CSS. The `envFrom` contract is
`witnessops-web-env`, then `witnessops-web-admin-oidc`, each as a `secretRef`
with an empty prefix and `optional=false`; source, order, prefix, or `optional`
drift fails.

**Intentional non-parity:** mesh bind `10.44.0.2:3015`, emptyDir intake,
runtime `PORT`/`HOSTNAME`/`WITNESSOPS_VERIFY_BASE_URL`.

The prod helper preflights both shared Secrets, then atomically reconciles its
image and exact `envFrom`. `witnessops-web-admin-oidc` must contain
`WITNESSOPS_ADMIN_SECRET` plus
`WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST`,
`WITNESSOPS_GOOGLE_OIDC_CLIENT_ID`,
`WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET`,
`WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI`, and
`WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN`. Only key names are emitted for
preflight; values are never decoded, emitted, or logged. Extra dormant
Microsoft OIDC and legacy-key credential entries remain untouched and require a
separately authorized custody-cleanup pass to retire.

The legacy `deploy/k8s/apply.sh` path performs the same OIDC key-name preflight
before any cluster mutation, so the `witnessops` namespace and
`witnessops-web-admin-oidc` Secret must already exist. It does not create or
update that Secret.

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

Common overrides:

```bash
ALLOW_DIRTY=1 pnpm deploy:k3s:both
DEPLOY_SSH=root@194.147.221.89 pnpm deploy:k3s:status
```

Preferred prod rollback redeploys a recorded known-good image through
`deploy/scripts/k3s-deploy-prod.sh`, then runs `pnpm deploy:k3s:smoke`, so the
exact `envFrom` contract is reconciled as well as the image. If emergency
`kubectl rollout undo` is used, immediately run that reconciler and smoke;
rollout status alone does not prove the runtime contract.

Authority: `docs/DEPLOYMENT_AUTHORITY.md`, custody: `docs/DEPLOYMENT_CUSTODY.md`,
agent contract: root `AGENTS.md`.

Legacy Compose/GHCR: `scripts/deploy.sh` + `INSTALL.md` (historical only).
