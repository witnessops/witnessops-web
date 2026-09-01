# WitnessOps web documentation and verifier truth audit

Date: 2026-08-24
Scope: `witnessops-web` public docs, public verification surfaces, repository-local
deployment instructions, and the adjacent canonical verification repositories.
Base web commit: `6953794177e5e071874522c9a76071d26d0930d0`

> **Commercial-positioning update, 2026-09-01:** this audit preserves the product and verifier facts observed on 2026-08-24, including the later 2026-08-26 positioning note below. Neither former primary-offer statement is current commercial authority. Agent Workflow Reconstruction is now the primary paid entry point; Public Exposure Review remains separate secondary catalogue work. See [`commercial/16-agent-workflow-reconstruction-offer.md`](./commercial/16-agent-workflow-reconstruction-offer.md).

> **Historical commercial-positioning update, 2026-08-26:** this audit preserves the product and verifier facts observed on 2026-08-24. Its statement that Public Exposure Review was the primary customer workflow was then superseded by Agent Risk & Control Review as the primary homepage offer. Public Exposure Review remained a separate current catalogue offer.

## Status vocabulary

- **FACT** — directly supported by executable code, schema, test, workflow, or
  current repository instruction.
- **INFERENCE** — a conclusion drawn from multiple facts; verify against the live
  environment before operational reliance.
- **UNKNOWN** — the repositories do not establish the fact.

## Architecture truth

| Component | Classification | Current authority |
| --- | --- | --- |
| Public product at the audit snapshot | FACT | Public Exposure Review was the primary customer workflow on 2026-08-24. The 2026-08-26 commercial-positioning update above supersedes only that homepage priority; the documented verification sequence remains scoped to Public Exposure Review. |
| Receipt schema | FACT | `witnessops-contracts` defines canonical `witnessops.receipt.v0`; Public Exposure Review adds `witnessops.verification_context.v1`. |
| Workflow contract | FACT | `witnessops-workflow-catalog` defines draft acceptance policy `public_exposure_review.production.v1`. It binds product `OFFSEC-EXTERNAL-EXPOSURE`, OffSec runbook `external-exposure-assessment` v2, workflow class `public_exposure_review`, and receipt method `external_exposure_assessment` `2.0.0`, with six exact claims and eight required limitations. |
| OffSec producer adapter | FACT | `witnessops-offsec` performs an offline bounded transformation, stages actual source files, supplies workflow context, and emits deterministic real `offsec_<24hex>` manifest artifact IDs. It does not contact targets, sign, select trust, or verify. |
| Proof engine | FACT | `witnessops-proof-engine` builds and signs the deterministic package only when complete profile input and real manifest IDs are supplied. Production signer custody remains unimplemented. |
| Key policy | FACT | `witnessops-key-registry` defines production acceptance requirements, but the Public Exposure Review policy is `draft`, has no pinned trusted registry revision/hash, and allowlists no production key. |
| Full verifier | FACT | `witnessops-verifier` is the canonical internal package verifier. It uses explicit package and trust inputs and is not a supported public distribution. |
| Web verifier | FACT | `/verify` and `/api/verify` are receipt-only. They reject bundles and caller-supplied evidence, keys, registries, policies, and prior verifier results. |
| Compatibility receipts | FACT | The web retains PV/QV/WV and local-server-audit adapters. They are compatibility surfaces, not alternate canonical Public Exposure Review envelopes. |
| Offline verifier/reference/sample repositories | FACT | These remain experimental, reference, or sample authorities as named in their repository instructions; they do not replace the canonical verifier or schema. |

Adjacent repository heads inspected during this audit:

| Repository | Commit |
| --- | --- |
| `witnessops-workflow-catalog` | `63f0f42` |
| `witnessops-contracts` | `444a2f9` |
| `witnessops-proof-engine` | `14eeb9b` |
| `witnessops-verifier` | `d59dede` |
| `witnessops-offsec` | `d8617d0` |
| `witnessops-key-registry` | `4c5f1cd` |

## Public `/verify` truth

Every currently reachable successful receipt-only route returns `indeterminate`:

- PV/QV/WV receipt-only success is internally `limited-pass`; the web maps it
  to `indeterminate`.
- local-server-audit structural success is `indeterminate` because artifact
  bytes are not checked.
- a conforming Public Exposure Review receipt is `indeterminate` because full
  evidence, workflow, signature, and production trust checks are not performed.

