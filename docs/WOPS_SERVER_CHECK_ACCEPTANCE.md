# WOPS server check — Slice 4B

Current status: **REAL-HOST FLOW ACCEPTED against the local/test app**, as recorded below. Earlier dated preparation/failure sections are retained history, not the current verdict. No installer, publication, push, merge or deployment. Base app commit: `5547af4017b9cfaa28644a34bc8807c8be630631`.

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


## Fresh Target Preflight

2026-09-12 01:28 Europe/Warsaw — **BLOCKED; no execution or collection authorized.**

Local checkout was clean on `feat/witnessops-app-foundation` at `b60615681ca2090c32760e0951cb5ccc290984fd`. The same restarted local app process is running and its CLI server-check route returns the expected unauthenticated 401. Local development migrations are through 0010. Both historical Linux run IDs and ZIP digests remain unchanged; latest is `5cbf424f-411a-4b21-8f32-62c012abe7b4`. Server-check execution count remains zero. All four private finalizer settings remain present; the existing non-signing adapter preflight again reports the accepted collector fingerprint. No production signing occurred.

The committed CLI entrypoint was used for `wops auth status` (the unrelated PATH command was not substituted). It stopped with “Auth storage permissions are unsafe. Use a private owner-only directory/file.” The existing operator-owned auth directory is 0755; the CLI requires 0700. No credential contents were printed and no permissions were changed. Login would encounter the same storage gate. Current CLI identity, workspace, Owner role and product capability therefore remain unconfirmed.

An SSH connection was attempted only to the selected target. Tailscale required an additional interactive operator authentication check before executing the requested hostname/user/sudo probes. The pending connection was terminated cleanly. No target command output was obtained. Actual hostname, user/sudo, machine continuity, OS/kernel/architecture, isolated runtime, key absence, listener inventory, process attribution and selected service invariants are **NOT VERIFIED**, not assumed unchanged. No other host was contacted.

Tentative planning window only: **2026-09-12 01:30–02:00 Europe/Warsaw (2026-09-11 23:30Z–2026-09-12 00:00Z)**. This is not approved or frozen; replace it after both gates are resolved and fresh checks pass. No execution object was created.

Draft human review context: One Server Security Check; intended existing asset `be2043fb-7467-4b97-8728-ee2babbeaec3` / `witnessops-n8n-01`; expected hostname `ip-172-26-9-158`; intended workspace Acme Ltd, subject to authenticated confirmation; operator identity pending. Local operator-present read-only collection, Local Audit 1.2.2 / `linux_baseline_v1`, live-approved capture only after explicit authority. The proposed fifteen expected endpoints and two needs-review endpoints remain exactly as recorded in Preflight Blocker Resolution. No listener change is approved or inferred. The future capture would be uploaded for off-host finalization/signing, with no permanent agent, remediation, package or configuration changes. This is a draft, not an observed CLI confirmation or ready-to-use authority object.

Authority differences: fresh proposed timestamps only (EXPECTED, unapproved). Hostname, OS, machine identity, listeners, runtime, services and needs-review endpoint continuity are UNKNOWN pending access; lack of current evidence is a BLOCKER to approval. Operator identity/capability is also a BLOCKER. Do not interpret unavailable observations as environmental change.

Resume only after the operator completes the Tailscale authentication gate and the local auth-storage permission issue is resolved in an authorized preparation step. Then use normal CLI login/status, repeat the target preflight, refresh the proposed window and request explicit collection authorization. No collection, upload, signing, new app run, product code change, push, merge or deployment occurred. Real-host acceptance remains unproven.


### Fresh target preflight resumed after operator authentication

2026-09-12 01:32 Europe/Warsaw — **BLOCKED for CLI readiness; target read-only checks succeeded.** The prior failed attempt remains above as history.

SSH reached only the selected host. Observed hostname `ip-172-26-9-158`; user `ubuntu`, UID/GID 1000; `sudo -n true` succeeded and `sudo -n id -u` returned 0. Machine identity using the collector's exact stripped-byte SHA-256 representation is `f1bcbc1c6ff21ad0db72b951750e19f20c53cc5f0024d5c58a2f95d48bb81757`, matching both prior captures. The initial raw-file hash differs only because it includes the trailing newline; it is not the collector identity representation. Ubuntu 24.04.4 LTS, kernel `6.17.0-1019-aws`, x86_64 and hostname all match the previous captures: no observed identity drift.

