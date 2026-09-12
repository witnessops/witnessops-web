# One Server Security Check v1 — final merge preparation

Inspected 2026-09-12. **READY FOR EXPLICIT MERGE APPROVAL**, not production readiness or permission to push/merge. No product source changed. See [canonical acceptance](ONE_SERVER_SECURITY_CHECK_V1_ACCEPTANCE.md) and [real-host evidence](WOPS_SERVER_CHECK_ACCEPTANCE.md#accepted-real-host-flow).

## Exact repository state

| Repository | Target / rollback reference | Source | State |
| --- | --- | --- | --- |
| Local Audit producer | local `main`, `947cf2dd56a3c4b0e2df8be7e0a09247b7bd1fc0` | `codex/local-audit-offhost-signing`, `76e698a5b33f3a21b652fd6702714403f750c4ca` | READY TO MERGE locally; clean, target is merge base, 0 target-only / 2 source-only commits |
| WitnessOps app | GitHub `witnessops/witnessops-web`, `main`, `cbbc12d67fc352770e4836164f63a57a8e2e011d` | `feat/witnessops-app-foundation`, milestone `58d35f9ea6873d713435ae6838d5b8e4e203c66d` | READY; clean before this documentation, target is merge base, 0 target-only / 33 feature-only commits before this plan |

Producer is a local Git repository with no configured remote or upstream. Its existing main checkout and feature worktree are clean. Neither `fce41c194522e9d08d0683aa786bd4361c5ae0c2` nor `76e698a5b33f3a21b652fd6702714403f750c4ca` is merged into main. They are the entire two-commit series; the latter changes only documentation and does not supersede implementation. No remote publication target can be claimed or invented.

App `git ls-remote --symref origin HEAD refs/heads/main` freshly confirmed GitHub default main and the exact target above. Local main and origin/main agree. The feature currently tracks origin/main rather than a published feature branch. No target changes since branch divergence, no merge conflicts by ancestry, and no need to rebase. The new plan commit adds documentation only to the feature series. Recheck these exact refs immediately before authorized merge; this is not a promise about later remote state.

## Producer review and gates

Complete eight-file diff reviewed: capture.py, package.py, operator.py, cli.py, the narrow live-validation change in collector.py, capture tests, product instructions and off-host/runtime acceptance documentation. No unrelated product changes found.

`audit capture` checks local runtime/authority and emits bounded canonical unsigned input without loading a production key. `audit finalize` consumes frozen bytes/digest, reconstructs admission and derived content, and signs off-host without recollection or host-clock substitution. The old one-shot wrapper retains key preflight and shares the same finalizer. Collection must finish within authority; later offline finalization is allowed without changing source timestamps.

Existing receipt v0, detached signature, manifest, verifier and trust-purpose implementations are unchanged. Capture schema is `witnessops.local_server_audit.capture.v1`; product remains 1.2.2. Collector fingerprint is frozen producer provenance, not a host attestation; the pilot build remains distinct from the historical 1.2.2 wheel. Changed source contains no new private signer material or production key location; retained security review reports no production secrets.

Retained exact-source gates: release-check 283/283 (64 shared, 155 Local Audit, 64 Launch Ready); 19 capture/finalize tests including tamper, negative, symlink, keyless-capture and no-recollection cases; original/split 20-file byte identity; web verifier valid; offline bundle/bootstrap and isolated runtime accepted. Standard source scan `032e066a-31b9-47ac-8dad-4e623d4bdf6a` and producer diff scan `0604bc8c-f3b3-4a2b-8bba-c24497bb04c1` recorded zero findings. Fresh ancestry/source-diff and whitespace checks pass. No target/source drift requires rerunning expensive suites now.

Known qualification: extra emulated installed-wheel suite had 154 passes and one 50 ms timing failure. Do not call that suite passing or extrapolate wider-platform support. Main has not moved; this is not a new merge conflict or changed-code regression. Remote CI/publication is unavailable until a separate producer remote is explicitly selected; local fast-forward approval does not require inventing one.

## App series and gates

The full series includes foundation and bounded EE execution, WorkOS/DB/tenant sessions, report/history, Early Access feedback, previously accepted runtime origin/logout/restart fixes; Linux verified import and immutable source; snapshot and Environment/Coverage/Uncertainty comparison; synthetic/live admission; labels and bounded reopen retry; P0/P1 copy and discovery; CLI login/status/logout; Owner-scoped server check, safe sudo handoff, capture/upload, off-host finalization, independent verification and atomic run linkage; explicit windows and producer-compatible listener qualifiers; acceptance docs. Shared public EE/report/UI, PDF CI and app lifecycle files are intentional earlier foundation changes, not new deployment operations. No Watch, Update, installer, scheduler, remote runner, fleet or unrelated product series identified.

Retained gates at product HEAD b7db9f1: CLI 28/28, server-check integration 13/13, app lint/typecheck and full Node 22 health 1,885 tests/zero failures. Earlier unchanged layers retain CLI DB 17/17, existing DB 27/27, live admission 1/1 and browser/regression evidence. Incremental security scans and their scope caveats are in the canonical acceptance; do not relabel them a new whole-branch standard scan. The accepted real-host run `5479ee39-70ed-42e4-9347-01f1ccfc40a8` passed exactly-one custody, verification, report/reopen/comparison; it targets local/test, not production. The previous freeze freshly checked CLI tests and source digests. This plan only adds prose; fresh diff/docs validation is sufficient before its commit.

Remaining merge actions: explicit authorization, refresh target refs/worktree state, and normal PR/CI review for the exact proposed app head after separately authorized publication. No code reconciliation blocker is known. A clean standard security scan and image/dependency/runtime validation remain production release gates, including the earlier whole-app scan coverage caveat.

## Migrations

| Migration | Effect |
| --- | --- |
| 0007_linux_checks.sql | Linux asset/source CHECK extensions, immutable source child table and run/source binding |
| 0008_linux_snapshots.sql | Nullable derived snapshot column/constraint; no backfill over immutable rows |
| 0009_cli_auth.sql | Dedicated hashed login transactions/sessions using existing user/workspace identity |
| 0010_server_checks.sql | Explicit optional scope and immutable execution linkage/capture custody |

No numbering collisions: target main has no app migration files; the full feature provides 0001–0010. Production may already have some applied from accepted runtime work: inspect its actual ledger later, never infer database state from Git. Use the checksum-tracked migrator in numerical order, applying only missing approved files. 0007/0010 replace constraints (including DROP CONSTRAINT), not tables or evidence rows. Existing CLI credentials retain cli:session; no implicit product-scope upgrade. No production migration performed.

## Proposed order — not executed

1. After explicit local producer merge approval, recheck clean target/source and exact references. In the existing producer main checkout use `git merge --ff-only codex/local-audit-offhost-signing`. It includes exactly fce41c1 and 76e698a; preserves accepted commit identities and matches the linear local history. No squash/rebase needed. Confirm resulting HEAD 76e698a and run the post-merge checks below.
2. Retain the accepted producer runtime/build identity and private custody separately. No public wheel publication is necessary merely to merge app code.
3. After explicit app push/PR authorization, publish the exact app feature head (including this docs plan), review the full series and required CI. GitHub allows all merge methods; main history uses merge commits, so prefer a normal PR merge commit preserving reviewed identities over squash/rebase. Reconfirm target cbbc12d6 or stop/review drift before merge. Merge only after explicit authorization.
4. Enter separately authorized production deployment preparation. Source merge itself grants no production migration, image deployment, finalizer activation, CLI distribution, production signing smoke or customer-use permission.

App code can technically merge before producer: its runtime dependency is the installed accepted producer, not a Git branch pointer or published wheel. Operationally prefer producer authority/custody first, then app. Deploying/enabling server checks without the accepted configured producer fails preflight and is not approved.

## Post-merge checks and rollback

Producer: confirm exact HEAD and clean tree; `make release-check` in the accepted environment; retain/check source fingerprint and capture/finalize byte-identity tests. Use disposable fixtures/keys only, no real collection or production signing. If merge tree differs, stop and renew validation/security review.

App: verify merged tree corresponds to the reviewed feature, ancestry and clean state; Node 22 `pnpm health`; isolated `test:db`, `test:db:cli`, `test:db:server`, `test:db:live`; relevant app browser/auth/Linux/report tests; route parity and migration checksum/order checks. Fixture signing is disposable only. Revalidate any changed merge tree; no production migration, new real run or target access belongs to these checks.

Rollback/reference points: producer 947cf2dd56a3c4b0e2df8be7e0a09247b7bd1fc0; app cbbc12d67fc352770e4836164f63a57a8e2e011d. Published Git rollback should use separately reviewed reverts, not force-push. Runtime rollback restores an approved image/config while retaining additive schema and all accepted evidence. Never delete or rewrite historical captures, Proofpacks, execution markers or runs to roll back source.

Production remains NOT YET AUTHORIZED: coordinated DB/finalizer backup and restore; production migration ledger/locks/grants; immutable image/build scan/digest and restart recovery; WorkOS HTTPS/CLI origins and revocation; finalizer producer/key/registry/custody configuration; authenticated CLI distribution/version; separately authorized exactly-one production smoke, report/reopen and external-user admission. These are future gates, not completed by this plan.
