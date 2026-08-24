# Releasing witnessops-web

Status: internal/manual release and dual-lane k3s deployment authority

This document is the operator release procedure for `witnessops-web`. It must be
read with [`docs/DEPLOYMENT_AUTHORITY.md`](./docs/DEPLOYMENT_AUTHORITY.md) and
[`docs/DEPLOYMENT_CUSTODY.md`](./docs/DEPLOYMENT_CUSTODY.md). Those documents
define the current runtime, custody, evidence, and rollback boundaries.

A release validation is not a deployment, and a successful deployment does not
authorize DNS, Caddy, API/app exposure, OffSec execution, or any other external
surface.

## Current release contract

- Releases and deployments are manually approved and operator-run.
- Use Node 22 and pnpm 9.15.4, as required by `.nvmrc` and `package.json`.
- `pnpm release` is the frozen **build-only** release entrypoint. It does not
  tag a commit, publish an image, deploy either lane, generate an SBOM, sign an
  artifact, or create a GitHub Release.
- The current deploy target is a private k3s topology injected from operator
  custody through the variables documented in `deploy/topology.env.example`.
- Prod and mesh-dev workload names are private injected values.
- A dual-lane release uses one shared image reference in both deployments.

Do not describe an image, SBOM, release artifact, signature, receipt, workflow,
or deployment as produced unless the named command or external workflow
actually produced it and its result was recorded.

## Validate a release candidate

Start from the published `main` branch and record the source commit and working
tree state. Do not silently ship uncommitted changes.

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain)"
git status --short --branch
node --version
pnpm --version

pnpm health
pnpm deploy:k3s:test-parity
pnpm release
```

`pnpm health` is the full repository gate. When buyer-visible pages, copy,
links, forms, or proof surfaces changed, also run the focused buyer-path test
and record its exit result:

```bash
pnpm smoke:buyer-path:test
```

`pnpm deploy:k3s:test-parity` validates the pure image/CSS comparison helpers.
It does not inspect the live deployments. `pnpm release` performs the build
only; passing it does not mean that a deploy occurred.

## Deploy the approved commit

Deployment requires an explicit apply lane. Before applying, record the source
commit, dirty state, current prod and mesh-dev image references, and a known
rollback image or rollout revision.

From the repository root, build one shared image and deploy that same image to
both lanes:

```bash
pnpm deploy:k3s:both
pnpm deploy:k3s:smoke
```

`pnpm deploy:k3s:both` builds once, applies prod and mesh-dev, and invokes the
dual-lane smoke. The explicit follow-up `pnpm deploy:k3s:smoke` records the
post-apply state independently.

The deployment is not complete until the smoke exits successfully and its
evidence shows all of the following:

1. prod and mesh-dev use the identical full container image reference;
2. `https://witnessops.com/` returns HTTP 200;
3. `MESH_DEV_URL` returns HTTP 200 over the private network; and
4. the primary CSS hash is identical in prod and mesh-dev.

For buyer-visible changes, also check every changed public route in English and
Polish as applicable on both lanes, run the buyer-route sweep and forbidden-link
scan required by the deployment custody contract, and record the HTTP results.
Do not publish mesh-dev URLs in buyer-facing content.

The supported narrower entrypoints remain available only when the authorized
lane explicitly names a single target:

```bash
pnpm deploy:k3s:build   # build/import shared image only
pnpm deploy:k3s:prod    # prod only
pnpm deploy:k3s:dev     # mesh-dev only
```

For the normal prod plus mesh-dev apply, use `pnpm deploy:k3s:both` so the
shared-image invariant is preserved.

## Release evidence

Record at least:

- authority lane and operator;
- repository path, source commit, start/end dirty state, and `DEPLOY_SSH`;
- exact validation and deployment commands with exit results;
- files and buyer-visible routes changed;
- generated image reference and image ID;
- previous prod and mesh-dev image references;
- rollout status for both deployments;
- identical-image, prod HTTP 200, mesh-dev HTTP 200, and CSS-hash parity output;
- buyer-route and forbidden-link results when the public surface changed;
- the named rollback image or rollout revision; and
- explicit statements that DNS, Caddy, API/app exposure, and OffSec execution
  were not changed unless separately authorized.

If `ALLOW_DIRTY=1` was explicitly authorized, preserve the dirty-state evidence
in the receipt. A mutable tag alone is not sufficient rollback evidence.

## Rollback

Use the approved, known-good source commit captured before deployment. Rebuild
and import that commit through the same repository-owned dual-lane path; do not
assume that an older local image is still present in k3s containerd, and do not
run a bare workstation `kubectl` command against an unverified context.

```bash
WOPS_ROLLBACK_ROOT="$(mktemp -d /tmp/witnessops-web-rollback.XXXXXX)"
git worktree add --detach "$WOPS_ROLLBACK_ROOT/source" <known-good-source-commit>
cd "$WOPS_ROLLBACK_ROOT/source"
corepack pnpm install --frozen-lockfile
pnpm deploy:k3s:both
pnpm deploy:k3s:smoke
```

After evidence is recorded, return to the primary checkout, remove the exact
temporary worktree with `git worktree remove "$WOPS_ROLLBACK_ROOT/source"`, and
remove the now-empty temporary directory. This produces a new timestamped image
from the known-good source and imports it before applying it to both lanes.

Record the rollback command, resulting image references, rollout status, HTTP
results, and CSS parity. Caddy or DNS rollback belongs to its separately
authorized lane.

## Artifact publication is separate from runtime deployment

`.github/workflows/release.yml` and `.github/workflows/build-image.yml` are
executable artifact-publication surfaces. Depending on their authenticated
trigger, they can build and publish GHCR images, attach supply-chain material,
sign artifacts, and create a GitHub Release. Their definitions are not evidence
that a particular run succeeded; use the actual workflow run and published
artifacts for that claim.

Running either workflow requires separate release/publication authority. Neither
workflow is the current private-k3s runtime deployment path, and a published GHCR
image or GitHub Release does not prove `witnessops.com` was deployed.

These paths remain historical for live runtime deployment:

- SemVer tags or GHCR `stable`, version, or SHA images as the current runtime
  source;
- `deploy/scripts/deploy.sh` and the Docker Compose path; and
- archived Azure deployment material.

If the GitHub workflows are intended to be retired completely, disable their
triggers in a separate reviewed code change; documentation alone does not retire
an executable workflow.
