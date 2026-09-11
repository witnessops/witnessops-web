# One Server Security Check v1 acceptance

Freeze date: 2026-09-11. **One Server Security Check v1 is technically accepted
locally.** This record does not authorize merge, publication, deployment or
external customer admission. The Linux candidate is not yet merged or deployed
and has not been externally customer-validated.

## Scope and accepted source

One operator-controlled Linux server; operator-present local UID 0 read-only
collection; off-host signing; verified Proofpack import; immutable history;
deterministic before/after comparison. No Watch, Update, remote execution,
scheduler, Windows or cloud support is implied.

| Component | Accepted identity |
| --- | --- |
| App branch | `feat/witnessops-app-foundation` |
| App implementation | `809efdd6eb11fd687bb769c8b736023aec380a1a` |
| Producer branch | `codex/local-audit-offhost-signing` |
| Producer implementation | `fce41c194522e9d08d0683aa786bd4361c5ae0c2` |
| Producer documentation | `76e698a5b33f3a21b652fd6702714403f750c4ca` |
| Proof format | Local Audit 1.2.2 |
| Pilot collector fingerprint | `2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8` |

This freeze supersedes the synthetic-only and next-pilot status in historical
[P1/P2 integration notes](repo-knowledge/39-CURRENT-REUSE-AND-INTEGRATION-PLAN.md).
The External Exposure proofpack research describes a separate unsigned product;
its historical app inventory is not the current Linux admission contract.

## Real pilot

Asset label: `witnessops-n8n-01`. Observed hostname: `ip-172-26-9-158`.
App asset UUID: `be2043fb-7467-4b97-8728-ee2babbeaec3`. The app UUID is identity;
the observed hostname is evidence, not a cross-asset lookup key.

| | Run 1 | Run 2 |
| --- | --- | --- |
| App run UUID | `d406a822-26e8-44f8-b9a8-74409b46f13a` | `5cbf424f-411a-4b21-8f32-62c012abe7b4` |
| Proof run | `pr_lsa_20260911200904_016b1ed5ff` | `pr_lsa_20260911204631_c4b86029cd` |
| Observed time (host clock, UTC) | `2026-09-11T20:09:04Z` | `2026-09-11T20:46:31Z` |
| ZIP SHA-256 | `af30d46334d7f679b491ee8afeb52c3f171e35672a8671e75099e57b20181e46` | `be25b3b120aae116a9bad45393cc97b28c3448a05c888bea9ca5a9144e36d601` |
| Collection | Live, `synthetic=false`, partial | Live, `synthetic=false`, partial |
| Findings | 0 critical, 1 high, 2 medium, 1 low, 1 informational | 0 critical, 1 high, 2 medium, 1 low, 1 informational |

Run 2 selects Run 1 as the nearest earlier admitted run for the same workspace
and asset. Hostname, available machine identity and OS identity remain continuous;
method/profile context is unchanged. Qualification remains `COLLECTION_GAP`.

- **Environment:** no supported recorded value changes in the compared projection.
- **Coverage:** no changes.
- **Uncertainty:** persistent updates evidence gaps. Security classification remains
  unavailable; security update count remains **null**, not zero. Pending updates
  are recorded, but cached metadata freshness is not established.
- Both sources record 15 expected and 17 observed listeners. The two Tailscale TCP
  listeners remain needs-review, not silently approved. Bind state does not prove
  public reachability.

Comparison is field-aware and bounded to the current projection. It is not a diff
of every source byte. Incomplete sections do not establish environment changes;
critical-file comparison covers projected metadata, not an assurance that all
file contents are unchanged.

## Trust, custody and reopen

The accepted pilot retained the production key off-host: unsigned capture →
operator-side finalization/reconstruction/signing → independent verification →
fresh app verification. Signer: `witnessops_local_audit_prod_2026_01`.
Selected registry SHA-256:
`4f3ef3b9468a9de3e0a4d3ec573db25bbff86c9c458901931d01e36f4493e939`.

Receipt and detached ZIP signer continuity passed. Trust comes from independently
selected/pinned registry context, never package `public_key.json`. App custody
preserves exact ZIP, signature, signed filename and registry context. Source
digests are ZIP hashes; snapshot/report hashes do not replace them. Retained ZIP,
signature and registry hashes were rechecked during this freeze and matched.

