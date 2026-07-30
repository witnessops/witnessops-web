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
pnpm deploy:k3s:test-parity   # unit tests for image/CSS compare helpers
```

**Smoke enforces (fails on drift):** identical image refs on both deployments, HTTP 200 on both homes, matching primary CSS.

**Intentional non-parity:** mesh bind `10.44.0.2:3015`, emptyDir intake, runtime `PORT`/`HOSTNAME`/`WITNESSOPS_VERIFY_BASE_URL`. Shared secrets: `witnessops-web-env` + `witnessops-web-admin-oidc`.

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

Authority: `docs/DEPLOYMENT_AUTHORITY.md`, custody: `docs/DEPLOYMENT_CUSTODY.md`,
agent contract: root `AGENTS.md`.

Legacy Compose/GHCR: `scripts/deploy.sh` + `INSTALL.md` (historical only).
