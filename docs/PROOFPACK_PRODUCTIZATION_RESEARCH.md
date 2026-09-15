# Saved External Exposure proofpack productization research

Research date: 2026-09-11. **Architecture only; no implementation authorization.**

## 1. Executive recommendation

Ship an **unsigned External Exposure evidence package** first: the exact canonical
saved snapshot, minimal export metadata, a frozen derived buyer report model and
human-readable report, claim boundary and SHA-256 file inventory. Use ordinary
`.zip`, not the existing Local Audit `.proofpack` envelope. Do not manufacture a
receipt, signature, trusted signer, verification result or green proof badge.

Reuse the existing snapshot admission/digest, report model, `BuyerReportDocument`
and comparison logic. Keep PDF export on `useBuyerReportPrint`; that hook calls
`window.print()` and does **not** return PDF bytes for a ZIP builder. Therefore a
self-contained report HTML is the proposed minimum readable pack artifact; PDF
remains the existing separate export initially. A PDF inside the pack is optional
only after a safe same-model byte-producing path is separately accepted. Do not
silently accept an arbitrary uploaded PDF or build a second PDF renderer.

Default: current run only, no comparative conclusion without its baseline bytes.
Offer an explicit optional comparison package containing both snapshots and the
existing comparison projection. Do not send either package to current `/verify`.
Signatures later add issuance/authenticity under an independently trusted key,
not proof of security, correct clocks or truthful collection.

### Evidence authority and scope

The inspected app/web feature worktree is `38cde27742db0e8caf20bc26c0af677163095464`.
Current source/contracts/tests outrank prose. Public `/proofpack` was retrieved
via HTTPS and its visible text inspected; `/verify` was also inspected live.
The offsec checkout HEAD is `345bb894ddf438943cf6569e06c791fd560d40cb` and has
unrelated uncommitted helper changes. Treat its documentation and inspected
verifier as local research evidence, **not** proof of latest remote/deployed
behavior. No remote source was promoted or runtime inspected/changed in this task.

The recovered `docs/repo-knowledge` corpus in the operator workspace is secondary.
Its `00-README.md`, `05-AUTHORITY-AND-SUPERSESSION.md` and
`19-LOCAL-AUDIT-PROOFPACK-CONTRACT.md` help separate lanes. Its claim that
`apps/witnessops-app` and persistent External Exposure are absent is obsolete for
this accepted feature branch. Its missing-store proposal must not be implemented
again. Local Audit producer provenance is historical evidence, not authority for
an External Exposure signature or trust profile.

Source shorthand below: **W** = this web repository; **O** = inspected offsec
repository. Exact paths identify reuse authority, not claims of production signing.

## 2. Existing proof infrastructure inventory

