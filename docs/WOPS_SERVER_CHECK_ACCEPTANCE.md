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

## First Real Host Acceptance

Verdict: **BLOCKED at local preflight; no real-host execution performed.**

Preflight recorded: 2026-09-12 01:13 Europe/Warsaw (2026-09-11 23:13 UTC). No collection window was opened.

The checkout was on `feat/witnessops-app-foundation`, HEAD `d436e1d4a0b09915d528bee98123dac6f7a0ce60`, with a clean working tree before this record. A read-only inspection confirmed the selected local development database, but its migration history ended at `0008_linux_snapshots.sql`. Required migrations 0009 and 0010 were absent. No migrations were applied during this acceptance attempt.

The local app configuration file contained none of the four `WITNESSOPS_FINALIZER_*` settings required by this implementation. Running-process configuration and production signer custody were not independently checked; absence from that file is not proof of absence from the process environment.

Selected candidate: `witnessops-n8n-01`; expected observed hostname `ip-172-26-9-158`; existing asset `be2043fb-7467-4b97-8728-ee2babbeaec3`. The target hostname was not freshly observed because acceptance stopped before target access. The selected asset still had exactly two completed Linux runs:

- Latest: `5cbf424f-411a-4b21-8f32-62c012abe7b4`, source ZIP digest `be25b3b120aae116a9bad45393cc97b28c3448a05c888bea9ca5a9144e36d601`.
- Earlier: `d406a822-26e8-44f8-b9a8-74409b46f13a`, source ZIP digest `af30d46334d7f679b491ee8afeb52c3f171e35672a8671e75099e57b20181e46`.

No CLI identity/workspace session was exercised, no authority window or execution was created, and no capture, Proofpack, signature or new app run exists for this attempt. Signing, independent verification, comparison, sudo handoff and target invariants remain untested in this real-host lane. No target mutation or product-code change was performed.

Pre-collection policy discrepancy: the newly supplied listener list omits UDP `127.0.0.54:53`, which appeared in the earlier accepted baseline. It was not silently added or approved. Resolve the intended policy before collection.

UX: no terminal journey was attempted, so no new P0/P1/P2 journey finding is asserted. The immediate blocker is environment preparation, not a demonstrated product defect. Prepare the local development migrations and reviewed off-host finalizer configuration, verify target CLI/runtime and test-app connectivity, resolve listener policy, then resume with a fresh authorization window. No push, merge or deployment occurred. This attempt does not establish end-to-end real-host acceptance of `sudo wops server check`.


## Preflight Blocker Resolution

2026-09-12 — **READY TO RESUME REAL-HOST ACCEPTANCE**, not real-host acceptance PASS. Product source remains `d436e1d4a0b09915d528bee98123dac6f7a0ce60`. The blocked-attempt record above is preserved.

### Local database

A private logical custom-format recovery backup, `before-0009-0010.dump`, was retained outside the repository (89,696 bytes, file 0600, parent 0700). SHA-256: `16119c0abefd77df7d4676fa5fc10f5b5690fce2c4d9a3080d32ba7cccd23bf3`. Its location and before/after records remain in private operator custody.

The configured local development database was confirmed before using the normal `pnpm db:migrate` command. Migration history advanced from 0008 through 0010. The committed 0009/0010 add CLI transaction/session and server-check execution support; the CLI scope constraint is replaced to admit explicit product capability. Existing evidence/run data is not rewritten. CLI tables and execution table are present.

Full ordered-row SHA-256 comparisons before migration, after migration and after tests match for runs (8: six EE, two Linux), Linux source custody (2, including ZIP/signature/registry bytes), assets (3), workspaces (1), users (1) and memberships (1). Both pilot runs and source digests listed above are unchanged. The development execution table remains empty. Test runs use isolated test schemas and disposable identities; no new pilot run was created.

### Finalizer configuration and custody

All four settings are now present in ignored, private local app configuration:

| Setting | Purpose / value type | Classification |
| --- | --- | --- |
| `WITNESSOPS_FINALIZER_PYTHON` | Absolute path to existing isolated accepted-producer Python | Non-secret runtime reference |
| `WITNESSOPS_FINALIZER_KEY` | Absolute reference to existing operator-side private key; no key copied | Sensitive custody reference |
| `WITNESSOPS_FINALIZER_SIGNER` | Server-selected production signer ID | Non-secret |
| `WITNESSOPS_FINALIZER_DIRECTORY` | Real, process-owned private 0700 output/custody directory | Non-secret custody reference |

