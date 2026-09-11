# WOPS server check — Slice 4B

Status: **READY FOR REAL-HOST ACCEPTANCE**, based on local implementation tests; controlled real-host acceptance **not executed**. No installer, publication, push, merge or deployment. Base app commit: `5547af4017b9cfaa28644a34bc8807c8be630631`.

## Target UX

1. As a normal account, `wops auth login`; an Owner explicitly selects server-check request/upload permission in the existing browser confirmation.
2. `sudo wops server check` shows the observed hostname and credential-bound workspace.
3. Enter the reason, intended SSH exposure and exact expected listener endpoints (or `none`), then confirm one 30-minute read-only collection window and upload.
4. The CLI captures, uploads, reconciles finalization, and returns the existing app run URL. Partial collection is a legitimate result, not a failed host or a secure-host claim.

No remote, collector-path, signing-key, registry, profile or arbitrary-command flags. No `--yes`: the current authority contract needs explicit listener and operator declarations. The unique existing Linux hostname asset is selected; otherwise the normal Linux asset model is used to create it. A conflicting asset/type fails closed.

## Authority separation

- **Operator:** existing internal user, active cohort/account/workspace membership, Owner role and explicit `server_check:create` capability. Existing `cli:session` credentials retain status/logout rights only. Scope covers this product's execution request and capture upload, not generic uploads or signing access.
- **Collection:** immutable existing Local Audit authority object records asset, hostname, pseudonymous operator reference, workspace declaration, reason, exact listener policy, profile, read-only action, prohibited artifact classes and window. The authorization and case identifiers are this execution's identifier. Authority timestamps use the producer's whole-second precision.
- **Issuance:** operator-configured off-host Local Audit runtime, private key and signer identity. No caller selects a key, signer, registry or executable. The registry comes from the app's existing pinned registry input.
- **Verification:** existing producer verifier followed by existing app `verifyProofpack`, live classification validation, buyer adapter and immutable Linux import.

CLI identity and operator declarations do not establish physical host identity, independent collection authority, honest observations, or source-system truth. The capture is unsigned correspondence input. Signing does not upgrade those claims.

## Sudo / local auth model

Linux UID 0 and a nonzero numeric `SUDO_UID` are required. `/usr/bin/getent passwd` resolves that UID's home; `$HOME`, `$XDG_CONFIG_HOME` and `$SUDO_USER` do not select the credential file. The original user's default Linux auth directory/file must have private ownership/permissions, regular-file/no-symlink checks, bounded size and the existing credential schema. Root reads the credential without copying it into root configuration or journals. Custom XDG locations are not supported for this sudo flow.

The fixed runtime is `/opt/witnessops/local-audit-1.2.2/runtime/bin/python3`. Before execution the CLI checks root control of the runtime tree, symlink destinations, exact cryptography version and producer fingerprint correspondence with the server runtime. The subprocess uses isolated Python and a fixed sanitized environment. Only existing `audit capture` is invoked; no collector logic is duplicated.

Private root-owned journals, authority and capture files live beneath the runtime's `staging/wops` directory. Directories are 0700, files 0600. Auth credentials are absent from those files. One local lock serializes the flow. A stale lock, interrupted capture without a frozen result, or expired uncollected authority requires operator review; the CLI never silently recollects.

## Capture / upload lifecycle

`authorized → uploaded → run_created` is the successful path. Capture bytes remain the exact canonical `witnessops.local_server_audit.capture.v1` input. No receipt or final ZIP is created on the collection host.

The bearer API uses the existing origin policy and rechecks current scope/membership on every request:

- `GET /api/cli/server-checks`: authorized context, or execution reconciliation with the execution header.
- `POST /api/cli/server-checks`: fixed request schema, select/create Linux asset and freeze authority.
- `POST /api/cli/server-check-capture`: exact capture bytes, execution identifier and SHA-256 correspondence.

No caller-supplied workspace is trusted. Execution queries bind current user and workspace. Uploads are limited to 25 MiB with a bounded read timeout. Requests are limited in process; a PostgreSQL advisory lock bounds validation/finalization across processes. Workspaces have 32 execution and 200 MiB accepted-capture limits, alongside existing asset/run limits. Rejected inputs can remain private in their bounded execution custody directory for review.

