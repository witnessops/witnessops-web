---
name: ci-triage
description: >
  Use when a pull request check fails, when choosing the local command that
  matches a CI job, or before pushing. Read the first failing job. Do not
  sleep-poll CI.
---

# CI triage

Match the local command to the job that failed. Do not sleep-poll `gh` or the checks API. Do not weaken a test or a workflow to get green. Do not merge or deploy from this workflow.

## When a check is red

1. List checks once: `gh pr checks` or `gh run list --branch <branch> --limit 10`.
2. Open the log of the first failing job: `gh run view <run-id> --log-failed`.
3. Read that first failure before later jobs. Authenticated app validation acceptance depends on every job in `.github/workflows/app-validation.yml`. A later red step can be fallout from the first one.
4. Reproduce with the matching local command below, fix the cause, and re-run that command before pushing.

## Command map

| Local command | CI job |
| --- | --- |
| `pnpm install --frozen-lockfile` | Frozen install step in each Node job |
| `pnpm health` | Authenticated app validation, "Full repository health (app, CLI, verifier, report, lint, types)" |
| `pnpm lint`, `pnpm typecheck` | Included in `pnpm health`; run them on their own before push |
| `pnpm --filter witnessops-web build` | Build witnessops-web image; also the build step in Homepage Hero UI Proof, PDF Pagination Gate, and Release witnessops-web |
| `pnpm --filter witnessops-web test` and `pnpm smoke:buyer-path:test` | Homepage Hero UI Proof, "Run commercial-truth regression tests" |
| `pnpm ui-proof:hero:ci` | Homepage Hero UI Proof, "Run homepage and navigation UI proof" |
| `pnpm ui-proof:skill-conformance` | Homepage Hero UI Proof, "Run governed verifier conformance UI proof" |
| `pnpm test:pdf-pagination` | PDF Pagination Gate |
| `pnpm test:app-browser --project=chromium` or `--project=webkit` | Authenticated app validation, "App browser" |
| `pnpm morpheus:handoff:test` | Authenticated app validation, "Morpheus read-only handoff intake" |
| `pnpm --filter @witnessops/app test:db` and the `:live`, `:cli`, and `:server` variants | Authenticated app validation database steps |
| `pnpm proof:test` or `pnpm optimize:quick-check` | Proof and verify coverage inside `pnpm health`; quick-check is the local fail-closed subset |
| `bash -n` and `node --test deploy/aws/*.test.mjs` as named in the workflow | Validate AWS Phase 3 source. This job does not run a pnpm script |
| Python validators under `tools/witnessops-security-validators` | WitnessOps Security Validators |
| `python3 -I tools/supply-chain-gate/verify_install_admission.py` after the workflow's admission env is set | WitnessOps Supply Chain Gate, which other PR workflows call first |

Targeted web tests, from `apps/witnessops-web`:

```bash
NODE_ENV=test TSX_TSCONFIG_PATH=tsconfig.test.json node --import ./scripts/register-server-only-test-stub.mjs --import tsx --test <file>
```

## Before the next push

Run `pnpm lint` and `pnpm typecheck`. Add `pnpm --filter witnessops-web build` when site inputs changed, `pnpm smoke:buyer-path:test` for public copy, and `pnpm optimize:quick-check` for proof or verify edits. Push the fix and read the new run's first failure if it is still red. Do not poll on a timer.
