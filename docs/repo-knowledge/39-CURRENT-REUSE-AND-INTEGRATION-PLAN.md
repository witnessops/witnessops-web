# One Server Security Check — current integration, slice 1

## Current app authority

`apps/witnessops-app` is the existing authenticated product. Its six prior SQL
migrations, `db/workspaces.ts`, `server.ts`, session revocation, EE source digest,
report adapter and product UI are authoritative. The old app-creation instructions
in recovered documents 29–38 are superseded by this implementation; the correction
in recovered `17-MASTER-HARVEST.md` §18 applies. Do not recreate identity, tenancy
or the run table. No production migration or deployment is part of this slice.

## Local Audit authority and reuse

Local Audit 1.2.2 producer contracts remain `collector.py`, `package.py`,
`verifier.py`, `assessment.py`, `findings.py`, `canonical.py`, `crypto.py` and
`linux-baseline-v1.json`. None is executed or forked here. The existing web
`src/lib/proofpack/verify.mjs` and its contracts/primitives/assessment perform
verification; `pinned-registry.ts` chooses trust. `local-audit-adapter.ts` produces
the existing buyer model; `BuyerReportDocument` and `useBuyerReportPrint` render
and print it unchanged. No new snapshot, verifier, signature, registry or PDF path.

The accepted fixture is the already tracked **production-designated synthetic**
complete ZIP and detached signature in `tests/proofpack/production-fixtures/complete/`,
with basename `proofpack-pr_lsa_20260710120000_198fd7aceb.zip`.
The identically named ordinary test fixture under `tests/proofpack/fixtures/complete/`
is deliberately not trusted by the pinned registry and must be rejected.

## What slice 1 adds

- Migration `0007_linux_checks.sql` extends asset/source discriminators with
  `linux_server` and `local-audit-1.2.2`. EE rows retain their existing JSON
  completion constraint and immutable-run trigger.
- A product-specific `linux_check_sources` child holds exact ZIP, detached signature,
  original signed ZIP filename, exact pinned registry bytes, their digests, verified
  metadata and import verification checks. PostgreSQL `bytea` is the private storage;
  no suitable artifact store existed in the app. There are no public artifact URLs.
- Owner-only same-origin multipart import; current membership and Early Access
  checks run before upload and again inside admission. Foreign workspace/resource
  access is 404; Viewer can reopen but cannot import. The recorded Linux hostname
  must match the chosen asset. P1 admits synthetic sources only.
- At most one package verification per app process; uploads count actual bytes with
  a 30-second read deadline. Existing verifier limits apply (100 MiB ZIP, 1 MiB
  signature, 200 entries, 25 MiB per entry). Workspace custody is capped at 200 MiB
  and shares the existing 32-run capacity. No collector path accepts Linux assets.
- Minimal asset selector, import form and saved run/report dispatch. Linux history
  is separate from EE projections/comparison. Feedback eligibility compares source
  families so a Linux import cannot consume EE's first-run eligibility.

## Source / derived boundary

The original signed ZIP, detached signature and selected trust context are source.
The run's source digest is SHA-256 of exact ZIP bytes, never EE canonical JSON.
Import verification context and metadata are derived; original ZIP members are not
expanded into database rows. Source/context cannot be updated or deleted, and a
completed Linux row requires its child source. Admission is one transaction.

Reopen reads stored bytes, checks their digests, verifies using the recorded pinned
registry context and rebuilds the buyer model. It never recollects or substitutes a
projection. Original downloads repeat the same authorization and verification and
preserve the signed filename. PDF is a derived reading aid, not signed source.

## Trust and claim boundary

No caller-supplied registry or package `public_key.json` becomes a trust anchor.
The stored registry digest must still match the application pin on reopen; a future
registry rotation therefore requires an explicit historical-trust policy, not a
fallback. No wildcard or alternate registry is accepted.

`valid` means the unchanged Local Audit package verification and reconstruction
passed. It does not establish source-system honesty, owner authorization, a secure
or uncompromised server, complete assessment, or compliance. Synthetic status and
collection gaps remain visible in the existing buyer report.

## Validation and remaining work

The local PostgreSQL/API tests cover admission/rejection, current Owner/Viewer/
foreign/revoked authorization, immutable byte custody, original downloads, no EE
execution, and reopen using a fresh pool. Browser tests use the real verifier/model
with mocked API transport to exercise desktop/mobile import/report/navigation;
they are not production authentication or database browser acceptance.