The existing producer validates canonical encoding, structure, product/profile/mode, timestamps, admission and reconstructed observations. The app compares the frozen authority, hostname and collector fingerprint to the execution before accepting upload. Live classification must remain `synthetic=false` / `live_approved`. Observed OS, machine identity and architecture continue through the existing collector, snapshot and comparison; no hardware attestation is invented.

## Off-host finalization and source custody

`server-check-finalize.py` is a narrow adapter to the installed accepted producer. It calls existing `validate_capture`, `finalize_product`, signer-purpose checks and independent `verify_proofpack`. It neither imports nor invokes a collector operation. Posture, findings, completeness, manifest and receipt are reconstructed by the producer.

The server preserves capture and pinned-registry bytes in a private durable execution directory. A flushed, directory-synced exclusive `started` marker is written **before** signing. Completed output is independently reverified and matched back to the capture's exact observations, authority and collector identity. Incomplete issuance after that marker fails closed and requires operator reconciliation; it cannot automatically sign again.

The normal `LinuxCheckStore` admission implementation runs inside the execution's database transaction. Final ZIP, detached signature, selected registry, digests, snapshot and completed run are committed atomically with the execution/run link. The signed ZIP remains canonical accepted evidence; the capture linkage does not replace `runs.source_digest`.

The same report, comparison, history, source downloads and fresh reopen verification apply. No second product/run/report type was added.

## Idempotency / recovery

A stable client request UUID is unique per internal user/workspace; changing its request body is rejected. An execution can bind exactly one capture byte sequence and digest. Repeated identical uploads return the same state. Reusing that capture for a different authority/asset fails its binding checks.

The root-owned local journal survives connection loss and contains no bearer credential. A later invocation reconciles the existing execution before considering capture. Timeout after upload or finalization does not create another capture/run. If database commit is interrupted after issuance, retained completed artifacts are reverified and reused; signing is not repeated. A completed run and execution link commit together.

A durable finalizer directory must be retained with the database. Losing it after issuance is a recovery incident, not permission to sign again. This local foundation assumes one trusted finalization host/shared custody directory; multi-host issuance and automatic cleanup are not implemented.

## Operator-side configuration / distribution boundary

Local app startup configuration requires `WITNESSOPS_FINALIZER_PYTHON`, `WITNESSOPS_FINALIZER_KEY`, `WITNESSOPS_FINALIZER_SIGNER` and `WITNESSOPS_FINALIZER_DIRECTORY`. These are server configuration only; no values or secret locations are committed. Missing configuration stops context/authorization before collection. The finalizer validates the selected key against the app-pinned registry. The app process must run from its normal package working directory and have its Python adapter available.

Use the existing accepted producer implementation `fce41c194522e9d08d0683aa786bd4361c5ae0c2`, proof format 1.2.2. The tested producer fingerprint was `2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8`; it is recorded here as test provenance, not hardcoded as a permanent product trust rule. The producer worktree remained unchanged.

Before distribution: package the CLI/root-owned runtime and adapter deliberately; pin dependencies/builds; define durable custody backup/recovery, issuer process containment and quotas/retention. No package was published and no installer was added. Existing local/dev invocation is the supported scope of this slice.

## Migration

`0010_server_checks.sql` is additive to existing product storage: it extends CLI scope checks without upgrading existing credentials, adds `server_check_executions`, its request/run uniqueness constraints and immutable authority/capture/terminal-state trigger. No evidence table or existing run is rewritten. Migrations were exercised only in isolated test schemas, not applied to the pilot or production database.

## Tests / acceptance evidence

All signing tests use newly generated disposable keys and a test-process-only registry hook. Fixture observations are frozen through the accepted producer; no live collection occurs. The test launcher deletes its disposable signing material afterwards.