The existing Local Audit runtime, staging and output directories are root-owned 0700. Isolated imports succeed, cryptography is 50.0.1, accepted collector fingerprint matches, and `audit capture --help` works without invoking collection. System Python is 3.12.3 with cryptography 41.0.7. No installation or upgrade occurred.

Bounded signing-key absence check: PASS for reviewed locations. Known production-key paths for root/ubuntu are absent; runtime-tree filename inspection found no signing-key/private-key/credential/auth-file candidates; bounded setup/config/output text inspection found no private-key PEM blocks. This does not claim absence of every possible secret anywhere on the host. No signing material was transferred.

Fresh socket inventory exactly matches the retained 17 endpoints: 15 unchanged expected, 2 unchanged needs-review, zero new and zero missing. The exact endpoint list remains the Preflight Blocker Resolution list above, including UDP 127.0.0.54:53. TCP 22 is sshd; TCP 80/443 is docker-proxy for the existing Caddy published ports. UDP 41641 and the two needs-review TCP endpoints are tailscaled. DNS endpoints belong to systemd-resolved, DHCP to systemd-networkd and UDP 323 to chronyd. Process attribution does not approve the two TCP endpoints or establish public reachability.

Selected service checks: ssh, Docker, tailscaled, resolved, networkd and chrony active; no failed units reported. UFW inactive and nftables tables present, consistent with the earlier multi-backend observation; effective firewall behavior was not reconstructed. Package database readable, APT lists directory and apt-get present; no package operation, metadata refresh or update simulation performed. Caddy container publishes the expected 80/443 endpoints. These are bounded preflight checks, not the collector or whole-host immutability proof.

Local app migrations remain through 0010; both pilot runs/source digests unchanged and execution count zero. Non-signing finalizer preflight succeeds. Product HEAD remains `b60615681ca2090c32760e0951cb5ccc290984fd`; only this acceptance document is dirty.

Remaining blockers:

1. Normal Mac CLI `auth status` still rejects the existing operator-owned directory at 0755 (required 0700). No credential contents were read/printed or permissions changed. Current Owner identity/workspace/product capability remain unconfirmed.
2. Neither `wops` nor Node resolves on the target's ordinary user or sudo PATH. The Local Audit runtime exists, but the committed CLI invocation and authenticated handoff are not prepared there. This is PATH availability evidence, not an exhaustive filesystem absence claim. No installer, package or PATH mutation was performed.

Updated tentative window: **2026-09-12 01:40–02:10 Europe/Warsaw (2026-09-11 23:40Z–2026-09-12 00:10Z)**, unapproved and not frozen. Replace after readiness gates pass. Proposed authority retains the existing asset/expected hostname, fifteen expected endpoints and two needs-review endpoints, operator-present local read-only Local Audit 1.2.2 / linux_baseline_v1, and later upload/off-host signing. Workspace Acme Ltd and operator identity require actual CLI authentication confirmation. No execution-ready object or authority approval is asserted.

Authority differences: fresh draft timestamps EXPECTED; observed hostname/OS/machine/kernel/architecture/listeners/runtime/mode assumptions unchanged; retained two Tailscale endpoints NEEDS REVIEW; CLI authentication and invocation availability BLOCKERS. No collection, upload, signing, new run, service/package/configuration modification, push, merge or deployment occurred. Stop before `sudo wops server check`.


## CLI Readiness Resolution

2026-09-12 — preparation only; no server-check execution, collection, upload, signing or new run.

The existing Mac operator-owned auth directory was corrected from 0755 to 0700 without changing children or weakening code checks. It contained no credential. Normal CLI login against the local development app completed as Karol Stefanski / Acme Ltd / Owner; fresh server status returned active and `cli:session server_check:create`. The resulting credential file is owner-only 0600, and no credential was printed or copied to root/target storage. Its exact path remains outside public repository documentation.