| Object / exact path | Status and purpose | Authority / current app use | Reuse and caveat |
| --- | --- | --- | --- |
| Native source receipt — O `automation/schema/receipt-v2.yaml`, `automation/helpers/runbook-receipt.sh` | OFFSEC execution record; hash-based source lane | Native schema authority; not app output | Concepts only. Never relabel a snapshot as OFFSEC execution. Helper checkout has unrelated edits. |
| `state.json` — O `automation/schema/state-v2.yaml` | Runbook execution/approval state | OFFSEC lane; app does not produce it | Do not synthesize state/approval history that never existed. |
| `manifest.json` — O `automation/schema/manifest-v2.yaml`, `automation/helpers/runbook-manifest.sh` | Source artifact inventory | OFFSEC lane; not app export | Hash binding concept; not a drop-in app manifest. |
| `hash-manifest.txt` — O `docs/WITNESSOPS_RECEIPT_BRIDGE_SPEC_V1.md` | Source artifact hash list required by bridge | Source bridge input; absent from app | Do not add alongside another identical file list. |
| Normalized WitnessOps receipt — O `schemas/witnessops-receipt-envelope-v1.schema.json`, bridge spec above | OFFSEC-to-WitnessOps envelope target; bridge doc is specification-only | Different lane from current app and web v0 profile | No receipt required for unsigned V1. Required OFFSEC assertions are unavailable. |
| Signed receipt / detached `.sig` — O `scripts/witnessops_sign_receipt.py`, `docs/WITNESSOPS_RECEIPT_SIGNING_V1.md` | Implemented development Ed25519 path | Dev-only, explicitly no production custody | Algorithm/negative-test reference, not production signing service. |
| `trusted-signers.json` — O `examples/trusted-signers.sample.json` | Sample accepted keys for explicit offline verifier input | Sample, not production authority | Never ship this as a trusted production registry. A pack-supplied key cannot authenticate itself. |
| Offline receipt verifier — O `scripts/witnessops_verify_receipt.py` | Implemented schema/signature/source-hash checks | Inspected code outranks contract's stale “no implementation” status | Requires source state/receipt/manifest; not an ExternalSnapshot verifier. |
| Buyer bundle — O `docs/BUYER_PROOF_BUNDLE_V1.md` | Signed External Exposure Proof Run buyer package contract | Contract, no executed-proof claim | Reuse separation/README/limits, not signed promise or mandatory OFFSEC files. |
| External verification bundle — O `docs/EXTERNAL_VERIFICATION_BUNDLE_V1.md` | Signed receipt + source + verifier handoff | Contract; not authenticated app exporter | `MANIFEST.sha256` and boundary conventions useful; verifier input assumptions differ. |
| `verification-result.json` — O validation/bundle docs | Output from an actual receipt verification invocation | Not independent authority merely because included | Omit in V1. Never prefill expected `valid` as an observed result. |
| Local Audit `verification_result.json` — W `src/lib/proofpack/contracts.mjs` under web app | Reconstructed Local Audit core result, excluded from core manifest, bound by ZIP signature | Implemented Local Audit-only contract | Underscore name and exclusion policy are not interchangeable with OFFSEC hyphenated result. |
| Local Audit receipt/manifest/authority — W `apps/witnessops-web/src/lib/proofpack/contracts.mjs` | Exact signed `witnessops.receipt.v0`, `host_triage_evidence_collection`, Linux authority/profile | Authoritative for `/proofpack`, not app | Do not reuse workflow/authority/claims for public hostname snapshot. |
| `.proofpack` envelope — W `apps/witnessops-web/src/lib/proofpack/bundle.ts` | Strict three-entry STORE envelope: `bundle.json`, `payload.zip`, `payload.sig.json`; Local Audit 1.2.2 only | Implemented parser/verifier, not generic app ZIP builder | Do not reuse envelope branding/schema for unsigned V1. Limits/path/CRC tests are useful design references. |
| ZIP fixture builder — W `tests/proofpack/create-bundle.ts` | Existing deterministic STORE writer plus Local Audit envelope helper; explicitly test/development only | Not a production exporter | Adapt `storeArchive` mechanics with strict admission/size bounds; it intentionally permits hostile fixture entries. Do not directly promote `createBundle` or its product identity. |
| Local Audit verifier — W `apps/witnessops-web/src/lib/proofpack/verify.mjs`, `assessment.mjs`, `primitives.mjs` | Signature, package integrity, authority and posture/findings reconstruction | Browser/fixture parity lane | Not a generic “any bundle” verifier. Do not import its assessment rules. |
| Pinned trust — W `apps/witnessops-web/src/lib/proofpack/pinned-registry.ts`, `trust/local-audit-registry-v1.json` | Independently shipped Local Audit trust snapshot | `/proofpack` uses it, bundle cannot replace it | Distribution model reusable; actual key/purpose is not app issuance authority. |
| Generic receipt/bundle verification — W `packages/proof/src/receipt/verify-receipt.ts`, `verify-bundle.ts` | PV/WV/QV and artifact revalidation using specific receipt/hash contracts | Package API, not same as public route capability | Adapt concepts only; no drop-in ExternalSnapshot input or assurance of arbitrary ZIP safety. |
| Public exposure profile — W `packages/proof/src/receipt/public-exposure-review.ts` | Exact governed review method `external_exposure_assessment` 2.0.0, authority/schedule/manual-validation claims | Legacy public receipt compatibility; not app's bounded snapshot | Do not reuse as-is. Name similarity does not establish semantic compatibility. |
| Public verification — W `apps/witnessops-web/src/lib/verify-adapter.ts`, `public-exposure-review-verify-adapter.ts`, `src/app/api/verify/route.ts` | Receipt-only request validation and bounded verdict | Current public contract | Preserve unchanged. No bundle upload or caller-provided trust. |
| Source snapshot — W `apps/witnessops-web/src/lib/external-exposure/contracts.ts`, `adapter.ts` | `ExternalSnapshotV1`, ten checks, source/network ledger and limits | Current app/public source contract | Direct reuse after validation; preserve exact saved representation. |
| Saved source digest — W `apps/witnessops-app/src/lib/source-digest.ts`, `db/workspaces.ts` | Canonical JSON UTF-8 SHA-256; validates correspondence again on read | Current saved-run authority; not cryptographic issuance | Direct reuse. Not the transient `/check` JSON.stringify digest convention. |
| Buyer report model — W `apps/witnessops-web/src/lib/proofpack/report-model.ts`, `external-exposure/report-model.ts` | Immutable derived model; report schema1.0/template `proofpack-report/1.4` | Current public/app presentation | Reuse; version the export adapter as presentation may evolve. |
| Saved report adapter — W `apps/witnessops-app/src/lib/report-model.ts` | Adds run/asset IDs, method and baseline/change provenance | Current app projection | Adapt privacy/default comparison; current adapter exports internal asset ID. |
| Report/PDF — W `apps/witnessops-web/src/components/proofpack/buyer-report.tsx`, `buyer-report-print.tsx` | Shared human-readable document and browser print portal | Current app and public report | Derived artifact, never source truth; print does not supply a PDF byte buffer. |
| Claim boundary — W external exposure report/contracts; O `CLAIM_BOUNDARY.md` in bundle contracts | Names scope and non-claims | Both relevant in their lanes | Reuse principles and filename, author External Exposure-specific content. |