| Command | Evidence |
| --- | --- |
| `pnpm cli:test` | 20 tests: auth regressions, sudo identity/private-file validation, listener input, capture failure, wrong host, upload/finalization interruption recovery and token non-disclosure |
| `WOPS_TEST_PYTHON=<accepted isolated producer Python> pnpm --filter @witnessops/app test:db:server` | 11 tests: scope/current membership, authority and capture binding, malformed/oversized inputs, cross-workspace denial, real producer finalization and app verification, byte custody, exactly one run, baseline, partial/null semantics and full CLI-to-service fixture flow |
| `pnpm --filter @witnessops/app test:db:cli` | 17 existing CLI identity/session tests |
| `pnpm --filter @witnessops/app test:db` | 27 existing app database tests |
| `pnpm --filter @witnessops/app test:db:live` | 1 existing live-classified admission regression |
| `pnpm test:app-browser` | 77 existing Chromium/WebKit cases including Linux/report/PDF/reopen |
| `pnpm exec playwright test --config tests/app-foundation/playwright.config.ts cli-auth.spec.ts` | 14 cases including explicit Owner product-scope opt-in, consent reset and Viewer restriction; desktop/390px coverage |
| `pnpm health` | PASS: 1,877 TAP tests, zero failures; web/app builds, lint, typecheck and document checks passed |
| `git diff --check` | PASS |

An initial integration test caught millisecond authority boundaries conflicting with the producer's whole-second admission record; new windows now use its existing precision. An initial full health run reached final typecheck and found a test-only union narrowing omission; the assertion was corrected. Neither required a proof-contract change.

## Security review

Engineering diff scan `c5daa8a1-0da9-478b-a617-192483d8153e`: zero reportable findings, 20 inventory files plus supplemental test/browser support. Documentation is outside that sealed engineering snapshot. The final documentation and test-only additions received a supplemental review with no findings.

| Threat | Classification / boundary |
| --- | --- |
| Sudo credential leakage / root-user config confusion | CLOSED by originating-account lookup, strict private reads, no credential journal, fixed environment; root compromise remains outside this guarantee |
| Viewer escalation / stale membership / revoked session | CLOSED by explicit scope and current centralized Owner/cohort/account/workspace checks per request |
| Workspace/asset substitution | CLOSED by scoped execution lookup and exact frozen authority/hostname binding |
| Capture/upload tampering, replay, duplicate issuance | CLOSED for byte correspondence and request binding; one capture per execution, transactional run link, durable issuance marker |
| Synthetic/live confusion | CLOSED by producer mode/classification validation and unchanged app admission |
| Production signer exposure / user-selected signing | CLOSED at client/API boundary; key stays in independently configured off-host custody, no CLI key argument or signing dependency |
| Failed verifier accepted / source replacement | CLOSED by existing independent verifier plus normal app admission and capture/output correspondence |
| Interrupted request ambiguity | CLOSED for automatic duplicate capture/run/signing; incomplete issuance needs manual recovery |
| Host substitution by dishonest root / fabricated observations | KNOWN LIMITATION: unsigned capture, hostname and machine metadata do not attest a physical host or truthful source |
| Capture containing deliberately inserted secrets | KNOWN LIMITATION: existing collector excludes prohibited sources, strict format bounds apply, but semantic validation cannot prove arbitrary submitted strings contain no secret; private custody and no raw logs remain necessary |
| Logs leaking credentials/artifacts | CLOSED for application/CLI normal output; subprocess errors are replaced with bounded messages, test keys only in automated fixtures |
| Finalizer-host compromise or lost durable custody | KNOWN LIMITATION requiring separate operational containment/recovery acceptance |

No release/deployment or whole-host security claim follows from these local tests.

## Real-host acceptance plan — prepared only

1. Prepare a reachable, separately authorized test app with migration 0010 and reviewed off-host runtime/signer custody; no production deployment is implied. Select one separately authorized operator-controlled Linux host and fresh collection window.
2. Confirm the accepted root-controlled runtime, system invariants and absence of signing material on that target.
3. Authenticate as the normal account; explicitly grant the Owner server-check scope in the correct workspace.
4. Review the observed hostname, selected asset, reason, exact intended listener list and collection/upload authority.
5. Execute exactly one `sudo wops server check` only after that separate authorization.
6. Check local private capture bytes/digest, off-host custody and issuance, independent verification, and exactly one saved app run.
7. Reopen the existing report and check source correspondence, partial/null states and claim boundaries; inspect selected host invariants without claiming whole-host immutability.
8. Exercise safe upload/status retry without recollection. Authorize a separate second collection only if comparison acceptance is required.

**NOT EXECUTED in Slice 4B.** No real host was contacted, no production key used, no real capture uploaded, and no pilot run created or changed.
