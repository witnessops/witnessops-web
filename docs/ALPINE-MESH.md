# Alpine and mesh image reference

**Status:** retained source reference, not release or deployment authority.

The earlier August note described a shared k3s build as the general deployment
path. That is not a repository-wide instruction. The inspected sources still
use digest-pinned Node 22 Alpine images, but the website, authenticated app and
local validation wrapper have distinct build and acceptance paths.

## Read the selected source, not a copied image recipe

| Source | Role |
| --- | --- |
| [`apps/witnessops-web/Dockerfile`](../apps/witnessops-web/Dockerfile) | Website runtime built around prebuilt standalone output; its package steps and reviewed image pin belong to this file. |
| [`deploy/app/Dockerfile`](../deploy/app/Dockerfile) | Separate authenticated-app build/runtime, including its accepted finalizer producer. Not a shared website/app image. |
| [`scripts/health-on-node22.sh`](../scripts/health-on-node22.sh) | Local validation wrapper with a digest-qualified default/override and a dependency-admission gate. A successful run is not exact production-image acceptance. |
| [`deploy/Dockerfile.mesh`](../deploy/Dockerfile.mesh) and [`deploy/scripts/k3s-lib.sh`](../deploy/scripts/k3s-lib.sh) | Retained reference/shared-helper source. Classify its use through the deployment boundary, not the age of this note or a historical dual-lane recipe. |

Do not copy a digest or substitute a different base OS from an old example.
The inspected Dockerfiles have Alpine-specific package steps. Validate any
proposed base change against the selected build and exact runtime tests.
Container base, host operating system and release authority are different facts.

## Historical material

The [pre-reconciliation note](https://github.com/witnessops/witnessops-web/blob/beada60e313199e7432841e1d1b0a93e140f1fc1/docs/ALPINE-MESH.md)
retains the old debug-build example and Ollama/hunt-loop context. Those instructions
are not website/app build prerequisites or authority to install software, run a
remote helper or deploy. This documentation change does not remove the referenced
scripts, change their defaults, or assess a separate local-LLM project.

## Related

- [`NODE22-BUILDER.md`](./NODE22-BUILDER.md) — repository-local validation.
- [`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md) — website release, app acceptance and retained-helper classifications.
- [`apps/witnessops-app/README.md`](../apps/witnessops-app/README.md) — app-specific acceptance and runtime boundaries.