Both saved runs reopened with fresh verification at the accepted app head;
source identities, findings and partial states remained stable. Slice 3N closed
the transient 429 reopen blocker from Slice 3M: one initial request plus at most
three bounded retries applies only to explicit verification-busy responses, with
navigation cancellation. The verifier remains bounded; no permanent verification
cache or shared authorization cache was added. Comparison survives reload.
The existing single-run report and print path passed; this does not assert a
new persisted PDF or a comparison PDF.

## Claim boundary and limitations

**Valid != secure. Signed != source-system truth.** Verification establishes the
declared signature, integrity and reconstruction checks. Reports/PDFs are derived.
Hostname continuity is not physical-host authentication; hostname/bind state is
not public reachability. Unsigned capture digests establish correspondence, not
host authenticity. Host timestamps are not a trusted timestamp service.

Known limitations: APT security classification unavailable; cached update
freshness unknown; two unresolved Tailscale TCP listeners; one Ubuntu host only.
Partial update evidence stays partial/unknown. No claim of complete assessment,
absence of compromise or compliance follows from this pilot.

## Validation matrix

Recorded exact-candidate results were inspected rather than rerunning expensive
suites or creating further pilot data. Targeted review/diff checks were fresh.

| Area | Command/evidence | Result |
| --- | --- | --- |
| App unit | `pnpm --filter @witnessops/app test` | 54/54 |
| App PostgreSQL/authorization | `pnpm --filter @witnessops/app test:db` | 27/27 |
| Live admission | `pnpm --filter @witnessops/app test:db:live` | 1/1 |
| Linux browser/retry | `pnpm test:app-browser linux-check.spec.ts` | 16/16, Chromium/WebKit |
| EE/auth/report/build/lint/types | `pnpm health`; app typecheck | Recorded PASS; report/print acceptance retained |
| Producer full release gate | Existing release-check / Local Audit suites | 283/283: 64 shared + 155 Local Audit + 64 Launch Ready |
| Producer output identity | Old implementation versus split, identical frozen inputs/key | All 20 outputs byte-identical, including receipt/manifest/ZIP/signature |
| Producer verifier parity | Split synthetic output through web verifier and report adapter | Valid, buyer model available |
| Producer fresh split tests | `PYTHONPATH=src python -m unittest discover -s tests -p test_capture.py -v` in Local Audit product with the accepted test environment | 19/19; disposable keys only |
| Producer offline runtime | Frozen bundle, clean network-disabled bootstrap and target setup | Recorded PASS; system Python unchanged |
| Additional emulated installed-wheel suite | Existing 50 ms child-output timeout test | 154 pass / 1 fail; scheduler/startup timing caveat, unchanged threshold |
| Real pilot | Two imports, exact custody, baseline, reopen, comparison and authorization acceptance | PASS locally at accepted heads |
| Repository whitespace | `git diff --check` | Fresh PASS in both worktrees |

The emulated suite is **not** reported as 100% passing. Resolve or independently
bound that timing assumption before making a broader runtime-support claim.

## Review result

**App: READY for merge review. Producer: READY for local merge review.** No
confirmed code-security blockers were found. This is not release approval.

App review covers all 22 branch commits / 112 changed files from
`cbbc12d67fc352770e4836164f63a57a8e2e011d` through the accepted app head.
Security diff scan `3c876668-a6c6-4c5a-adc2-07404f844e30` is sealed with zero
findings. Its canonical coverage is **PARTIAL**: the tool retained an earlier
in-progress deferred note despite the completed per-file review of all 112 paths.
Do not describe that sealed artifact as a complete-coverage scan. A cleanly
finalized release-gate scan remains required before deployment.

Producer review covers all eight changed files from
`947cf2dd56a3c4b0e2df8be7e0a09247b7bd1fc0` through its documentation head.
Security diff scan `0604bc8c-f3b3-4a2b-8bba-c24497bb04c1` is completed/sealed,
with full changed-file coverage and zero findings.