`valid` remains part of the compatible response contract for a future or stronger
adapter that independently completes every check required by its mode. It is not
the current default-example outcome.

The Public Exposure Review web adapter deterministically checks:

- exact receipt envelope and product profile
- result and failure-state structure
- exact claim set and manifest artifact-ID syntax
- subject and declared scope syntax
- exact frozen method definition
- preservation of all required limitations
- UTC chronology
- manifest-digest syntax
- signature-block syntax

It explicitly leaves these checks incomplete:

- request record
- scope authorization and authority records
- complete workflow records
- execution of the declared verification method
- manifest and artifact bytes
- evidence support
- Ed25519 signature cryptography
- production signer authorization and revocation state

Malformed or unsupported input is separate from verifier verdicts. A profile or
binding conflict can be `invalid`. A well-formed value that cannot be checked
without missing evidence or trust stays `indeterminate`; absence of bytes must not
be presented as either a pass or detected tamper.

## Production key-registry acceptance

The draft workflow acceptance and key-trust policies define the correct fail-closed boundary:

1. activate `public_exposure_review.production.v1` and pin the exact key-policy bytes, trusted registry revision, and registry-manifest SHA-256
2. activate `public_exposure_review.production_signing.v1` and require its registry pins to agree with the verifier snapshot
3. explicitly allowlist an active signer using Ed25519, hexadecimal encoding, `production` trust scope, and usage `public_exposure_review_receipt_signing`
4. evaluate `issued_at` on or after `valid_from` and before `valid_until`
5. record the production custody-approval reference
6. require null revocation and apply current-pin/snapshot propagation rules

Caller-supplied policy, registry, or key material is never production trust.
Missing, stale, unavailable, or unconfirmed required trust is `indeterminate`.
A known cryptographic mismatch, revoked or disallowed key, trust-scope/usage
mismatch, or signature outside the accepted window is `invalid` when evaluated.
A rotated key without an applicable historical policy is `unsupported` under
the draft key policy.

## Documentation drift remediated

| Prior drift | Resolution |
| --- | --- |
| Public docs said `limited-pass` became `valid` | Corrected to public `indeterminate`; added a corpus guard. |
| Receipt v2/ledger/DSSE/RFC 3161 model was labelled canonical | Replaced with canonical v0 + profile contract; retained formats are labelled compatibility/design lanes. |
| No Public Exposure Review adapter explanation | Added exact checked/not-checked boundary, manifest IDs, limitations, method, and draft trust policy. |
| Default example copy promised a valid result | EN/PL docs, homepage, library, sample index, smoke markers, and `/verify` now state the indeterminate result. |
| Fixture metadata contradicted route behavior | Corrected LSA and Swarm expectations; added a fixture-to-adapter contract test. |
| Buyer docs duplicated a stale catalogue | Removed the hand-maintained list and pointed to the live catalogue without changing offers, price, or semantics. |
| Evidence bundle docs universalized DSSE/NDJSON layout | Replaced with the current Public Exposure Review package contract and producer/verifier distinction. |
| Historical audits read as current authority | Marked the 2026-07-30 records superseded while preserving their evidence. |

## Deployment documentation truth

Repository-executable deployment authority currently describes private Caddy →
k3s with prod and mesh-dev using one digest-qualified shared image. This audit did
not observe the live cluster, host, Caddy process, DNS, or secrets.

Corrected repository contradictions include:

- active GitHub workflows are artifact-publication surfaces, not retired files
  and not proof of a live deployment
- normal rollback realigns both lanes before pair smoke
- private topology is loaded before scripts that fail closed on missing values
- the production environment example uses the mounted `/data/*` container paths
- the canonical build generates `deploy/Dockerfile.shared`; the checked-in mesh
  Dockerfile is reference/parity material
- `docs:validate` covers public MDX, not repository-local Markdown

## AWS migration boundary

**UNKNOWN:** this repository currently contains no reviewed AWS deployment
architecture or executable AWS authority for the public runtime.

**INFERENCE:** the current k3s repository contract is the baseline to preserve
until an AWS architecture, migration plan, acceptance evidence, and rollback plan
are approved in a separate infrastructure PR.

This audit does not deploy, change secrets, DNS, Stripe, production keys, or cloud
resources. An AWS phase should separately define target services, state and secret
custody, image provenance, network and edge controls, observability, health and
buyer-path smoke, data migration, cutover, and rollback before any apply action.
