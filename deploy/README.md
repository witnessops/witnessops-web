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
```

| pnpm script | Shell |
| --- | --- |
| `deploy:k3s:build` | `deploy/scripts/k3s-build-shared.sh` |
| `deploy:k3s:prod` | `deploy/scripts/k3s-deploy-prod.sh` |
| `deploy:k3s:dev` | `deploy/scripts/k3s-deploy-dev.sh` |
| `deploy:k3s:both` | `deploy/scripts/k3s-deploy-both.sh` |
| `deploy:k3s:smoke` | `deploy/scripts/smoke-prod-dev.sh` |
| `deploy:k3s:status` | `deploy/scripts/k3s-status.sh` |
| `deploy:k3s:dev:teardown` | `deploy/scripts/k3s-dev-teardown.sh` |

Common overrides:

```bash
ALLOW_DIRTY=1 pnpm deploy:k3s:both
DEPLOY_SSH=root@194.147.221.89 pnpm deploy:k3s:status
```

Authority: `docs/DEPLOYMENT_AUTHORITY.md`, custody: `docs/DEPLOYMENT_CUSTODY.md`,
agent contract: root `AGENTS.md`.

Legacy Compose/GHCR: `scripts/deploy.sh` + `INSTALL.md` (historical only).
