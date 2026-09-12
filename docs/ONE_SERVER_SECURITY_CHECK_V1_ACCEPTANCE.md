# One Server Security Check v1 acceptance

Freeze: 2026-09-12. **FROZEN; READY for merge review of the accumulated CLI/server-check changes.** Technically accepted against the local/test app on one real Ubuntu host. Not merged, deployed, publicly distributed or externally customer-validated by this milestone. No merge/deployment authority follows from this document.

## Accepted product flow and commits

`sudo wops server check`: authenticated Owner → explicit local collection authority → unsigned read-only Local Audit capture → authenticated upload → off-host reconstruction/signing → independent verification → exactly one immutable Linux run → report, fresh reopen and deterministic comparison. The controlled acceptance supplied explicit UTC window flags.

| Component | Commit |
| --- | --- |
| Pre-CLI app review base | `a8530d3a4a42bbbd8fca89226c00e768d9238870` |
| CLI auth | `5547af4017b9cfaa28644a34bc8807c8be630631` |
| Server check | `d436e1d4a0b09915d528bee98123dac6f7a0ce60` |
| Explicit-window correction | `eb7fbfce756f851e5cfb7865288cc2a22135b4cb` |
| Listener alignment / reviewed product HEAD | `b7db9f1a65a0ef3a791f9b992dae8d725525c3a3` |
| Accepted producer implementation | `fce41c194522e9d08d0683aa786bd4361c5ae0c2` |

Source review covers the accumulated 43 changed files from the pre-CLI base, including auth, browser consent, local storage, sudo, server-check services, finalizer adapter, shared listener grammar, migrations and their tests. Product/proof format remains Local Audit 1.2.2; no producer/verifier semantics changed. Earlier two-manual-import acceptance remains historical evidence; this milestone adds the authenticated CLI acquisition path.

## Real-host evidence