Packaging inspection: private `@witnessops/cli` 0.0.1, entrypoint `src/main.mjs`, Node >=22 <23, no external runtime package dependencies and no existing compiled executable. Five runtime modules are copied verbatim from accepted commit b60615681ca2090c32760e0951cb5ccc290984fd; tests and unrelated repository state are excluded. A fixed shell wrapper only execs the fixed Node binary and main module with unchanged arguments. No installer or public publication is introduced.

Isolated Node v22.23.2 linux-x64 was obtained on the operator side from `https://nodejs.org/dist/v22.23.2/node-v22.23.2-linux-x64.tar.xz`; archive SHA-256 `d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307` matches the official same-origin HTTPS SHASUMS256.txt. This is checksum correspondence from the official HTTPS source, not an independently signature-authenticated release claim. Only its binary and license accompany the CLI. No target package manager or system Node modification is used.

Acceptance tree: `/opt/witnessops/cli-acceptance/`, root:ubuntu, directories 0750; binary/wrapper 0750, source/license/checksum files 0640, retained transfer archive 0600. Authorized operator group has read/execute only; root controls code. Fixed command wrapper `/usr/local/bin/wops` is root:root 0755. This placement permits normal-user login and root execution without modifying profiles or broad PATH configuration.

Artifact inventory (relative targets under the acceptance tree; wrapper also copied to `/usr/local/bin/wops`):

| Artifact | SHA-256 |
| --- | --- |
| `bin/node` | `3517c2df0b2f8cd7f422b4b8450ef81c6889f08eb03e281d6de9079b15e6a327` |
| `LICENSE` | `c738ae413cf561f174e34f6961f8ca458aae2369a73640dda6234c629b98bcc4` |
| `src/main.mjs` | `a56614bbd586e3bfa9a18cd355da4165e8e4af891d95f17a70f2d5d7d5daf71d` |
| `src/commands.mjs` | `9002297fdcaee505daaa8545bcc386a6726c590f27ad1437cd56ea79d7b67a9b` |
| `src/storage.mjs` | `d78e1a3b8cf6610c04411c33f7037ad0c7ad0ffa5d9ed275dd7da4959f9501b4` |
| `src/server-check.mjs` | `792c3b34ee9b179577d6d4c1c5d2397ef13f4e51f2506237e2bdcd1a19d9a585` |
| `src/server-local.mjs` | `1bb21f8579de42c780a5525747efb6ce0e4924664573df61e222df61333faade` |
| `wops` | `5214a168bc2b344eda21ca1871b3d46b5bd23b14b6d7e640bb7e7ed7739ef48c` |

Transfer archive SHA-256: `a41491ddcbd96291782e04df4cd363e2083195886fbf50d2bda3b4f6afedf760`. Private operator-side integrity record retains source/target mapping.


Target transfer and all eight payload member hashes passed before executing the binary. Node reports v22.23.2. Both user and sudo resolve the fixed accepted path; `/usr/local/bin/wops` matches the recorded wrapper hash. The current CLI has no --help implementation: `wops --help` and `wops server check --help` return bounded usage errors before auth/product execution. This is an existing UX limitation, not a successful help-page claim. No product code was patched.

Normal target `wops auth status` returns Not signed in and creates only empty ubuntu-owned 0700 `.config` / `witnessops` directories. No target credential is present. The harmless imported `originatingUid()` / `readOriginAuth()` probe under sudo resolves UID 1000 via SUDO_UID/account lookup and safely rejects the absent credential. It does not use or create root auth storage. `trustedRuntime()` passes with the accepted collector fingerprint. A successful credential-bearing handoff is **not yet proven**. `sudo wops auth status` was deliberately not used: normal auth commands do not implement the server-check sudo handoff.

The target cannot reach the Mac local development app at its own 127.0.0.1:3020; the bounded request fails. No tunnel, new listener, production endpoint substitution or credential transfer was introduced. Target login therefore remains blocked pending an explicitly prepared connection to the selected local test app, followed by normal ubuntu login and a safe credential-bearing handoff check. Mac login alone is not target authentication.

Selected before/after invariant hashes match for listeners, SSH config, sudoers, package DB, boot identity, system Python/cryptography, Local Audit runtime contents and service/timer unit inventories. The raw nft ruleset hash differs: its output contains live packet/byte counters, so that baseline does not establish unchanged firewall rules independently of counters. No firewall mutation command was issued; the exact cause of the raw difference is not established because only the initial hash was retained. Do not claim an exact firewall before/after match. No service restart or package operation occurred. Known target production-key paths and root CLI credential path remain absent; the transferred allowlisted artifact set contains code/runtime/license only, not signing material.