Slice 2 is **LinuxServerSnapshotV1 and second-run comparison only**, derived from
these preserved originals. No live execution, SSH, scheduler, Watch/Update, cloud,
Windows, billing, EE proofpack, public `/verify` change or deployment is included.

## Slice 2 — derived Linux snapshot and comparison

`src/lib/linux-snapshot.ts` defines the strict `witnessops.linux_server_snapshot.v1`
contract and pure projection. Its exported `LINUX_FIELDS` table is the exact source
map for every scalar: section, structured field path and allowed type. It selects
OS ID/version, kernel, architecture, reboot requirement, failed-unit count, pending
and security update counts, firewall provider/policy/rule counts, effective SSH
settings, account counts, authorized-key/sudoers counts and root-key metadata,
AppArmor/SELinux and five explicitly named sysctls. It never parses a report/PDF.

Other mappings and normalization:

| Projection | Verified-result location | Rule / unknown |
|---|---|---|
| Source identity/digest/version | `proof_run_id`, `verification_inputs.proofpack.sha256`, `verifier_version` | Exact recorded values; product version fixed to accepted 1.2.2 lane |
| Collector version/hash | `report.manifest.collector.version/hash` | Recorded manifest metadata; strip `sha256:` only from a valid hash; otherwise null. Not independent proof of executed code |
| Profile/time/synthetic | `report.scope.profile_id`, `report.posture.observed_at_utc/synthetic` | Exact values; no import/current time injected |
| Hostname/machine ID | `report.posture.target.hostname`, `sections.host_identity.machine_identity` | Exact hostname; machine hash only when status observed and SHA-256 valid, else null |
| Listeners | `sections.listeners.actual_endpoints` | Sorted unique transport/address/port strings; preserve TCP/UDP and recorded address spelling; no DNS or PID lookup |
| Failed services | `sections.services.failed_units` | Sorted unique recorded unit strings; null if missing/unsupported |
| Critical files | `sections.critical_files.files` | Sort by path; retain status/owner/group/mode only; absent metadata null. No file contents or invented hashes |
| Collection | `report.completeness.section_results` plus section status/diagnostic_reason/collector_method | Eleven fixed sections; missing completeness false; missing strings null |
| Updates context | `sections.updates.security_classification/cache_freshness/cache_only` | Exact typed value or null; unavailable classification forces security count null, never zero |

Scalars preserve strings/booleans; counts must be nonnegative integers, otherwise
null. A known cached pending-update count survives a partial APT classification.
Incomplete sections are not used to assert host-value changes. Freshness uncertainty
remains separate from update counts. No new source digest exists for this cache.

Migration `0008_linux_snapshots.sql` adds nullable `derived_snapshot` only to the
Linux child. New imports persist it before immutable completion. P1 rows remain
untouched and derive on reopen. Freshly verified package projection always wins;
a cache disagreement is reported, never repaired by rewriting original evidence.

The server selects the nearest earlier completed admitted Linux run by
`(created_at,id)` in the **same workspace and asset UUID**. This is import order,
not an assertion that host observations happened in that order. It never chooses
by hostname or skips an incompatible predecessor. Both sources are reverified.

Comparability requires hostname, known matching machine-id and OS-ID continuity.
Mismatch/missing identity withholds host conclusions. OS version/kernel remain
explicit comparable platform values where identity continuity holds. This does not
prove physical-machine identity. Profile, product/verifier/collector version or
collector-hash changes withhold host deltas and appear under Coverage. Section
method changes suppress that section's host deltas. Partial/unavailable/recovered
collection and unknown fields appear under Uncertainty. New scalar availability
and critical-file metadata surfaces appear under Coverage, never host exposure.

The comparator uses explicit fields and listener/unit sets, not recursive JSON or
LLM diff. No causality, risk increase, reachability, vulnerability or security grade
is inferred. The three lanes appear on the Linux asset and saved check pages.
Single-run BuyerReportDocument and PDF remain unchanged; comparison PDF is deferred.

Next remaining slice: first explicitly authorized real local One Server Security
Check pilot, including deliberate admission of non-synthetic sources (P1's synthetic
restriction remains). No Watch, Update, remote execution or scheduling yet.