[Accepted Real-Host Flow](WOPS_SERVER_CHECK_ACCEPTANCE.md#accepted-real-host-flow) is the detailed receipt of identifiers, digests, authority, custody, comparison and selected invariants. It records execution `85da2526-7705-44a3-a096-573fcbee379c`, app run `5479ee39-70ed-42e4-9347-01f1ccfc40a8`, and proof run `pr_lsa_20260912011221_2337407eb5`. Source ZIP SHA-256: `4da249ce18e8cba160bed8a2676a0081574d043a852d7aed5c43d2d09481b53f`.

The fixed window was 01:10–01:40 UTC on 12 September 2026; capture was observed at 01:12:21 UTC. Exactly one new run was added to the existing asset. Read-only database/hash checks during this freeze confirm that run and both historical sources remain intact. Baseline is `5cbf424f-411a-4b21-8f32-62c012abe7b4`; no cross-asset hostname fallback. Machine identity metadata remains continuous.

Collection is partial, synthetic=false. Findings: 0 critical / 1 high / 2 medium / 1 low / 1 informational. Update security classification remains unavailable and count null. Environment comparison honestly includes the temporary loopback tunnel; coverage is unchanged and uncertainty retains update gaps. Report/reopen acceptance is retained evidence from the completed run, not a new collection in this freeze.

## Merge review

| Area | Verdict / source mechanism |
| --- | --- |
| Auth / identity | READY: WorkOS issuer+subject resolves the existing internal user; email is metadata. 256-bit opaque credential stored hashed; one-hour expiry, no refresh token. Current account/cohort/workspace/membership and Owner scope rechecked. Origin checks, explicit browser consent and single-use locked redemption remain. |
| Revocation | READY within current model: CLI logout revokes its credential; originating web-session logout invalidates its CLI grants through the shared revocation table. Provider-only revocation events are not synchronized; this is a known one-hour residual boundary. |
| Sudo / local storage | READY for trusted-root operator use: numeric SUDO_UID plus account database selects the home, not HOME/XDG/SUDO_USER; directory ownership/modes, no-symlink checks and O_NOFOLLOW file checks apply. No root credential fallback/copy. Root-controlled fixed runtime, isolated Python and sanitized subprocess environment; no caller collector path. |
| Authority | READY: request UUID/body is replay-bound; operator/user, workspace, asset, hostname, profile, window and policy are frozen. Trigger prevents later substitutions. Explicit bounds persist through retries and are compared before capture. Producer validates capture timing/classification. |
| Listener contract | READY: shared CLI/server grammar preserves qualifiers in authority. IPv4 matching strips qualifier; IPv6 numeric spelling normalizes and zone remains exact/case-sensitive. Equivalent duplicates rejected. Qualifier grammar `[A-Za-z0-9_.:-]{1,64}`; no percent decoding. `%25eth0` is literal zone `25eth0`, not decoded syntax. Producer unchanged. |
| Capture / upload | READY: product-only 25 MiB bounded body, authenticated before body acceptance; canonical producer validation, exact digest/bytes, execution/user/workspace/asset/hostname/fingerprint binding. Identical retry is idempotent; altered bytes/authority rejected. |
| Finalization / verification | READY for one trusted finalizer custody domain: fixed server configuration invokes existing producer; pinned registry and independent verification precede normal Linux admission. Durable started marker prevents automatic second signing after partial issuance. Invalid finalization/verification throws before accepted run commit. |
| Persistence / recovery | READY within bounded workflow: row/advisory locks, unique request/run linkage and normal Linux import in the same DB transaction. Completed artifacts reverified/reused; accepted run/source immutable. Incomplete output, stale capture lock or missing custody needs operator reconciliation. |

Important qualifications: SUDO_UID is a convention supplied by trusted sudo, not an attestation. Privileged root can deliberately impersonate another local account or steal its files; the implementation does not and cannot claim isolation from root. No current-source review found a confirmed merge-blocking vulnerability, but this is not a replacement for the production release security gate.

## Migrations and recovery

0009 adds login transactions and CLI sessions referencing existing users/workspaces. 0010 adds transaction scopes, replaces the CLI-session scope CHECK, and adds execution custody/uniqueness/triggers. Existing credentials retain `cli:session`; product scope needs new explicit browser consent. No current EE/evidence row is rewritten or table dropped. The DROP is a constraint replacement, not evidence deletion. 0009 must precede 0010; retain the existing checksum-tracked migrator and locking procedure.

Before production: inspect actual migration predecessor (apply missing 0007/0008 first if necessary), verify committed checksums, take a recoverable DB backup, rehearse ordered migration and runtime grants/lock duration, then verify history/schema. No migration is applied by this review. There are no automatic down migrations. Keep additive schema on app rollback; never drop execution/source custody or restore an old backup over newly accepted evidence.

## Security matrix

CLOSED means mitigated in the reviewed application boundary, not impossible under host/admin compromise.

| Threat | Classification | Evidence / residual boundary |
| --- | --- | --- |
| CLI credential theft | KNOWN LIMITATION | Private files, bounded lifetime, no token logs; bearer theft by same user/root remains possible. |
| Sudo user confusion | KNOWN LIMITATION | No accidental root fallback; trusted sudo and root are assumptions, not independently authenticated origin. |
| Session replay | CLOSED | Expiry/revocation checked per use; login redeem one-time. Active bearer reuse is intended. |
| Stale membership | CLOSED | Current centralized membership/account/cohort checks per request. |
| Workspace substitution | CLOSED | Credential-bound workspace; scoped DB queries. |
| Asset substitution | CLOSED | Frozen asset and immutable authority. |
| Hostname substitution | CLOSED | Exact declared/observed binding; dishonest-host identity remains unproven. |
| Listener ambiguity | CLOSED | Shared validated representation/matching contract and producer parity tests. |
| Capture replay | CLOSED | Authority identity and one byte sequence per execution. Fabricated unsigned observations are not attested. |
| Upload tampering | CLOSED | Digest, canonical capture and authority correspondence checks. HTTPS required outside loopback development. |
| Duplicate issuance | CLOSED | Exclusive durable marker plus row locks; one finalizer/shared custody assumption. |
| Signing-key exposure | KNOWN LIMITATION | Off-target, no API access; trusted finalizer process can access configured key and needs production containment. |
| Signer selection | CLOSED | Server-only selection, no request override. |
| Registry substitution | CLOSED | Pinned app registry, preserved bytes, independent trust checks. |
| Invalid verification accepted | CLOSED | Both finalizer verifier and existing Linux admission reject before commit. |
| Partial issuance ambiguity | KNOWN LIMITATION | Fails closed; no automatic re-sign, manual reconciliation required. |
| Source custody mutation | CLOSED | Immutable execution/source triggers and fresh digest/reverification. DB administrator/storage compromise is outside this boundary. |

No unresolved merge BLOCKER identified. Operational limits remain: 32 retained executions/workspace, 200 MiB accepted capture budget, serial cross-process finalization, bounded retries, no automatic stale-execution cleanup. Rejected capture files can consume custody disk and poison that execution's preserved input; resolve manually without silently replacing its source. Monitor/contain custody storage before production. Database and finalizer filesystem recovery must be coordinated.

## Test freshness

No product source changed after the validated listener commit. Fresh `pnpm cli:test`: 28/28. Fresh read-only DB checks: one execution, three expected asset runs, exact capture/ZIP/signature/registry hashes, historical digests and machine continuity. Fresh `git diff --check` and docs validation apply to this documentation commit.

| Retained gate | Recorded result |
| --- | --- |
| Server-check integration at listener HEAD | 13/13, including fixed windows and producer qualifier parity |
| CLI DB / existing DB / live admission | 17/17; 27/27; 1/1 at server-check implementation |
| Browser regressions / CLI browser | 77 cases; 14 focused CLI cases, Chromium/WebKit and mobile |
| App lint/typecheck | PASS at listener HEAD |
| Node 22 full health | 1,885 tests, zero failures at listener HEAD; not rerun for prose-only changes |
| Server-check security diff scan | `c5daa8a1-0da9-478b-a617-192483d8153e`, zero reportable findings |
| Window security diff scan | `2b8f784f-4183-4376-9e7c-26aa6eab08ee`, zero findings |
| Listener security diff scan | `fc6a8d17-1403-4927-b6a1-f62f2edc0ea5`, completed, zero findings |
| Real CLI flow | One capture/issuance/run; independent verification, report, reopen and comparison PASS locally |

These are incremental scan records, not a new whole-branch standard security scan. The prior pre-CLI whole-app scan had a partial-coverage metadata caveat; a clean standard release-gate scan remains required before production. Historical producer emulated installed-wheel testing also had a 50 ms timing-test caveat; do not infer broader runtime/distro support from the accepted Ubuntu pilot.

## UX and distribution

Founder/operator Early Access: acceptable. First external technical user: assisted pilot only, after production gates; not general self-service. P0: none found. P1: no blocker to the assisted accepted flow; unassisted setup/distribution remains incomplete. P2: cumbersome manual listener policy and UTC window arguments, stale-lock/reconciliation guidance. Help commands currently produce bounded usage errors; do not advertise a finished help/installer experience.

Minimum next distribution step: prepare one immutable, versioned, authenticated CLI/runtime artifact with checksums, fixed production HTTPS origin, manual installation/rollback instructions and a clean-host verification rehearsal. Do not build an installer, self-update, daemon or new product architecture in this milestone. No Watch, Update, scheduler, remote runner, fleet, Windows/cloud support or billing is implied. External demand, willingness to pay and buyer acceptance of operator assistance remain unknown.

## Ordered merge / production gates and rollback

1. Confirm producer accepted commit/runtime custody and intended merge target; merge producer first if still pending, then the app branch with its sequential auth/server-check/window/listener commits. Confirm current target-base compatibility and CI at review time. No merge performed or authorized here; public producer publication is not required merely to merge app source.
2. Build the exact merged immutable app image, including the Python adapter and accepted producer runtime integration; standard code-security scan, image/dependency scan and recorded image digest. Rehearse clean start/restart/recovery. Development singletons require process restart after source/schema changes; hot reload is not a deployment method.
3. Verify production DB backup/restore and migration predecessor/checksums; apply only missing approved migrations in order through 0010 in the separately authorized deployment lane. Verify privileges and old credential scopes. Rollback checkpoint A: keep additive schema and all evidence; restore only via coordinated recovery that preserves later records.
4. Validate production WorkOS callback/app origin/CLI authorization URLs, HTTPS CLI base URL, login/consent/status/logout, originating-session revocation, Owner/Viewer/foreign/revoked access. No provider token becomes a CLI credential.
5. Prepare the four server-only finalizer settings, correct process working directory/adapter, accepted isolated producer, pinned registry/key agreement, private durable custody capacity and coordinated backups. Rollback D/E: stop new issuance before reverting configuration; retain markers/artifacts, never delete them to retry signing. Reverting signer configuration must not remove historical public trust needed to verify accepted sources.
6. Promote only the approved image after these gates. Rollback B: restore previous exact image and disable new CLI issuance if required, retaining schema/source custody. Rollback C: withdraw a CLI artifact and revert to the retained version; revoke affected credentials if necessary, retain evidence. No automatic CLI updates.
7. Separately authorize one controlled production smoke: authenticate, explicit authority, no key on target, one capture/run, independent verification, report/reopen/comparison, EE and WorkOS regression checks. Neither this document nor a merge authorizes collection/signing/deployment.
8. Admit the first external technical user with explicit operator assistance and support/recovery expectations. General distribution and wider platform claims wait for separate acceptance.

Product flow accepted; production deployment preparation remains gated. This freeze changes documentation only and performs no target access, collection, upload, signing, run creation, push, merge or deployment.