Target writes are limited to the acceptance tree (transfer.tar, bin/node, LICENSE, five src modules, wops, SHA256SUMS), `/usr/local/bin/wops`, and empty normal-user config directories/transient auth lock used by status. No credential was copied to root. This is reversible private acceptance setup, not deployment/distribution.

Checks: CLI unit suite 20/20; source/target archive and payload checksums PASS; runtime identity PASS; safe usage rejection PASS; normal target status Not signed in; originating UID resolution PASS / credential-bearing handoff BLOCKED; git diff --check PASS. Local pilot run count remains two and execution count zero. No product code changes; documentation only remains dirty and uncommitted.

Verdict: **BLOCKED**. The two original preparation repairs are complete (Mac permissions/auth and target CLI/runtime placement), but target login/connectivity is not ready. No refreshed collection window is proposed because readiness has not passed. The previous draft window must not be reused. Next: authorize/prepare the bounded target-to-local-app connection, perform normal target login, verify scope and safe sudo credential read without creating an execution, then propose a fresh unapproved window. No collection, capture upload, signing, app run, push, merge or deployment occurred.


## Target CLI Connectivity and Authentication

2026-09-12 01:44 Europe/Warsaw — **READY TO AUTHORIZE COLLECTION**, not real-host check acceptance PASS. Product HEAD remains `b60615681ca2090c32760e0951cb5ccc290984fd`; prior notes remain preserved.

The local app process (PID 21387) listens only on Mac 127.0.0.1:3020. The configured DB was rechecked as the local development database, migrations through 0010, two unchanged historical Linux runs and zero server-check executions. Non-signing finalizer preflight passed with the accepted collector fingerprint.

The existing supported CLI mechanism is `auth login --server URL`; it persists the chosen URL with the normally issued credential. Target login used `http://127.0.0.1:3020`, not production, an environment override or a new mechanism.

A **temporary acceptance-only SSH loopback tunnel** was created with `ExitOnForwardFailure=yes` and `-R 127.0.0.1:3020:127.0.0.1:3020` through the authorized connection to the selected target. Port 3020 was initially free. The target listener bound exactly to 127.0.0.1:3020, owned by tailscaled as the Tailscale SSH server. No wildcard/private-interface/tailnet-interface listener was added. A target request reached the Mac app and returned its expected unauthenticated 401.

The forward attached to the existing SSH control connection (Mac master PID 23049); no persistent service, autossh, client configuration, GatewayPorts or sshd configuration change was made. During the tunnel, the only added socket was TCP 127.0.0.1:3020. This remains temporary acceptance infrastructure, not a normal expected server endpoint and not silently added to listener authority. A future capture with the tunnel open may observe it and must retain that context honestly.

Normal ubuntu `wops auth login --server http://127.0.0.1:3020` created its own login transaction. The browser authorized the target's displayed code; the CLI redeemed its own transaction. No Mac credential was copied. Target `wops auth status` and a fresh session endpoint request confirmed Karol Stefanski / Acme Ltd / Owner / active, scope `cli:session server_check:create`.

Target storage: `/home/ubuntu/.config/witnessops` is ubuntu:ubuntu 0700; auth.json is a non-symlink regular file ubuntu:ubuntu 0600. No credential contents were printed. `/root/.config/witnessops/auth.json` remains absent.

Sudo handoff PASS: the existing non-product `originatingUid()` and `readOriginAuth()` helpers were imported under sudo, resolving originating UID 1000 through SUDO_UID/account lookup. The safely read credential was used only for GET session status; server response confirmed the same identity/workspace/role/scope. No root fallback, credential copy, execution creation or invocation of `serverCheck()` occurred. `sudo wops auth status` was not substituted because auth commands do not implement that resolver.

Post-authentication DB state: two CLI sessions; zero server-check executions; exactly the same two historical Linux runs and source ZIP digests. Authentication created no capture, Proofpack or accepted product run. No capture/finalizer issuance command was invoked.

