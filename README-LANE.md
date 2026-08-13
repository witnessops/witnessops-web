# witnessops-web (OffSec lane copy)

Canonical public web repo: **https://github.com/witnessops/witnessops-web**

This directory may be used as an operator working copy. Concrete host identity,
sync paths and runtime custody belong in restricted operator documentation.

| Private path variable | Role |
|---------------|------|
| `PRIVATE_DEPLOY_CHECKOUT` | Historical deploy checkout (`deploy/scripts/deploy.sh`) |
| `WITNESSOPS_DATA_ROOT` | Runtime persistent data (see `deploy/INSTALL.md`) |
| `/etc/caddy/witnessops-public.Caddyfile` | `witnessops.com` → `127.0.0.1:3000` (lane packet) |

Lane details are held outside this public repository.

**Build authority:** release-quality checks and builds use **Node 22**. Run
`pnpm health:node22`; see `docs/NODE22-BUILDER.md`.
