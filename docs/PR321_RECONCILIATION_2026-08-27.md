# PR #321 reconciliation — 2026-08-27

Status: `BLOCKED`

This record covers the PR-only reconciliation requested after the production
restoration from source commit `7be8b8ee21a36a7e95baff49108461a7db814c6d`
to `1abb1247d4e261b56d98004a4bbdcb974c7e40bf`. It does not authorize or record
an image publication, environment approval, SSM execution, merge, or production
change.

PR #321 had already been merged at `2026-08-27T08:40:49Z` as merge commit
`ccec7fd36ae920449e227588105223273cad796e` before this reconciliation branch
was prepared. This work therefore belongs in a separate, held follow-up PR.

## Rollback reconstruction

The mechanism is known:

1. GitHub Actions run `33037153611` built and published source
   `7be8b8ee21a36a7e95baff49108461a7db814c6d` as ECR manifest digest
   `sha256:66d978f03cfc074a3761dabb9598af7f988b6699511bb0c253d468e0ef81e0e5`.
2. Run `33038236518` deployed that digest to production.
3. Run `33038721685` then explicitly supplied source
   `1abb1247d4e261b56d98004a4bbdcb974c7e40bf`, ECR manifest digest
   `sha256:fff927f4abdac5da8d1b1145a0c421039050caae7a39bcb98bb1d442de5dfccf`,
   and expected-current digest `sha256:66d978f03cfc074a3761dabb9598af7f988b6699511bb0c253d468e0ef81e0e5`.
   Its bounded production SSM job completed successfully.
4. The later read-only production status receipt
   `wops-pr321-prod-readonly-status-20260827T065907741Z.txt` observed manifest
   digest `sha256:fff927f4abdac5da8d1b1145a0c421039050caae7a39bcb98bb1d442de5dfccf`,
   config digest `sha256:da41be5aa841062eaa4103f44728d1732e160aa7d12a13fe5251235fad33d5a0`,
   `1/1` ready, and HTTP `200`.

The rollback reason is `UNRESOLVED`. The workflow inputs and logs, PR #318,
PR #319, PR #321, and their available review/comment history establish a
deliberate restoration but do not state the condition that motivated it.
Green CI on either commit is build/test evidence, not evidence of that missing
operational rationale.

The PR #321 head `c5c3fcbf76e22529b5fd5cb9d40dba7eee385b41` and its merge commit are each a
134-file cumulative delta from the restored production source
`1abb1247d4e261b56d98004a4bbdcb974c7e40bf`. Until the reason is supplied or an
authorized operator explicitly accepts that unknown, this lane cannot establish
that the candidate avoids the condition that caused the restoration.

## Seven-finding disposition

All seven findings from the standard scan of PR #321 head
`c5c3fcbf76e22529b5fd5cb9d40dba7eee385b41` are classified `FIXED` in this
follow-up candidate. Exact-head tests and a fresh standard scan are required
before the follow-up PR may be reviewed.

| # | Finding | Disposition | Remediation evidence |
|---|---|---|---|
| 1 | Bounded `SKILL.md` can synchronously block the browser main thread | `FIXED` | Accepted input is capped at 16 KiB and oversized paste/upload is rejected before scanning. |
| 2 | Duplicate artifact paths can create false receipt-scoped hash binding | `FIXED` | Artifact paths must be unique; duplicate paths make artifact and binding checks unverified. |
| 3 | Local skill files are hashed after lossy UTF-8 decoding | `FIXED` | Uploads use fatal UTF-8 decoding and the exact accepted UTF-8 byte sequence is hashed. |
| 4 | Uploaded filenames can inject Markdown into exported Aegis reports | `FIXED` | The source is reduced to a sanitized basename before display/export. |
| 5 | Exported Aegis report omits the input digest | `FIXED` | The exported report binds source, SHA-256, byte count, verifier, and policy. |
| 6 | Public JSON endpoints accept malformed UTF-8 after replacement | `FIXED` | `/api/verify` and `/api/ask-witnessops` use the shared strict bounded UTF-8 reader and reject malformed input. |
| 7 | Skipped receipt checks are hidden | `FIXED` | Internal `skip` maps to visible `not_checked`, not `not_applicable`. |

## Deployment authority

A merge to `main` may run the low-authority image build and verification
workflow, but it cannot publish the image. The privileged publish job requires
an explicit `workflow_dispatch`; the regression is covered by
`deploy/scripts/no-automatic-image-publication.test.mjs`.

Routine production authority is:

`exact main commit -> immutable ECR digest -> protected aws-production environment -> OIDC deploy role -> bounded SSM document -> Frankfurt k3s`

The protected `aws-production` environment requires review, prevents self
review, and does not allow administrator bypass. Production deploys require the
expected-current digest, so the workflow fails closed on unexpected runtime
drift.

The former Mac/local-image/SSH/direct-k3s routine path is retired. The legacy
`deploy:k3s:build`, `deploy:k3s:prod`, and `deploy:k3s:both` package aliases now
fail closed with `RETIRED_PRODUCTION_DEPLOY_PATH`. Read-only production status
and smoke commands remain available. Historical direct scripts are retained
only as explicitly authorized recovery material; they are not routine
deployment authority.

## Release verdict

`BLOCKED`

The code findings may be cleared by exact-head verification, but the rollback
rationale is still unknown. A merge decision requires either evidence of that
rationale and candidate-specific coverage, or an explicit operator acceptance
of the unresolved production risk.
