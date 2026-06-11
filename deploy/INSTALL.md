# Installing witnessops-web on a host

This is the supported installation method for the production web surface
(currently Servury / edge02). It runs the released, signed container image from
GHCR behind a host Caddy reverse proxy.

Architecture:

```text
Internet ──TLS──> Caddy (systemd) ──127.0.0.1:3000──> docker: witnessops-web
                                                         └── /srv/witnessops/data/* (persistent)
                                                         └── /srv/witnessops/env/witnessops-web.env (secrets)
```

## Prerequisites

- Debian 12 (or similar) with Docker Engine + the `docker compose` plugin
- `cosign` (for image signature verification) and `curl`
- Caddy installed as a systemd service
- A GHCR pull token if the package is private (it is currently public; skip if so)

## 1. Host paths

```bash
sudo mkdir -p /srv/witnessops/{env,data/intake-store,data/intake-events,data/staging-mail-out,backups}
# Data dirs are written by the container's uid:gid 1001:1001 (the 'nextjs' user).
sudo chown -R 1001:1001 /srv/witnessops/data
```

## 2. Runtime environment (secrets)

```bash
sudo cp deploy/.env.example /srv/witnessops/env/witnessops-web.env
sudo $EDITOR /srv/witnessops/env/witnessops-web.env   # fill in real secrets
sudo chown root:witnessops /srv/witnessops/env/witnessops-web.env
sudo chmod 640 /srv/witnessops/env/witnessops-web.env
```

`640 root:witnessops` (not `600`) is required: Docker Compose reads `env_file`
client-side as the operator user, who must be in the `witnessops` group. The
file stays unreadable to everyone outside that group.

The env file lives on the host only and is never committed. See `deploy/.env.example`
for the full key list and which directories map to the container mounts.

## 3. Authenticate Docker to GHCR

The `witnessops-web` container package is **private** (org policy disallows
public packages), so the host must authenticate before it can pull. Use a token
with `read:packages`:

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

- On edge02 the live container is presently named `witnessops-web-staging` and
  uses `witnessops-web.staging.env`. This tooling standardizes on the
  production names `witnessops-web` / `witnessops-web.env`. The first deploy with
  this tooling performs that one-time rename — stop and remove the old
  `witnessops-web-staging` container as part of that cutover.
- TLS, DNS, and the contact/review gate are host/edge concerns, not app config.
- Persistent data under `/srv/witnessops/data` must be backed up independently
  (see the production backup custody lane).