| Merge risk | Classification / evidence |
| --- | --- |
| Trust bypass, package-key self-trust, synthetic/live confusion | CLOSED in reviewed admission: one verified path, server-pinned registry, signed live/fixture consistency |
| Cross-workspace access and source mutation | CLOSED in scoped queries, request authorization, immutable custody constraints and recorded tests |
| Verifier concurrency and retry storm | CLOSED for reported defect: bounded slot, explicit busy classification, capped/cancelled retries; no permanent cache |
| Key on target / capture authenticity | Pilot custody accepted; unsigned capture authenticity remains a KNOWN LIMITATION, not repaired by later signing |
| Null-to-zero conversion / hostname conflation | CLOSED in reviewed projection/comparison; incomplete coverage remains explicit |
| Stale dev singleton, presentation/documentation debt, emulated timing test | KNOWN LIMITATIONS; follow-ups and release gates below |
| Production migration/runtime mismatch | Deployment gate, not tested or changed by this freeze |

Cross-repo compatibility is confirmed for product 1.2.2,
`host_triage_evidence_collection`, `linux_baseline_v1`, `operator_present_local`,
live/fixture classification, existing proof-run identity and
`witnessops.receipt.v0`. Both use existing receipt/Proofpack signer purposes,
detached ZIP envelope and independent registry admission. Hostname and partial
updates map through existing source contracts. The app checks fingerprint shape
and signed consistency, not an old wheel/fingerprint allowlist. A fingerprint
records provenance; it does not independently establish collector trust.

The retained runtime archive is `local-audit-pilot-runtime-fce41c194522.tar.gz`,
SHA-256 `922f54c36809fd00c68d9dd19790298226bcd50bcd511b7af74fdd5fafd1038d`.
Its pilot wheel SHA-256 is
`8922d275e0a9553c9b829cb53f6cf3ff3cfed57d502b85789b132c5920ccef80`;
it must not be substituted for the historical released wheel under that wheel's
identity. Runtime installation acceptance is recorded prior evidence, not a
new target inspection in this review.

## Merge and deployment boundaries

Migrations `0007_linux_checks.sql` and `0008_linux_snapshots.sql` are additive:
0007 replaces type/check constraints to admit Linux and adds immutable child
custody; 0008 adds nullable derived snapshot storage. No current table is dropped
or EE evidence rewritten. Existing completed-run and source immutability remain.
Constraint replacement requires database locks; apply in order using the existing
checksum-tracked transaction/advisory-lock migrator, not hand SQL.

Suggested dependency order, subject to separate approval:

1. Merge producer implementation/documentation first against its confirmed target;
   retain the exact private pilot build as distinct from the historical 1.2.2 wheel.
   Producer currently has no configured remote, so remote PR/publication checks
   remain outstanding. Public producer release is not an app code dependency;
   controlled accepted runtime custody is required before additional collection.
2. Merge app after the cross-repo review. Build and scan an immutable candidate
   image. Neither merge authorizes deployment.
3. Before deployment, verify production migration head/checksums, take and verify
   a current backup/recovery point, arrange the migration lock window, apply only
   missing approved migrations with the migration role, and verify runtime grants.
4. Replace the old app with one exact-image instance through the accepted lifecycle;
   test health, WorkOS/session revocation, Owner/Viewer/foreign/revoked boundaries,
   Linux import/reopen/report, EE behavior and backup/recovery readiness.

Rollback before new Linux admission can restore the previous app image while
retaining additive schema. There are no automatic down migrations. After new
evidence exists, preserve it: do not drop Linux custody or overwrite the database
with an old backup. Rehearse recovery separately and reconcile later evidence.

Dev-only limitation: `Symbol.for("witnessops.app.persistent-service.v1")` preserved
pre-Linux service state through hot reload. Restart the development process after
service/schema changes. Production replacement starts a fresh process; this is a
development follow-up, not evidence of a production stale-cache defect.

Before external Linux release, correct the generic settings/access note claiming
all sources are unsigned; Linux original packages are signed, while reports are
derived. Historical synthetic-only API summary/prose and the public-only security
scope documentation also need alignment. These do not weaken current admission,
but must not become customer or deployment instructions.

## Product status

One Server Security Check v1 is now technically accepted locally. External demand,
willingness to pay, supported distro breadth, runtime distribution UX and buyer
acceptance of an operator-present local flow remain **unknown**. No Watch/Update
scope is added. This freeze performs no collection, import, signing or production
mutation and does not claim the product is finished.
