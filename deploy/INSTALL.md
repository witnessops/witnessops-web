# Installing witnessops-web on a host

> **Current dual-lane path (use this):** private k3s with prod and mesh-dev
> topology injected from operator custody through `topology.env`. See
> [`../docs/DEPLOYMENT_CUSTODY.md`](../docs/DEPLOYMENT_CUSTODY.md) and
> in-repo scripts under `deploy/scripts/k3s-*.sh` (`pnpm deploy:k3s:both`).
>
> **Below:** historical Docker Compose / GHCR install flow. Not live
> authority unless a future lane reactivates it.

This file records a historical installation method for a unified public host.
It ran a released, signed container image from GHCR behind host Caddy, but it
is not the current live path unless reactivated by a future lane. Concrete
historical topology and custody paths are intentionally omitted.

Architecture:

```text
Internet ──TLS──> Caddy (systemd) ──loopback──> docker: witnessops-web
                                                  └── WITNESSOPS_DATA_ROOT
                                                  └── WITNESSOPS_WEB_ENV_FILE
```

## Prerequisites

- Debian 12 (or similar) with Docker Engine + the `docker compose` plugin
- `cosign` (for image signature verification) and `curl`
- Caddy installed as a systemd service
- Confirm current GHCR package visibility; authenticate with a pull token if required

## 1. Host paths

```bash
sudo mkdir -p "${WITNESSOPS_DATA_ROOT}"/{intake-store,intake-events,staging-mail-out,backups}
# Data dirs are written by the container's uid:gid 1001:1001 (the 'nextjs' user).
sudo chown -R 1001:1001 "${WITNESSOPS_DATA_ROOT}"
```

## 2. Runtime environment (secrets)

```bash
sudo cp deploy/.env.example "${WITNESSOPS_WEB_ENV_FILE}"
sudo $EDITOR "${WITNESSOPS_WEB_ENV_FILE}"   # fill in real secrets
sudo chown root:operator-group "${WITNESSOPS_WEB_ENV_FILE}"
sudo chmod 640 "${WITNESSOPS_WEB_ENV_FILE}"
```

Mode `640` may be required: Docker Compose reads `env_file` client-side as the
operator user, who must be in the configured operator group. The
file stays unreadable to everyone outside that group.

The env file lives on the host only and is never committed. See `deploy/.env.example`
for the full key list and which directories map to the container mounts.

## 3. Authenticate Docker to GHCR

Repository code does not establish current GHCR package visibility. If the
package requires authentication, use a token with `read:packages`:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-user> --password-stdin
```

For unattended deploys, provision a dedicated `read:packages` PAT (or org deploy
token) rather than depending on an interactive `gh` session token, which expires.

## 4. Deploy a released version

From a checkout of this repo on the host:

```bash
cd deploy
./scripts/deploy.sh v0.1.0      # verifies signature, pulls, swaps, smoke-tests
```

`deploy.sh` resolves the version tag to an immutable `@sha256` digest, records
the previously running digest for rollback, runs `docker compose up -d`, and
smoke-tests `/`, `/review`, `/verify`. On smoke failure it auto-rolls back.

## 5. Caddy reverse proxy

Install the proxy + gate config (see `deploy/Caddyfile.snippet`):

```bash
sudo cp deploy/Caddyfile.snippet /etc/caddy/witnessops-web.caddy   # or paste into /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Operations

```bash
./scripts/deploy.sh status        # show running + rollback digests
./scripts/deploy.sh rollback      # restore the previous digest
docker logs -f witnessops-web     # tail app logs
docker compose -f docker-compose.yml ps
```

## Notes / current reality

- Historical unified-host and staging notes are not current deployment authority.
- TLS, DNS, and the contact/review gate are host/edge concerns, not app config.
- Persistent data under `WITNESSOPS_DATA_ROOT` must be backed up independently
  (see the production backup custody lane).
