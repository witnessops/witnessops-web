# Repository Findings Memo

- **Generated:** 2026-05-03T17:35:00Z
- **Scope:** Workspace sweep (`~/WitnessOps/repos`)
- **Repo path:** `/Users/sovereign/WitnessOps/repos/witnessops-web`
- **Branch:** `codex/add-proof-runs-page-v1`
- **Tracking ref:** `refs/remotes/origin/main`
- **Remote:** `https://github.com/witnessops/witnessops-web.git`
- **Dirty:** yes (`7` entries)
- **Dirty sample:** `M apps/witnessops-web/src/app/public-claim-boundary.test.ts`, `M apps/witnessops-web/src/app/sitemap.static-routes.test.ts`, `M apps/witnessops-web/src/app/sitemap.ts`, `M scripts/smoke-buyer-path.ts`, `M tests/route-parity/app-paths-manifest.baseline.json`, `M tests/route-parity/routes-manifest.baseline.json`, `?? apps/witnessops-web/src/app/proof-runs/`
- **AGENTS.md:** present

## Gates run in this pass
- Orientation-only pass with no AGENTS-required checks found in this file.

## Findings
- Repo in feature branch with active proof-runs edits and baseline/test changes.
- Good candidate for verification before merge due mixed tracked/untracked route/route-parity changes.