Cleanup: canceled only this remote forward using `ssh -O cancel -R 127.0.0.1:3020:127.0.0.1:3020 witnessops-n8n-01`. Target port 3020 listener disappeared. The existing unrelated SSH control session was not killed. Recreate the identical loopback-only forward immediately before a separately authorized command, and revalidate session activity; closing the tunnel removes connectivity without revoking the credential. No persistent tunnel remains.

Network invariant comparison excludes nft packet/byte counter values. Counter-normalized firewall rules, sshd configuration and service/timer inventories match before/during/after; original socket set is restored after cleanup. The earlier raw nft hash was unsuitable as configuration-identity evidence because it included live counters; its historical difference was not retrospectively reconstructed. The Mac app remains loopback-only.

Proposed collection window: **2026-09-12 01:50–02:20 Europe/Warsaw**, equivalent to **2026-09-11 23:50Z–2026-09-12 00:20Z**. Status: **UNAPPROVED / NOT FROZEN**. Operator: Karol Stefanski, normal target user ubuntu. Workspace Acme Ltd; existing asset `be2043fb-7467-4b97-8728-ee2babbeaec3` / witnessops-n8n-01; hostname ip-172-26-9-158. One Server Security Check, Local Audit 1.2.2 / linux_baseline_v1, operator-present read-only local collection, followed only if separately authorized by capture upload and off-host signing. Fifteen expected endpoints and two unresolved Tailscale TCP endpoints remain as previously reviewed; the acceptance tunnel is distinct temporary infrastructure. No execution or frozen authority was created in this slice. The CLI's actual window is minted on confirmation, so it must fit the approved bounds when execution is later authorized.

Remaining blockers: none for requesting collection authorization. Recreating the reviewed tunnel and checking the short-lived credential are execution preconditions, not evidence that collection occurred. Focused checks passed: loopback-only forward, target login, server-side scope, private storage, sudo resolver, zero execution/run change and cleanup. No product-code changes. No collection, capture upload, signing, new app run, push, merge or deployment. Stop pending explicit authorization for exactly one `sudo wops server check`.


### Authorized execution attempt — stopped at authority-window review

2026-09-12 01:47 Europe/Warsaw. The operator explicitly authorized exactly one collection within **01:50–02:20 Europe/Warsaw**, with no authority expansion and a stop on authority mismatch. **BLOCKED before execution.** No command confirmation, execution, capture, upload, signing or run was created.

Fresh checkout remains at b60615681ca2090c32760e0951cb5ccc290984fd with only preserved documentation changes. Read-only target hostname remains ip-172-26-9-158, sudo returns UID 0, and the temporary target port 3020 listener remains absent. Current time was before the authorized start. The tunnel was not recreated after the blocker was identified.

The exact committed `ServerCheckStore.authorize()` implementation in `apps/witnessops-app/src/lib/server-check/store.ts` derives start from server receipt time rounded to seconds and end as start plus 30 minutes. The current CLI cannot supply the externally approved fixed window and does not compare the returned authority window to those fixed external bounds before collection. Confirmation after 01:50:00 would mint an end after 02:20:00. Trying to hit the exact server-clock second is not a reliable authority control. No clock manipulation, request override, lower-level capture or product patch was attempted.

This corrects the previous READY statement: connectivity and auth passed, but exact fixed-window enforcement was not established. The operator's explicit no-expansion constraint prevents treating a later-ending generated authority as equivalent merely because collection might finish before 02:20. A separate bounded correction or an explicitly revised authorization model is required before retry; neither is inferred here.

Read-only DB check confirms zero server-check executions and the same two historical Linux runs/source digests. There is no execution ID, new capture digest, proof run, signature, verification result, new report or comparison for this stopped attempt. Product code unchanged; no push, merge or deployment. Real-host end-to-end CLI acceptance remains unproven.

### Listener compatibility investigation — contract decision required

The CLI rejects `tcp://127.0.0.53%lo:53` because it validates the entire address with Node `isIP`. Server request validation instead validates only the portion before `%`, without validating the qualifier. These grammars disagree.

