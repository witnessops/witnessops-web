# Alpine OS — mesh image & Node 22 builder

**Status:** default base (2026-06-21)

## What changed

Production mesh images use **Alpine Linux** (`node:22-alpine`), not Debian bookworm-slim:

| Artifact | Base |
|----------|------|
| `deploy/Dockerfile.mesh` | `node:22-alpine` builder + runtime |
| `apps/witnessops-web/Dockerfile` | `node:22-alpine` runtime |
| `build-witnessops-web-mesh.sh` | `MESH_BASE_OS=alpine`, build-args for image pins |
| `scripts/health-on-node22.sh` | default `NODE22_BUILDER_IMAGE=node:22-alpine` |

Builder installs `libc6-compat`, `python3`, `make`, `g++` for native modules (e.g. sharp).

## Override (debug only)

```bash
export NODE22_BUILDER_IMAGE=node:22-bookworm-slim
export NODE22_RUNTIME_IMAGE=node:22-slim
export MESH_BASE_OS=debian
./build-witnessops-web-mesh.sh
```

## Hunt loop LLM (Ollama)

Ollama **models are OS-independent** (GGUF). On an **Alpine Linux host** (not proot-only), install Ollama from [ollama.com](https://ollama.com) or the official install script, then:

```bash
ollama pull gpt-oss:20b
bash scripts/verify-ollama-model-alpine.sh
```

Hunt loop requires **`gpt-oss:20b`** with `WOPS_OLLAMA_API=chat` (not `gemma3:1b` for tool/loop workloads).

**goal0-edge-01** today runs **Ubuntu 22.04** for Ollama; mesh **containers** are Alpine. That split is intentional until goal0 host OS changes.

## Related

- [`NODE22-BUILDER.md`](./NODE22-BUILDER.md)
- `WitnessOps/src/wops-local-llm/docs/ollama-alpine.md`