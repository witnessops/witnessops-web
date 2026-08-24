# Node 22 builder and runtime custody

**Status:** operator guidance (2026-07-09)

## Node roles

| Host or path | Typical Node | Role |
|------|----------------|------|
| **Fleet VM** (`debian-termux-*`) | 20.x (distro) | Edit working copy, sync lane, targeted tests |
| **Node 22 container** | 22.x | Release-quality health/build without upgrading host Node |
| **Shared k3s image build** (`deploy/scripts/k3s-lib.sh` generates `deploy/Dockerfile.shared`) | 22 inside container | Canonical image build for both deploy lanes |
| **Private staging host** | 22 inside container when used | Optional build/transfer staging only when the lane authorizes it |
| **Private k3s target** | Container runtime | Current public runtime for `witnessops.com` |

Release-quality **`pnpm health`** and **`pnpm build`** for production must use **Node 22**, not the fleet VM’s system Node 20.

The current public runtime is private k3s, not Docker Compose. See
[`DEPLOYMENT_CUSTODY.md`](./DEPLOYMENT_CUSTODY.md).

## Authoritative paths

1. **Mesh image build** - use the canonical lane-approved path:

   ```bash
   pnpm deploy:k3s:build
   ```

   This builds with the reviewed base pin, imports the image, and returns the
   digest-qualified application reference. The deploy receipt must record the
   human-readable tag alias, OCI manifest digest, digest-qualified deploy
   reference, and manifest-bound config digest.

2. **Full health in Node 22 container (any machine with Docker)** - from repo root:

   ```bash
   pnpm health:node22
   # or: bash scripts/health-on-node22.sh
   ```

3. **Remote health on a private staging host** (only when the lane authorizes it):

   ```bash
   bash scripts/health-on-node22-goal0.sh
   ```

Historical remote wrappers may still be useful for build or transfer staging
when named by a lane, but they are not current runtime authority.

Current deploy execution is documented in
[`DEPLOYMENT_CUSTODY.md`](./DEPLOYMENT_CUSTODY.md) and uses the in-repo
`deploy/scripts/k3s-*.sh` entrypoints.

## Repo pins

- `.nvmrc` → `22`
- `package.json` `engines.node` → `>=22.0.0 <23`
- Runtime image: the reviewed `node:22-alpine@sha256:<digest>` pin declared in
  `deploy/scripts/k3s-lib.sh`, with `deploy/Dockerfile.mesh` retained as a
  reference/parity Dockerfile, plus
  `apps/witnessops-web/Dockerfile`, and `scripts/health-on-node22.sh`

## Do not

- Treat passing `optimize:quick-check` on Node 20 as equivalent to `pnpm health` on Node 22.
- Use historical Docker Compose docs as current production runtime authority.
- Use `BUILD_MODE=host` on a staging host unless `node -v` is 22.x and you accept non-container drift from the image build path.

## Related

- [`OPTIMIZATION-LANGUAGE.md`](./OPTIMIZATION-LANGUAGE.md)
- [`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md)
- `.grok/skills/optimize-witnessops-web/SKILL.md`
