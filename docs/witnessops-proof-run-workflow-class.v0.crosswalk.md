# WitnessOps Proof Run Workflow Class v0 — Public Docs Crosswalk

**Status:** Draft v0 crosswalk  
**Repository:** `witnessops/witnessops-web`  
**Purpose:** Map the internal `witnessops-proof-run-workflow-class.v0` operating model to the current public documentation and artifact vocabulary in this repository.

This document is an internal alignment artifact. It does not introduce a new public proof claim, receipt schema, verifier result, or runtime behavior.

## 1. Boundary of this repo

`witnessops-web` is the public web and verification surface. It is not the control plane and does not issue, sign, or store customer proof bundles.

Current repo-level boundary, as stated in `README.md`:

- shows the public WitnessOps pages
- exposes `/verify` and `/api/verify` for receipt-first verification
- returns deterministic verification results for the same receipt input
- does not issue or sign receipts or proof bundles
- does not run customer workflows
- does not store customer data as part of normal verification

Decision: keep `witnessops-proof-run-workflow-class.v0` as an operating-class crosswalk in this repo, not as a claim that this repo performs proof runs.

## 2. Crosswalk table

| `witnessops-proof-run-workflow-class.v0` concept | Existing public docs page | Current public artifact name / vocabulary | Gap or mismatch | Decision |
|---|---|---|---|---|
| Proof run | `/docs/getting-started`, `/docs/how-it-works`, `/docs/security-systems/governed-execution` | `governed run`, `governed operation`, `governed action`, `governed step` | Internal language says `proof run`; public docs mostly say `governed run` or `governed operation`. | Keep `proof run` as internal workflow-class term. Public docs should continue using `governed run` / `governed operation` unless a new operator-facing page is intentionally added. |
| Scope contract | `/docs/getting-started`, `/docs/governance/authorization-model`, `/docs/operations/runbooks` | `authorized target scope`, `runbook`, `scope`, `policy`, `approval requirements`, `target boundary` | Internal draft used a possible `scope_contract.json`; public docs do not expose that as a required artifact. | Treat `scope contract` as a logical internal artifact. Public equivalent is runbook + authorization context + target boundary. Do not introduce `scope_contract.json` into public docs unless implementation emits it. |
| Authority review | `/docs/governance/authorization-model`, `/docs/security-systems/governed-execution`, `/docs/security-systems/threat-model` | `authorization record`, `operator`, `approver`, `system`, `approval or denial timestamp`, `gate evaluation outcomes` | Internal draft used `authority_review.json`; public docs define required authorization record fields but not a standalone artifact name. | Keep `authority_review.json` as optional/internal v0 artifact name. Public docs should continue saying authorization record / gate outcome until runtime emits a canonical file. |
| Runbook selection | `/docs/operations/runbooks` | `runbook ID`, `version`, `classification`, `owner`, `scope`, `steps`, `gates`, `evidence contract` | Strong alignment. Public docs already define runbooks as operational contracts. | Use runbooks as the public anchor for workflow-class scope and execution shape. |
| Execution lane | `/docs/security-systems/governed-execution`, `/docs/how-it-works` | `execution state`, `governed step`, runtime outcomes: `executed`, `denied`, `paused`, `failed` | Internal draft used `execution_log.md` and outcomes like `executed_as_scoped`; public runtime outcomes are simpler and already documented. | Do not replace public runtime outcomes. Internal proof-run outcomes may be more detailed, but must map back to `executed`, `denied`, `paused`, or `failed` when presented publicly. |
| Evidence lane | `/docs/how-it-works`, `/docs/getting-started`, `/docs/how-it-works/evidence-bundles`, `/docs/security-systems/governed-execution` | `manifest.json`, `MANIFEST.json`, `artifacts/`, referenced evidence artifacts, `state.json`, execution outputs, hashes | Naming mismatch: public docs use both lowercase `manifest.json` for first-run outputs and uppercase `MANIFEST.json` for proof bundles. Internal draft used `evidence_manifest.json`. | Treat `evidence_manifest.json` as internal logical name only. For public bundle vocabulary, prefer `MANIFEST.json`. For first-run docs, preserve existing `manifest.json` until implementation standardizes casing. |
| Evidence manifest fields | `/docs/how-it-works/evidence-bundles`, `/docs/how-it-works/verification` | `MANIFEST.json`, artifact hashes, digest integrity, bundle inventory | Public docs explain role but not a field-level manifest schema on this crosswalk page. | Keep field-level manifest schema out of public docs unless a canonical schema file exists. The workflow class may require stable IDs, paths, hashes, source, collection time, and claim binding internally. |
| Receipt lane | `/docs/evidence/receipts`, `/docs/evidence/receipt-spec`, `/docs/how-it-works` | `receipt.json`, `Receipt v2`, `CLAIM.json`, `CLAIM.dsse.json`, DSSE, RFC 3161, log/checkpoint refs | Internal draft used `proof_run_receipt.json`, which could conflict with existing Receipt v2 vocabulary. | Do not introduce a separate public `proof_run_receipt.json` concept. Internally, a proof-run receipt must resolve to the existing Receipt v2 / `receipt.json` / `CLAIM.json` model. |
| Receipt identity and continuity | `/docs/evidence/receipt-spec`, `/docs/evidence/receipts` | `schema`, `receipt_id`, `ledger.stream`, `ledger.seq`, `prev_hash`, `entry_hash`, `actor`, `intent`, `result`, `proof` | Strong alignment. | Workflow class should reference Receipt v2 instead of defining an incompatible envelope. Any internal envelope must be a profile of Receipt v2. |
| Verification lane | `/docs/how-it-works/verification`, `/docs/evidence/receipt-spec`, `/verify`, `/api/verify` | `valid`, `invalid`, `indeterminate`; receipt-first verification; proof-bundle verification procedure in docs | README says `/verify` currently runs receipt-first v1 mode and public verifier does not accept proof-bundle uploads even though bundle verification is documented. | Workflow class must record `verification_scope`: `receipt_first_public`, `receipt_only`, `receipt_plus_artifact_hashes`, `full_bundle`, or `full_replay`, as applicable. Public copy must not imply bundle upload support until implemented. |
| Verification result artifact | `/docs/how-it-works/verification`, `/docs/evidence/receipt-spec` | verifier result/status, failure vocabulary, deterministic check sequence | Internal draft used `verification_result.json`; public docs define verdict meaning but not a canonical artifact filename. | Keep `verification_result.json` as internal output name for operator runs. Public docs should describe verifier output unless a stable downloadable artifact is exposed. |
| Failure states | `/docs/security-systems/governed-execution`, `/docs/security-systems/threat-model`, `/docs/evidence/receipts`, `/docs/evidence/receipt-spec` | runtime outcomes: `executed`, `denied`, `paused`, `failed`; verifier statuses: `valid`, `invalid`, `indeterminate`; failure codes such as `FAILURE_HASH_MISMATCH`, `FAILURE_SIGNATURE_INVALID` | Internal draft mixed workflow failure states with public runtime/proof failure states. | Keep three separate failure families: runtime outcome, proof verifier result, and workflow-class closure state. Never collapse them into one green/red status. |
| Governance lane | `/docs/security-systems/threat-model`, `/docs/governance/authorization-model`, repo README | execution authority, issuance authority, verification authority; repo does not issue/sign receipts | Public docs define authority domains, but there is no public release-decision artifact. | Keep `release_decision.json` internal. Do not expose it publicly until there is a real release workflow. Public docs may mention release limits only when backed by an artifact. |
| Presentation lane | `/docs`, `/docs/how-it-works/evidence-bundles`, `/review/sample-cases`, `/verify` | docs pages, proof bundle explanation, public verifier, sample cases | Public pages explain and render proof concepts but are not proof sources. | Maintain rule: presentation is not authority. Public pages should link to receipts, bundles, verifier behavior, or sample artifacts when making proof claims. |
| Challenge path | `/docs/security-systems/threat-model`, `/support/support-policy` | preserve original bytes, rerun verification, inspect execution chains, escalate security practices/support | Public docs have dispute handling but no explicit challenge artifact/state machine. | Keep `challenge_record.json`, `reverification_result.json`, `correction_receipt.json`, and `withdrawal_receipt.json` internal v0 concepts. Later public page could be `Challenge a Proof` if there is a real workflow. |
| Release gate | Not centralized; partly in `/docs/security-systems/threat-model`, `/docs/how-it-works/verification`, `/docs/evidence/receipt-spec` | no public release-decision object | Missing central public concept. | Do not add public release-gate page yet. Add internal checklist first. Public release language must remain constrained by verifier scope and artifact availability. |
| Main Proof Operator role | Not public docs; closest: governance/authorization and threat model | no public artifact name | This is company operating model, not public protocol docs. | Keep out of public docs unless publishing an operating model page. Internal governance only for now. |
| Delegated proof team | Not public docs; closest: runbooks, authorization model | `operator`, `approver`, `system` | Public role set is runtime-focused, not proof-enterprise-team focused. | Do not overload current docs. Maintain separate internal team authority matrix. |

