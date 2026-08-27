# Node 22 builder and runtime custody

**Status:** operator guidance (2026-07-09)

## Node roles

| Host or path | Typical Node | Role |
|------|----------------|------|
| **Fleet VM** (`debian-termux-*`) | 20.x (distro) | Edit working copy, sync lane, targeted tests |
| **Node 22 container** | 22.x | Release-quality health/build without upgrading host Node |
| **Historical shared k3s image build** (`deploy/scripts/k3s-lib.sh` generates `deploy/Dockerfile.shared`) | 22 inside container | Retained implementation reference; not routine production authority |
| **Private staging host** | 22 inside container when used | Optional build/transfer staging only when the lane authorizes it |
| **Private k3s target** | Container runtime | Current public runtime for `witnessops.com` |

Release-quality **`pnpm health`** and **`pnpm build`** for production must use **Node 22**, not the fleet VM’s system Node 20.

The current public runtime is private k3s, not Docker Compose. See
[`DEPLOYMENT_CUSTODY.md`](./DEPLOYMENT_CUSTODY.md).

## Authoritative paths

1. **Production image build** - use the manually dispatched
   `.github/workflows/aws-release.yml` `publish-image` operation from
   `refs/heads/main`. It builds and publishes the exact merged source through
   the immutable Frankfurt ECR path. A merge alone cannot publish.

   The deployment record must include the source commit, OCI manifest digest,
   digest-qualified deploy reference, manifest-bound config digest, and scan
   evidence. The retired `pnpm deploy:k3s:build` alias fails closed.

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
[`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md) and uses the protected
GitHub/ECR/SSM path. Direct `deploy/scripts/k3s-*.sh` production invocation is
historical/manual-recovery implementation, not routine authority.

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
