---
name: health
description: >
  Run pnpm health from the repository root and summarise pass or fail.
  Invoke only with /health. Do not run it automatically.
disable-model-invocation: true
---

# Health

Run the repository health gate and summarise the result. This skill does not deploy, publish, or mark a release live.

## Before running

1. Work from the repository root.
2. Check `node -v` and `pnpm -v`. This repo expects Node 22 (`.nvmrc`, `package.json` `engines`) and pnpm `9.15.4`.
3. If Node is not major 22, stop. Say that `pnpm health` on another major is not release-quality evidence. Do not start `pnpm health:node22` unless the user asks; that wrapper needs a container engine.
4. Do not run `deploy:k3s` deploy, status, smoke, teardown, or hygiene scripts, `kubectl`, `git push --force`, or `rm -rf`.

## Run

```bash
pnpm health
```

`pnpm health` builds and checks the public website, runs the root test script (including `deploy:aws:test` and `deploy:ghcr:test`), validates docs and signals, then builds and checks the authenticated app. It does not replace the app database or browser suites in `apps/witnessops-app/README.md`.

## Summarise

Report:

- pass or fail
- Node and pnpm versions used
- the script that failed, when it fails, and the first meaningful error
- which earlier steps completed

A passing `pnpm health` is local repository evidence on Node 22. It is not production deployment, publication, or proof that a release is live.
