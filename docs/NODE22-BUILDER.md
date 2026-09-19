# Node 22 builder guidance

**Status:** repository validation guidance

## Requirement

Release-quality `pnpm health` and `pnpm build` for this repository use **Node 22**.
Do not treat a partial check on another Node major as equivalent evidence.

## Supported local path

On Node 22 with the pinned package manager and admitted dependencies, use
`pnpm health` from the repository root. The optional container wrapper below
requires a local container engine and Python 3 for its supply-chain gate:

```bash
pnpm health:node22
# or
bash scripts/health-on-node22.sh
```

[`scripts/health-on-node22.sh`](../scripts/health-on-node22.sh) defaults to Docker;
its `CONTAINER_CMD` option also supports an available Podman executable. It checks
digest-qualified image input, runs dependency admission, mounts the repository
read/write, performs a frozen-lockfile install and runs health. It can change
local dependencies/build output; it is not a read-only inspection or a remote
runtime smoke test. Read the current script for its pin and prerequisites.

`pnpm health:node22:goal0` points to a retained, optional **remote** helper. It is
not a fallback when the local engine is unavailable; remote use needs its own
operator authority and privately supplied configuration.

## Build and acceptance boundaries

- Root `pnpm build` and `pnpm release` target the public website. `pnpm app:build`
  targets the authenticated app; neither command deploys it.
- `pnpm health` includes source builds, lint, typechecks and ordinary tests. App
  database and browser suites remain separate; see the [app README](../apps/witnessops-app/README.md).
- A matching Node base does not make two image builds identical. The app's
  [validation workflow](../.github/workflows/app-validation.yml) builds, scans and
  tests an exact candidate archive. Retaining that archive is not production
  publication or proof that it is deployed.

Production publication and deployment are separate operator actions. A merge or
successful local build does not establish that a particular release is live.
Host identity, cloud trust details, private staging paths, credential locations,
and deployment topology are intentionally outside this public validation guide.

## Repo pins

- `.nvmrc` → `22`
- `package.json` `engines.node` → `>=22.0.0 <23`
- Application/runtime Dockerfiles pin reviewed Node 22 images where applicable.

## Do not

- Treat passing `optimize:quick-check` on another Node major as equivalent to `pnpm health` on Node 22.
- Treat historical deployment material as current production authority.
- Add private host aliases, remote checkout paths, cloud identifiers, or operator credential locations to this public guide.

## Related

- [`DEPLOYMENT_AUTHORITY.md`](./DEPLOYMENT_AUTHORITY.md)
- [`ALPINE-MESH.md`](./ALPINE-MESH.md) — retained image-source context, not a deployment recipe.
- [`OPTIMIZATION-LANGUAGE.md`](./OPTIMIZATION-LANGUAGE.md)
- `.grok/skills/optimize-witnessops-web/SKILL.md`