## 3. Canonical mapping decisions

### 3.1 Internal logical artifacts vs public artifact names

The workflow class may use logical artifact names internally, but public docs and sample packages must use the artifact vocabulary already documented or actually emitted.

| Internal logical artifact | Public/current equivalent | Decision |
|---|---|---|
| `scope_contract.json` | runbook + authorization context + target boundary | Internal only until emitted. |
| `authority_review.json` | authorization record / gate evaluation outcome | Internal only until emitted. |
| `execution_log.md` | execution state / runtime record / `state.json` | Internal operator artifact. |
| `evidence_manifest.json` | `manifest.json` or `MANIFEST.json` | Prefer existing public names. Do not add third public name. |
| `proof_run_receipt.json` | Receipt v2 / `receipt.json` / `CLAIM.json` / `CLAIM.dsse.json` | Must profile existing receipt model. |
| `verification_result.json` | verifier output: `valid`, `invalid`, `indeterminate` with checks/failure codes | Internal/exported artifact only when implemented. |
| `release_decision.json` | no public equivalent | Internal governance artifact. |
| `challenge_record.json` | threat-model dispute handling path | Internal challenge artifact until public challenge workflow exists. |

### 3.2 Naming rule

Do not let internal operator names create a second public proof vocabulary.

Public vocabulary should stay close to:

- governed run
- runbook
- authorization record
- evidence bundle
- manifest
- receipt
- Receipt v2
- verifier result
- valid / invalid / indeterminate
- threat boundary
- dispute handling

Internal vocabulary may use:

- proof run
- scope contract
- authority review
- release decision
- challenge record
- correction receipt

### 3.3 Verification-scope rule

Every workflow-class release must preserve the exact verification scope.

Allowed scope labels for this repo-level crosswalk:

- `receipt_first_public` — current `/verify` and `/api/verify` behavior
- `receipt_only` — receipt artifact checked without artifact-byte revalidation
- `receipt_plus_artifact_hashes` — receipt plus referenced artifact hashes checked
- `full_bundle` — bundle integrity, signature, timestamp/log material checked where present
- `full_replay` — replayed or revalidated against declared external/runtime conditions

If the public verifier cannot perform a scope, public copy must not imply it can.

## 4. Current gaps to close before public expansion

| Gap | Type | Why it matters | Recommended next action |
|---|---|---|---|
| Manifest naming split: `manifest.json` vs `MANIFEST.json` | Naming / artifact contract | Public docs use lowercase for first-run and uppercase for proof bundles. | Decide whether this distinction is intentional. If intentional, document it. If not, standardize. |
| No public release-decision artifact | Governance | Workflow class needs a release gate, but public docs do not expose one. | Keep internal for now. Do not add public release-gate claims before implementation. |
| No explicit challenge artifact | Challenge | Threat model explains dispute handling, but not receipt-bearing challenge states. | Keep challenge artifacts internal v0. Add public `Challenge a Proof` only when there is an intake/review flow. |
| `proof_run_receipt.json` could conflict with Receipt v2 | Receipt semantics | Two receipt models would weaken buyer/verifier clarity. | Make proof-run receipt a Receipt v2 profile, not a new public primitive. |
| Public verifier is receipt-first while docs describe bundles | Verification scope | Buyer may overread `/verify` as full bundle verification. | Any cross-link to `/verify` should preserve README boundary: receipt-first v1 mode only. |
| Main Proof Operator/team model not represented | Operating model | This belongs to proof enterprise architecture, not public protocol docs. | Keep in internal governance docs, not docs site, unless a deliberate operating-model page is created. |

## 5. Suggested repository placement for the workflow class

Recommended repo-internal placement if the full workflow-class document is added later:

```text
docs/witnessops-proof-run-workflow-class.v0.md
```

Recommended public-doc placement only if later approved:

```text
content/witnessops/docs/operations/proof-run-workflow-class.mdx
```

Do not publish the public page until these are true:

```text
[ ] artifact names match implementation
[ ] receipt profile maps to Receipt v2
[ ] verifier scope labels are implemented or clearly documented as non-runtime
[ ] release gate is backed by an internal artifact
[ ] challenge path exists beyond narrative docs
[ ] public copy does not imply this repo issues or signs receipts
```

## 6. Working decision

For now:

1. Keep the public docs as the buyer/reviewer explanation layer.
2. Keep `witnessops-proof-run-workflow-class.v0` as an internal operator-control artifact.
3. Use this crosswalk to prevent naming drift between internal proof-enterprise architecture and public docs.
4. Do not add new public terms unless they map to emitted artifacts or verified behavior.
5. Treat presentation as a rendered surface, not the proof source.

## 7. Main invariant

```text
No public claim without a matching artifact path.
No artifact path without a declared verification scope.
No verification scope without an implemented or explicitly bounded verifier behavior.
```
