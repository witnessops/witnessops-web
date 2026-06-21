# Node 22 builder (different node than fleet VM)

**Status:** operator guidance (2026-06-21)

## Node roles

| Host | Typical Node | Role |
|------|----------------|------|
| **Fleet VM** (`debian-termux-*`) | 20.x (distro) | Edit working copy, sync lane, `pnpm optimize:quick-check` (targeted tests) |
| **goal0-edge-01** (`167.235.12.232`) | **22 inside Docker (Alpine)** | Authoritative mesh **build + runtime** image (`deploy/Dockerfile.mesh`) |
| **Local Docker** (any host with `docker`) | **22 in container** | Run full `pnpm health` without upgrading host Node |

Release-quality **`pnpm health`** and **`pnpm build`** for production must use **Node 22**, not the fleet VM’s system Node 20.

## Authoritative paths

1. **Mesh production build (goal0)** — default `BUILD_MODE=docker`:

   ```bash
   # From fleet VM after sync:
   ~/DEV/OffSec/scripts/run-witnessops-mesh-goal0.sh
   ```

   On goal0: `/opt/offsec/scripts/build-witnessops-web-mesh.sh` → **`node:22-alpine`** in `deploy/Dockerfile.mesh` (see [`ALPINE-MESH.md`](./ALPINE-MESH.md)).

2. **Full health in Node 22 container (any machine with Docker)** — from repo root:

   ```bash
   pnpm health:node22
   # or: bash scripts/health-on-node22.sh
   ```

3. **Remote health on goal0** (repo synced to `/opt/goal0/sources/witnessops-web`):

   ```bash
   bash scripts/health-on-node22-goal0.sh
   ```

## Repo pins

- `.nvmrc` → `22`
- `package.json` `engines.node` → `>=22.0.0 <23`
- Runtime image: `node:22-alpine` (`deploy/Dockerfile.mesh`, `apps/witnessops-web/Dockerfile`)

## Do not

- Treat passing `optimize:quick-check` on Node 20 as equivalent to `pnpm health` on Node 22.
- Use `BUILD_MODE=host` on goal0 or fleet unless host `node -v` is 22.x and you accept non-container drift from production.

## Related

- [`OPTIMIZATION-LANGUAGE.md`](./OPTIMIZATION-LANGUAGE.md)
- [`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md)
- `.grok/skills/optimize-witnessops-web/SKILL.md`