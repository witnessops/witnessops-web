# Node 22 builder guidance

**Status:** repository validation guidance

## Requirement

Release-quality `pnpm health` and `pnpm build` for this repository use **Node 22**.
Do not treat a partial check on another Node major as equivalent evidence.

## Supported local path

From repo root on a machine with Docker:

```bash
pnpm health:node22
# or
bash scripts/health-on-node22.sh
```

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

- [`OPTIMIZATION-LANGUAGE.md`](./OPTIMIZATION-LANGUAGE.md)
- `.grok/skills/optimize-witnessops-web/SKILL.md`