Inspection at accepted producer implementation `fce41c194522e9d08d0683aa786bd4361c5ae0c2`, corroborated by a non-collecting call to the isolated producer's address helpers, establishes an important existing contract: IPv4 interface suffixes are removed before observation/policy matching (`127.0.0.53%lo` becomes `127.0.0.53`; `172.26.9.158%ens5` becomes `172.26.9.158`). Qualified/unqualified IPv4 duplicates are rejected. IPv6 zones remain part of identity and case-sensitive (`fe80::1%eth0`); the input spelling is `tcp://[fe80::1%eth0]:443`. Producer scope grammar is `[A-Za-z0-9_.:-]{1,64}`. No percent decoding occurs.

Consequently, preserving submitted qualifiers in CLI/request serialization is possible, but asserting distinct qualified/unqualified IPv4 identities through the existing collection comparison is not. That assertion would change producer/verifier semantics. Parser implementation is paused pending clarification to retain the accepted IPv4 normalization explicitly or authorize a separate contract change. No product code changed, no fresh scan or full-health run was needed for this investigation, and no collection, upload, signing or target interaction occurred. Real-host acceptance is not PASS.

### Listener contract alignment

The approved resolution retains producer `fce41c1` semantics. A shared CLI/server helper validates base IP, qualifier (`[A-Za-z0-9_.:-]{1,64}`), TCP/UDP and port 1–65535 separately. CLI notation is `tcp://127.0.0.53%lo:53`, `udp://172.26.9.158%ens5:68`, or `tcp://[fe80::1%eth0]:443`. IPv6 alone requires brackets in text input; structured authority addresses have no brackets. Single ASCII spaces around comma-separated entries remain allowed; controls and internal whitespace are rejected.

Submitted address spelling, including qualifiers, is preserved through request serialization and stored authority. Matching identity separately strips validated IPv4 qualifiers and canonicalizes numeric IPv6 while retaining IPv6 zone spelling/case. Producer-equivalent duplicates are rejected in both CLI and server. No percent decoding occurs: `%25eth0` denotes the literal zone `25eth0`, not an encoded delimiter; additional percent escapes are invalid. No interface lookup occurs.

Regression coverage checks ordinary/qualified IPv4 and IPv6, exact representation round-trip, duplicate aliases, zone case, malformed syntax and a non-collecting comparison against the accepted producer's normalization helper. The implementation does not change Local Audit, verifier, auth, source custody, persistence schema or listener classifications. Local validation and security review are required before commit; real-host acceptance remains paused. The target CLI acceptance artifact will require a separately authorized refresh including the new shared module before any future real-host run.

Validation completed locally: 28 CLI tests and 13 isolated server-check integration tests passed, including producer parity and exact stored qualifier round-trip. App lint/typecheck and `git diff --check` passed. Node 22 `pnpm health` exited 0 with 1,885 tests passed and zero failures. Fresh security diff scan `fc6a8d17-1403-4927-b6a1-f62f2edc0ea5` completed with zero findings across the five changed source/test files. This resolves the local parser contract blocker only; it does not mark real-host acceptance PASS or refresh the target artifact. Previous collection windows must not be reused.

## Accepted Real-Host Flow

Frozen 2026-09-12; **PASS locally, not production acceptance**. Canonical milestone and merge/deployment gates: [One Server Security Check v1](ONE_SERVER_SECURITY_CHECK_V1_ACCEPTANCE.md). Earlier blocked attempts above remain historical evidence.

Accepted command: `sudo wops server check`. This controlled invocation supplied `--starts-at 2026-09-12T01:10:00Z --ends-at 2026-09-12T01:40:00Z` to enforce the externally approved bounds; it was not an unbounded/default-window invocation.

