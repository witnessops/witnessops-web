# Alpine OS — mesh image & Node 22 builder

**Status:** digest-pinned default base (2026-08-19)

## What changed

Production mesh images use **Alpine Linux** through a reviewed
`node:22-alpine@sha256:<digest>` reference, not a mutable Debian or Alpine tag:

| Artifact | Base |
|----------|------|
| `deploy/Dockerfile.mesh` | digest-qualified `node:22-alpine` builder + runtime |
| `apps/witnessops-web/Dockerfile` | digest-qualified `node:22-alpine` runtime |
| `deploy/scripts/k3s-lib.sh` | reviewed pin supplied to both shared-image stages |
| `scripts/health-on-node22.sh` | reviewed digest-qualified `NODE22_BUILDER_IMAGE` default |

Builder installs `libc6-compat`, `python3`, `make`, `g++` for native modules (e.g. sharp).

## Debug-only manual override

The release helpers do not accept a mutable or caller-selected base. For an
explicitly authorized local experiment, both manual build arguments must still
be digest-qualified:

```bash
podman build -f deploy/Dockerfile.mesh \
  --build-arg NODE22_BUILDER_IMAGE='node:22-bookworm-slim@sha256:<reviewed-builder-digest>' \
  --build-arg NODE22_RUNTIME_IMAGE='node:22-slim@sha256:<reviewed-runtime-digest>' \
  -t docker.io/library/witnessops-web:debug-local .
```

## Hunt loop LLM (Ollama)

Ollama **models are OS-independent** (GGUF). On an **Alpine Linux host** (not proot-only), install Ollama from [ollama.com](https://ollama.com) or the official install script, then:

```bash
ollama pull gpt-oss:20b
bash scripts/verify-ollama-model-alpine.sh
```

Hunt loop requires **`gpt-oss:20b`** with `WOPS_OLLAMA_API=chat` (not `gemma3:1b` for tool/loop workloads).

An operator-custodied host may run **Ubuntu 22.04** for Ollama while mesh
**containers** are Alpine. Host identity and topology stay outside this repo.

## Related

- [`NODE22-BUILDER.md`](./NODE22-BUILDER.md)
- `WitnessOps/src/wops-local-llm/docs/ollama-alpine.md`