No universal canonical `manifest.json`, receipt version, signature wrapper or
verification-result filename exists across all these lanes. `packages/proof`'s
bundle verification is not the browser's three-file envelope contract.

## 3. Current `/proofpack` semantics

[Live page](https://witnessops.com/proofpack) is an implemented Local Audit file
opener/report generator, not a general app export landing page. It accepts one
`.proofpack` up to 110 MiB, processes it locally and uses a verifier-pinned Local
Audit registry. Its enclosed payload signature binds the original package, not
the outer envelope. It explicitly limits support to Local Audit 1.2.2 and does
not promise accounts, hosted storage or automatic delivery. The payload includes
signed receipt/authority/source artifacts specific to that product, not the
OFFSEC bridge envelope described in the older buyer-bundle prose.

**No, the first app package cannot inherit this language literally.** Position
it separately as “External Exposure evidence package — unsigned” with “Inspect
the saved source and report; check file consistency. No signer authenticity is
established.” A future page can distinguish **Open signed Local Audit proofpack**
from **Export saved External Exposure evidence in the app**. An app link is
reasonable after V1 exists; no current support or green verification implication.
No public copy change is made by this research.

## 4. Current `/verify` semantics

[Live page](https://witnessops.com/verify) accepts receipt JSON, not proof ZIPs.
The API accepts a JSON request with a `receipt` field (object or parsed JSON
string), bounded to 256 KiB, rejecting duplicate JSON keys and unsupported
companion evidence/trust inputs. Supported adapters are selected explicitly;
R0 artifacts and arbitrary source snapshots are not generic accepted receipts.

A recognized conforming legacy public-exposure receipt is **indeterminate**:
its adapter's production trust policy is draft/non-authorizing, and complete
authority, workflow, manifest and artifact bytes are not independently checked.
Malformed/inconsistent profile claims are **invalid**; unsupported ZIP/source
inputs are request/format failures, not a meaningful unsigned-pack verdict.
The UI presents indeterminate as incomplete. Other supported receipt modes must
be read in their own scope; a `valid` receipt result is not whole-package truth.

An unsigned V1 pack cannot use this surface today. Do not fabricate a signed-shaped
receipt to obtain indeterminate, or change `/verify` to make V1 green. Later app
receipts need a separately reviewed profile and trust support; full package
verification remains a separate mode even then. Merely adding a signature will
not make today's receipt-only endpoint independently reconstruct a report.

OFFSEC verifier semantics differ: inspected code makes missing required files,
missing/invalid signature and unknown/unavailable trust hard failures (`invalid`);
skipped required checks without a hard failure can yield `indeterminate`. Do not
promise that every verifier returns indeterminate for unsigned input.

## 5. Saved-run evidence available today

| Field/object | Export policy | What it establishes / limit |
| --- | --- | --- |
| Validated full source JSON + canonical digest | EXPORT, exact | Correspondence with included representation, not authentic source truth. |
| Target, collection start/finish | EXPORT within source | Recorded public hostname/window; not ownership or trusted time. |
| Method/profile ID/version; ten check IDs/versions/methods | EXPORT | Recorded coverage, not checks that were never implemented. |
| Network ledger, selected addresses, collected evidence | EXPORT within exact source after disclosure review | Bounded public observations; can still contain contact details, URLs or target-sensitive data. |
| Limitations, unknowns, recommendations, source references | EXPORT | Preserve source vs interpretation labels; recommendations are not executed remediation. |
| Saved run ID | EXPORT (opaque reference) | Matches app record by producer assertion; UUID is not authority or permission. Already present in current report. |
| Internal asset UUID | DO NOT EXPORT by default | Current report contains it: requires export-specific omission, not a silent change to saved evidence. |
| Internal user/workspace UUID, email, WorkOS subject | INTERNAL ONLY | Not needed to interpret public evidence; never export raw DB rows. |
| DB initiator, runtime host, credentials, deployment/log metadata | INTERNAL ONLY | Not customer proof material. |
| Baseline ID/digest + comparison | OPTIONAL explicit comparison mode | Reference alone cannot independently reproduce a delta. |
| Buyer report model/HTML | EXPORT REDACTED | Allowlisted presentation/provenance; remove internal asset/workspace/user refs and live workspace links. |
| PDF | OPTIONAL derived export | Current user print output, not canonical source or machine-attested derivation. |
| Telemetry/feedback/payment data | DO NOT EXPORT | Product research, not evidence. |

Run DB `created_at` is not interchangeable with source `finished_at`. The app
Run projection exposes `createdAt`, source timestamps and stored method profile;
not every DB column is currently projected. Include only named fields with their
meaning preserved. Never add a trustworthy-clock claim.

## 6. Recommended unsigned V1

**Proposed new app export profile, not an existing canonical contract:**
`external-exposure-evidence-v1`. Resolve its final schema in the implementation
slice; this research does not register a receipt or modify public contracts.

```text
external-exposure-<run-id>.zip
  README.md
  CLAIM_BOUNDARY.md
  metadata/run.json
  source/external-exposure-snapshot.json
  report/report-model.json
  report/report.html
  MANIFEST.sha256
```

| File | Reason / decision |
| --- | --- |
| README.md | Entry point, unsigned status, check commands, file meanings, privacy warning and no recollection. Necessary; verification instructions here avoid another VERIFY.md. |
| CLAIM_BOUNDARY.md | Reuse established handoff convention, with bounded External Exposure-specific claims. Necessary. |
| metadata/run.json | Small allowlisted app export metadata; not a source/native receipt. Format version, run ID, target, recorded timestamps, stored profile, source path/digest/serialization, report model/template/export-adapter versions and `signature_status: unsigned`. Do not invent authority packet. |
| source JSON | Required primary preserved observation record. Exact `canonicalSource(snapshot)` UTF-8 bytes; no BOM, pretty-print whitespace or added newline. Hash must equal stored source digest. |
| report-model.json | Frozen existing model with export-safe provenance. Makes the interpretation snapshot inspectable and ties report identity/source to metadata; derived, not a second source. Its embedded source appendix must equal included snapshot. |
| report.html | Self-contained escaped static `BuyerReportDocument` output with existing report/print CSS; no remote assets, scripts, trackers or authenticated links. Proposed small adaptation; currently not a turnkey file export. Useful without a new PDF backend. |
| MANIFEST.sha256 | One sorted exact-byte SHA-256 list of every included file except itself. Reuses known filename/hash-list convention, **not** Local Audit's signed manifest-exclusion policy. Reject extra/missing files in acceptance. |

Do not include `state.json`, fake OFFSEC `receipt.json`, `witnessops-receipt.json`,
empty signature, package-supplied “trusted” registry or `verification-result.json`.
No producer verification has occurred just because a JSON file says so. Metadata
is unsigned and not called a receipt. `manifest.json` plus `hash-manifest.txt`
would duplicate this small fixed pack's inventory without a contract benefit.

Questioned `report.pdf`: desirable but not required in initial V1 because browser
print does not provide the bytes. Keep Export PDF adjacent. Never silently omit
an advertised PDF: README and UI must list actual contents. If later included,
freeze it before manifest construction, record exact hash, prove same-model
binding and label render variability. Do not add a second PDF/export implementation.

## 7. Signed V2 path

Use an explicitly approved **saved External Exposure observation** receipt profile,
with schema/canonical signing bytes, required claims, failure rules and verifier
fixtures. Reuse WitnessOps signed-receipt principles/Ed25519 primitives, not the
legacy governed `public_exposure_review` assertions: the current app lacks its
complete authority packet, schedule, manual validation and fixed governed method.

Bind source digest/representation, run identity/window as declared, check/profile
identity, exact package inventory, report model/template/adapter identity and
optional baseline/source/comparison digests. Freeze files before signing; avoid
receipt/manifest self-reference by defining an explicit acyclic signing payload
and detached signature. A receipt that binds only source cannot authenticate an
unbound PDF. Signing the manifest binds bytes, not correctness of derivation.

Signing happens server-side under separately authorized production custody after
membership/read authorization, stored digest validation and export admission.
Never give browser/runtime image/repository a private key. Decide isolated signing
service or restricted key mechanism, signer purpose, rotation/revocation policy,
auditing and recovery before implementing. Do not infer authorization from the
existing Local Audit registry, example keys or an app deployment signature.

Distribute the accepted public trust policy independently of the downloaded pack.
A bundled registry is a convenience copy only; recipient must authenticate it.
Extend a verifier for the new profile and actual artifacts; `/verify` changes
require a separate public-contract lane. Offline full-artifact verification should
precede any broad web badge. Signature/trust checks can then pass for issuance
under that policy; missing required inputs remain indeterminate or invalid under
the selected contract. No timestamping service or source-honesty proof is supplied
by Ed25519 alone. Development signing scripts are not production key custody.

## 8. Claim matrix

“Pass” below names a scoped check, not a global product verdict.

| Claim | Supporting artifact | Unsigned V1 | Signed V2 | Result type / limitation |
| --- | --- | --- | --- | --- |
| Source digest matches included bytes | Source + metadata + SHA-256 | Yes, recompute | Yes | Integrity pass/fail; digest alone unauthenticated. |
| Source JSON corresponds to report | Source digest in report/model + regeneration | Inspect references; deterministic model re-derivation can test | Same, plus signed bindings | Reference equality is weaker than independently re-deriving content. |
| Run saved under stated app identity | metadata/run.json | Producer assertion only | Signed producer assertion | Actual DB event remains unobserved by recipient. |
| Report derived from source | Model/adapter version/source | Recompute using exact adapter if available | Same plus issuance binding | Hashing report and source alone does not prove derivation. |
| Ten checks recorded | Source schema/check ledger | Yes | Yes | Says recorded, not all ten successfully collected or source truthful. |
| Comparison references two runs | Both sources + IDs/digests/profiles + comparison | Yes in optional mode | Yes | Recompute chosen algorithm; relationship is still producer-declared. |
| Files unchanged since packaging | Included file inventory | Only present self-consistency | If signed inventory and independently trusted key | An attacker can replace unsigned files and their hashes together. |
| WitnessOps issued package | Trusted signature binding files | No | Yes under independently trusted key policy | Signature establishes key control/authorized purpose, not every source claim. |
| Signer identity trusted | Independent registry/policy | No | Conditional | Included registry alone insufficient; rotation/revocation policy matters. |
| Run occurred at claimed time | Source timestamps / signed declaration | Recorded assertion | Signed assertion only | No independent clock/time proof. |
| Target secure | None | No | No | Unsupported, never a valid claim. |
| No vulnerabilities existed | None | No | No | Ten checks are bounded observations. |
| Assessment complete | Ledger + limits | Only defined-ledger completeness | Same | Never complete target assessment. |

## 9. Determinism and reproducibility

Choose **B: stable canonical source/metadata/model for a pinned export version,
with explicit presentation/transport variability**, not universal byte-identical
ZIP/PDF. Source SHA-256 must always remain the stored digest for the same run.
Same report model requires the same adapter/template versions and comparison
selection; later copy/templates may legitimately differ without rewriting source.

App canonicalization sorts object keys by UTF-16 code units, preserves array order,
uses JSON string/finite-number encoding and no whitespace. It is named
`witnessops-canonical-json-v1`, not an unexamined RFC8785 implementation. Public
transient snapshots use JSON.stringify representation. Local Audit primitives
sort Unicode code points and restrict numbers to safe integers; OFFSEC Python
canonicalization uses `json.dumps(sort_keys=True,separators=(',',':'))` with default
ASCII escaping. **These algorithms are not interchangeable.** Preserve each
named digest; do not silently recanonicalize a saved source with a receipt helper.

Use fixed ZIP entry ordering, safe relative ASCII filenames, fixed timestamps,
permissions and a pinned writer/compression mode where practical. Hash file bytes,
not ZIP metadata, in MANIFEST. Do not put current `generated_at` into stable source
objects; distinguish observed time from optional export time. A PDF can vary due
to browser, fonts, metadata and pagination. Its exact digest identifies that
rendering only. Byte-identical ZIP can be a later test under fully pinned inputs,
not the first acceptance promise. Sort manifest lines; exclude only manifest self.

## 10. Privacy and minimization

Retain opaque run UUID because it already anchors the saved report and enables
recipient/support references; disclose its linkability and never treat it as an
access token. Omit asset UUID by default: hostname is sufficient. No new persistent
public-ID mapping/table is needed; a package identity can be derived from export
version, source digest and optional baseline digest without claiming unique
issuance. Distinct stored runs with identical source remain distinguished by run ID.

Allowlist metadata/report provenance, never serialize database/user/workspace
objects wholesale. Strip authenticated links and internal paths. No WorkOS data,
user email, workspace identity, telemetry, feedback, credentials or host operational
records. Scan actual source for disclosure risk: public collection does not mean
all headers, contact addresses or URLs are harmless to redistribute.

Do not redact the preserved snapshot and keep its old digest. If disclosure review
blocks exact source export, fail this exact-source pack with an explicit explanation;
a separately authorized redacted derivative needs new bytes/digest and explicit
relation/omission semantics. It cannot replace the original evidence silently.

## 11. Report/evidence relationship

`ExternalSnapshotV1 → externalExposureReportModel → saved/export adapter →
BuyerReportDocument → HTML/browser PDF → manifest → optional future signed receipt`.

The source already includes observation plus interpretation/recommendation fields;
“source” means the preserved collector contract, not raw packets or independent
truth. Reports are derived presentations. `ProofpackReportV1.verification.status`
is currently literally `VERIFIED`, but for External Exposure its label/boundary
means snapshot data admission only and explicitly says unsigned. Do not reuse
that enum as package authenticity. Render the named narrow label and limits.

All ten checks appear in coverage/source; findings selects attention/informational
checks. Do not mistake that smaller findings list for lost Clear checks. Unknowns
and source evidence must survive export. Freeze the export report model so a later
adapter release cannot silently change an already downloaded package.

## 12. Comparison handling

Recommend **D, explicit optional comparison pack containing B (both snapshots)**.
Default current-only export must not copy a comparative claim from an on-screen
report whose baseline is omitted. Its report/metadata states comparison not
included. The UI must make this different export scope visible.

When selected, authorize both runs under the current workspace, require the same
asset/target and an earlier baseline, include `source/baseline-snapshot.json` and
`metadata/comparison.json` with both run IDs/digests/profiles and a versioned
projection of `compareRuns`. Include only the two selected runs, not workspace
history. Preserve environment, coverage and uncertainty arrays separately.

Method/check-version changes are coverage; missing/failed collection is uncertainty.
TLS certificate countdown is excluded by current comparison logic. Baseline missing
or inaccessible fails explicit comparison export; no fallback to an unrelated run
or reference-only “verified comparison”. Both sources make later recomputation
possible without target contact. Size/disclosure limits still apply.

## 13. Recipient verification UX

V1: extract safely → read boundary → inspect report → check listed files with
`sha256sum -c MANIFEST.sha256` (Linux) or `shasum -a 256 -c MANIFEST.sha256`
(macOS) → compare the source checksum with metadata/report digest. These tools
check listed bytes, **not** required-file completeness, unlisted extras, trusted
issuance or derivation. README lists required entries; packaging tests enforce
coverage. Do not advise uploading the private archive to `/verify`.

No bundled executable is necessary for A. Option B adds a small offline checker
for this new profile: strict JSON/paths/counts/size limits, exact inventory,
source canonicalization, schema/check ledger and model relationships. It does not
execute package code or contact targets. Obtain verifier through an independently
controlled release if authenticity matters; a script from an attacker-controlled
pack cannot vouch for itself. A recipient-generated result may use a new explicitly
scoped integrity-check schema, not spoof `witnessops.validation.v1` or Local Audit
`verification_result.json`. No signature means authenticity not established even
when every integrity check passes.

## 14. Failure/gap behavior

| Condition | Required behavior |
| --- | --- |
| Undetermined / CHECK_ERROR checks | Valid complete snapshot may be exported; preserve original status, reason and collection gaps. Never convert to Needs attention or Clear. |
| Report/model generation fails | Fail complete pack creation; retain standalone source download. Do not advertise a complete pack missing its readable report. |
| PDF absent | Normal initial V1 scope, explicitly disclosed. If requested as required later, fail that export variant rather than silently omit. |
| Source missing / invalid / stored digest mismatch | Refuse pack; preserve DB, investigate integrity. Never recollect or manufacture a substitute. |
| Baseline missing/inaccessible | Current-only variant remains possible; explicitly requested comparison export fails. |
| Non-comparable data | Export uncertainty, not “no change”. |
| Method changed | Coverage change and comparison limits, not environmental change. |
| Missing required listed file / manifest mismatch | Integrity failure; no pass for partial hash coverage. |
| Extra file | Reject under new strict pack profile; do not ignore hidden content. |
| Signature missing | Expected V1 unsigned; no issuer/trust claim. Signed V2 missing required signature cannot pass. |
| Trust registry missing/unknown | V1 has no trust claim; V2 cannot establish trusted issuance. Report per verifier's explicit failure rules. |

## 15. Smallest product UX

On a completed saved run/report, use one **Export** group: **PDF**, **Source JSON**,
**Evidence package (ZIP)**, with “Unsigned. Includes saved source and readable
report; no new observation.” Optional “Include comparison with [baseline time]”
only when authorized and available. This is clearer than a new proof-management
screen or an unqualified “Download verified Proofpack” action.

If product naming requires Proofpack, use **Download proofpack (unsigned)** with
the same scope explanation. No badge. Preserve existing export paths. A later
`/proofpack` landing change can link to app evidence export as a separate supported
product, without changing the Local Audit verifier or its trust registry.

## 16. Acceptance test strategy for the next slice

1. Exact canonical source bytes equal saved representation and stored SHA-256;
   Unicode, arrays, finite decimals and non-JSON rejection fixtures prevent
   accidental use of Local Audit/Python canonicalizers.
2. Report identity/digest/source appendix match the authorized run. Re-derive the
   pinned export model and compare; all ten checks, limitations/unknowns survive.
3. HTML uses shared renderer/CSS; escaped hostile evidence, no script/remote assets,
   desktop/mobile and print pagination. PDF, if included, must be tied to the same
   frozen model and manually inspected; no arbitrary file acceptance.
4. Export calls zero runner/public collection endpoints and mutates zero run rows;
   old downloaded pack remains unchanged after rerun and report-template updates.
5. A/B known run/asset/baseline IDs, Viewer permitted reads, revoked access and
   logout replay follow existing server authorization; no cross-workspace export.
6. Required files exactly covered once, sorted safe paths, no self-hash cycle;
   corruption/missing/extra/duplicate/traversal/absolute/symlink/bomb fixtures fail.
7. No internal workspace/user/asset identity, secrets, WorkOS, telemetry or feedback
   in any file, filename, HTML links, report model or metadata. Source disclosure
   refusal never silently redacts or rewrites its digest.
8. Both baseline/current bytes and IDs/digests match chosen comparison; older time,
   same target/asset, method changes, missing checks and uncertainty tested.
9. Unsigned boundary remains explicit; no fabricated receipt/result, production
   registry or conversion of report `VERIFIED` enum into authenticity claim.
10. Public `/check` source/report/PDF and `/verify` input/verdict regressions remain
    unchanged; Local Audit bundle/parity/trust fixtures stay green.

Relevant existing tests: W `apps/witnessops-app/src/lib/report-model.test.ts`,
`model.test.ts`, `db/database.integration.ts`; web `src/lib/proofpack/` tests
(`bundle`, `artifact-binding`, `parity`, `report-model`, `report-model-unassessed`),
`src/components/proofpack/report-print-style.test.ts`, public exposure verify
adapter tests, and `packages/proof/src/receipt/` tests. Check actual package scripts
before execution. This research runs no signing, collection or production tests.

## 17. Reuse map

| Component | Decision | Work needed |
| --- | --- | --- |
| ExternalSnapshotV1 + validation | REUSE DIRECTLY | Existing admission; exact source retained. |
| canonicalSource + stored SHA-256/read checks | REUSE DIRECTLY | Use app representation, not other lane canonicalizer. |
| BuyerReportDocument / shared model / print CSS | REUSE DIRECTLY with small delivery ADAPTATION | Static self-contained HTML wrapper; no second design/render system. |
| useBuyerReportPrint | REUSE DIRECTLY for existing PDF action | Cannot pretend it returns file bytes. |
| savedRunReport | ADAPT | Export-safe metadata, explicit default comparison scope; keep app display unchanged. |
| compareRuns | REUSE logic, ADAPT serialization | Version the algorithm and export both sources for optional comparison. |
| MANIFEST.sha256 | ADAPT convention | Exact profile coverage/self-exclusion; no copied Local Audit exclusions. |
| ZIP writer + metadata admission | ADAPT fixture writer mechanics; NEW SMALL production admission wrapper | `tests/proofpack/create-bundle.ts` has deterministic STORE mechanics but permits hostile fixtures. Enforce fixed entries, bounded size, immutable inputs; do not import the test helper as a trusted production API. Existing bundle.ts is principally a strict reader. |
| Local Audit ZIP/path/ambiguity tests | ADAPT test cases | Avoid changing the frozen Local Audit format or limits globally. |
| Local Audit envelope/verifier/assessment/registry | DO NOT REUSE as an app verifier/trust authority | Product-specific signed contracts. |
| Public-exposure governed receipt profile | DO NOT REUSE as-is | Future dedicated app profile, exact truthful claims. |
| OFFSEC source receipt/state and dev signing scripts | DO NOT REUSE for V1 | Different execution lane; future signing references only. |
| Public /verify | DO NOT REUSE for V1 | Preserve receipt-only interface. |
| Offline integrity checker | NEW SMALL COMPONENT in B only | No signature/issuance claim. |

## 18. Options A/B/C

Planning estimates for one engineer familiar with the code; not measured delivery
commitments. Exclude unrelated product work and external key-custody lead time.

| Option | Effort | Value / honest claim | Risk and prerequisites | Timing |
| --- | --- | --- | --- | --- |
| A: unsigned evidence ZIP + human report + manual hashes | Roughly 3–5 engineering days including fixtures/visual review | Portable saved evidence, inspectable report, manually checkable byte correspondence | Small versioned export schema, privacy adapter, safe writer/static wrapper. Users must understand unsigned integrity is not authenticity. | Recommended first, once cohort demand supports portability. |
| B: A + offline integrity checker | Roughly 2–4 additional days | Required-file completeness/corruption and source relationships reproducibly checked | Parser/archive attack surface, verifier distribution/versioning, explicit integrity-only results; still no trusted issuer. | Next if recipients struggle with manual checks or machine consumption is demonstrated. |
| C: signed receipt/package + supported verification | At least 1–2 engineering weeks, plus policy/custody/distribution work of unknown duration | Trusted-key issuance and signed byte binding; artifact/derivation checks only if actually implemented | New honest app profile, key custody/rotation, independent registry, negative fixtures, separate public verification contract. Does not inherit a green verdict from current /verify. | Later explicit signing phase; not prerequisite to learn from V1. |

## 19. Final recommendation: ten answers

1. Ship A: exact source, minimal metadata, frozen model/readable report, boundary,
   one file-hash inventory; normal ZIP with a new unsigned export profile.
2. Yes, unsigned, prominent and unambiguous.
3. No receipt in V1; metadata is not an OFFSEC or signed WitnessOps receipt.
4. Default current run; optionally include both sources for explicit comparison.
5. No public `/verify` today; its receipt-only semantics remain unchanged.
6. “Evidence package (ZIP)” under Export; if Proofpack naming is mandatory, append
   “(unsigned)”.
7. `/proofpack` should retain Local Audit support and clearly separate/link the
   app's unsigned evidence export once implemented, not imply compatibility now.
8. V2 adds a truthful app receipt profile, signed frozen artifact bindings,
   production key custody and independently distributed trust plus a matching
   verifier. A public adapter is a separate contract change, not automatic.
9. Reuse snapshot validation/digest, report model/document/print path, comparison
   logic, and tested integrity/claim-boundary patterns.
10. Do not reuse Local Audit identity/trust/envelope, governed review assertions,
    OFFSEC source state/receipt, dev keys, release evidence or a prefilled verdict.

## 20. Exact implementation handoff

Before coding, confirm A and its PDF/comparison scope with the operator. Freeze
an explicit app-local export version/required-file contract and limits. Implement
one authorized read-only saved-run export path using the existing server boundary;
load/validate/digest-check immutable sources, allowlist metadata, adapt the shared
report model for privacy, render static report bytes and construct the exact
manifest/archive. Never call `runSnapshot()` or change stored runs.

Default current-only; optional comparison requires both independently authorized
saved runs and the named comparator version. Keep PDF/source buttons and public
surfaces unchanged. No new signing, registry, receipt framework, persistence table,
collector, admin UI or generic archive platform. If safe static report export
requires a materially larger renderer change, stop and narrow scope rather than
introducing another PDF system.

Run section16 tests, relevant app/public report/auth regressions, build/lint/types,
repository health and security diff review against exact candidate bytes before
one bounded implementation commit. Keep signing and public verifier extensions
in later explicitly authorized slices. Implementation acceptance must name tested
checks, not merely display `valid` or assert “proofpack verified”.

### Research validation and limitations

Focused existing contract tests ran under Node22: **87 passed, 0 failed, 0 skipped**
across saved report model, run comparison, public-exposure receipt adapter and
Local Audit bundle tests. This validates inspected contract behavior, not the
proposed pack (which does not exist). Documentation path checks and
`git diff --check` passed. No full build, browser/PDF production acceptance or
security release scan was needed for this research-only change.

This document was checked against the listed source paths, live page text and
current model/digest/receipt contracts. No product code, contracts, source snapshots,
keys, runtime behavior or deployment changed. Older bridge/bundle documents are
specifications and disagree with some newer implementation status labels; the
inspected verifier's behavior is stated explicitly rather than silently resolved.
Remote offsec head/production key custody beyond these inspected sources was not
established. No independent verifier exists for this proposed unsigned app profile
today. No claim of target security or source-system truth follows from this research.