| Binding | Accepted value |
| --- | --- |
| Operator | Karol Stefanski, Owner in Acme Ltd; `cli:session server_check:create` |
| Existing asset | `be2043fb-7467-4b97-8728-ee2babbeaec3` |
| Pilot / observed hostname | `witnessops-n8n-01` / `ip-172-26-9-158` |
| Execution | `85da2526-7705-44a3-a096-573fcbee379c` |
| Frozen window | `2026-09-12T01:10:00Z` → `2026-09-12T01:40:00Z` (03:10–03:40 Europe/Warsaw) |
| Observed timestamp | `2026-09-12T01:12:21Z` |
| Capture SHA-256 | `14b4756b67a6f446df0c93a29648a0f258a9ece240db2b04f24593a5bacf53aa` |
| Proof run | `pr_lsa_20260912011221_2337407eb5` |
| ZIP SHA-256 | `4da249ce18e8cba160bed8a2676a0081574d043a852d7aed5c43d2d09481b53f` |
| Signature SHA-256 | `b6ec440c11ef5f8e513fbc656140d5e4bdc7682e7f714fb34d8ed0b02acc6549` |
| Signer | `witnessops_local_audit_prod_2026_01` |
| Pinned registry SHA-256 | `4f3ef3b9468a9de3e0a4d3ec573db25bbff86c9c458901931d01e36f4493e939` |
| App run | `5479ee39-70ed-42e4-9347-01f1ccfc40a8` |
| Comparison baseline | `5cbf424f-411a-4b21-8f32-62c012abe7b4` |

Exactly one local read-only capture, one execution and one new immutable Linux run completed. Signing stayed off-host. Producer and independent app verification passed signatures, external pinned trust, signer continuity, manifest/artifact hashes and reconstruction. Capture target/app digests matched; stored ZIP/signature/registry bytes were hashed again during this freeze. Read-only DB inspection confirms one `run_created` execution and three total runs on this asset. The two previous runs retain their original ZIP digests. Machine-id digest continuity is unchanged across all three sources.

Reopen/reverify, the live classification, buyer report and deterministic comparison passed during acceptance. No persisted PDF is claimed. Collection remains partial, synthetic=false: 10/11 coverage items complete; findings 0 critical, 1 high, 2 medium, 1 low, 1 informational. Security classification is unavailable and `security_update_count = null`; 23 pending updates use cached metadata with freshness not assessed.

Comparison selects the exact baseline above. Environment records `tcp/127.0.0.1:3020` added: the temporary loopback acceptance tunnel was a genuine observation, not silently filtered or approved. Coverage has no recorded change; uncertainty retains update gaps. Fifteen expected endpoints remain unchanged, with 18 observed during collection. Both prior Tailscale TCP endpoints remain needs-review. Cleanup removed the temporary tunnel listener. Counter-normalized firewall configuration, socket inventory after cleanup, SSH configuration and service/timer inventories match preflight.

**Boundaries:** valid != server secure; signed != source-system truth; capture is unsigned correspondence. Partial stays partial and null stays unknown. Selected target invariants != whole-host immutability. Root/source honesty is not attested. Reports are derived. Hostname/bind state does not prove public reachability. This was local/test-app acceptance, not production deployment or general distro/self-service acceptance.

Terminal UX was successful, with a clear result URL; manual listener entry and UTC window flags remain operator-assisted friction. No second capture, remediation, product-code change, push, merge or deployment occurred. This freeze only reviews source/evidence and updates documentation.

## Assisted pilot artifact follow-up — 2026-09-20

The versioned private CLI archive and checksum sidecar were built from the current `codex/cli-pilot-artifact` candidate. Offline installation on one disposable Ubuntu lab guest preserved the fixed root-controlled wrapper/runtime layout and passed archive/member checksum and Node-runtime checks. The candidate now exposes bounded `wops --help`, `wops auth --help`, and `wops server check --help` output without starting authentication or collection. This supersedes the earlier help limitation for this candidate only; it does not establish general Linux distribution support.

Separately, two existing Local Audit 1.2.2 signed artifact pairs were imported through the hosted app's normal manual-import flow, in before/after order, onto one dedicated lab asset. The asset retained two saved checks. Findings changed from five to four, and the persisted comparison recorded `unsafeSudoersMetadata: 1 → 0`. Both results remained partial at 10/11 collection coverage with the update-classification gap preserved.

The Local Audit 1.2.2 before artifact incorrectly labels the firewall active. Firewall field differences in the comparison therefore do not establish firewall remediation or a second cleared finding. The supported change is limited to the sudoers metadata finding/count difference.

This follow-up does not exercise the installed CLI's full `server check` journey. No new CLI collection, capture upload, finalization, signed package or app report was created through the installed guest CLI. That journey, including interruption recovery, remains a separate acceptance step with fresh authentication, connectivity, authority-window and signing-custody prerequisites.