These must be available before the service initializes; restart after configuration changes. The old dev process had none in its initial environment and its dotenv file lacked them. It was stopped gracefully and replaced from the accepted checkout. The new local process reports loading `.env.local`; the current unauthenticated server-check route returns 401 `invalid_credential`.

The existing accepted-producer development runtime imports under isolated Python (`-I`), uses cryptography 50.0.1 and reports collector fingerprint `2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8`. This is a retained local runtime, not a distribution/install acceptance; its runtime/source paths must remain available. The release build venv alone lacks cryptography and was not selected.

The actual app `LocalAuditFinalizer.preflight()` succeeded using the same configuration. It loads the production key without signing, derives its public key and checks both existing purposes through the existing trust loader. Signer: `witnessops_local_audit_prod_2026_01`. Pinned registry SHA-256: `4f3ef3b9468a9de3e0a4d3ec573db25bbff86c9c458901931d01e36f4493e939`. Key file ownership/private permissions were checked. Only the public pinned registry is written by preflight. No production signature was generated and no key bytes or custody path were added to repository documentation or logs.

Target key absence is **not freshly verified**: target access is forbidden in this preparation. Prior off-host custody evidence is retained; fresh bounded target checks remain part of the resumed acceptance. No whole-host key-absence claim is made.

### Dry readiness and authorization

The existing server-check integration suite passed with frozen fixture observations, a disposable signer and isolated test schema. It exercises the real producer finalizer, independent verification, normal Linux persistence/reopen, idempotency, partial/null preservation and failure paths. It performs no live host collection. Separately, production availability/trust was tested only through non-signing preflight.

Owner product scope `server_check:create` and execution creation pass in disposable local tests; Viewer denial, stale membership/session revocation and workspace binding pass. No real operator CLI session or development execution was created by these tests.

### Proposed listener authority for the next acceptance

This is a proposal for the next fresh authority review, not a newly opened collection window. The omitted UDP `127.0.0.54:53` appears in the earlier accepted authority and the retained second-capture authority; restore it as local DNS infrastructure. No live listener inspection occurred.

```text
EXPECTED TCP — sshd / existing Caddy HTTP(S)
TCP 0.0.0.0:22
TCP [::]:22
TCP 0.0.0.0:80
TCP [::]:80
TCP 0.0.0.0:443
TCP [::]:443

LOCAL / INFRASTRUCTURE EXPECTED
TCP 127.0.0.53%lo:53 — local DNS
UDP 127.0.0.53%lo:53 — local DNS
TCP 127.0.0.54:53 — local DNS
UDP 127.0.0.54:53 — local DNS (omission restored)
UDP 172.26.9.158%ens5:68 — DHCP
UDP 127.0.0.1:323 — chronyd
UDP [::1]:323 — chronyd
UDP 0.0.0.0:41641 — Tailscale transport
UDP [::]:41641 — Tailscale transport

NEEDS REVIEW — not approved as expected
TCP 100.127.165.71:60128
TCP [fd7a:115c:a1e0::ec2d:a548]:36271
```

Fifteen expected endpoints; the two unresolved TCP listeners remain needs-review. Bind state does not establish public reachability.

### Freshness checks

All commands used Node 22; DB commands ran from the app package.

| Command | Result |
| --- | --- |
| `pnpm db:migrate` | PASS, existing migrations through 0010 |
| `pnpm test:db` | 27 passed |
| `pnpm test:db:cli` | 17 passed |
| `pnpm test:db:server` with existing `WOPS_TEST_PYTHON` | 11 passed, disposable signing only |
| `pnpm test:db:live` | 1 passed |
| `pnpm cli:test` (repository root) | 20 passed |
| `pnpm --filter @witnessops/app typecheck` | PASS |
| `pnpm exec playwright test --config tests/app-foundation/playwright.config.ts cli-auth.spec.ts` | 14 passed, Chromium/WebKit desktop/mobile |
| `git diff --check` | PASS |

No product code or migration file changed. No full health rerun was needed for documentation/local configuration and application of existing migrations. Existing CSS compatibility and terminal color warnings did not fail browser checks.

### Resume point

The three preparation blockers are resolved. Resume at **fresh target preflight → explicit authority review and fresh window → `sudo wops server check`**. Target runtime/CLI availability, connectivity to this local test app, normal operator login with product scope and fresh target key absence still require the real-host lane. No target connection, collection, real upload, production signing, new development Linux run, push, merge or deployment occurred here.
