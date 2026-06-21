# witnessops-web (OffSec lane copy)

Canonical public web repo: **https://github.com/witnessops/witnessops-web**

This directory is the operator working copy on the fleet VM, synced to **goal0-edge-01** for unified public hosting (WitnessOps + OffSec product vhosts on one edge).

| Path on goal0 | Role |
|---------------|------|
| `/opt/goal0/sources/witnessops-web/` | Deploy checkout (`deploy/scripts/deploy.sh`) |
| `/srv/witnessops/` | Runtime env + persistent data (see `deploy/INSTALL.md`) |
| `/etc/caddy/witnessops-public.Caddyfile` | `witnessops.com` → `127.0.0.1:3000` (lane packet) |

Lane doc: `~/DEV/OffSec/docs/local-mesh/SINGLE-PUBLIC-HOST.md`

**Build authority:** mesh image is built on **goal0** with **Node 22** inside Docker (`deploy/Dockerfile.mesh`), not on the fleet VM’s system Node. From fleet: `~/DEV/OffSec/scripts/run-witnessops-mesh-goal0.sh`. Full check: `pnpm health:node22` or `pnpm health:node22:goal0` — see `docs/NODE22-BUILDER.md`.