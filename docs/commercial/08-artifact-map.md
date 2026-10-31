# Artifact map — agent examples and retired samples

The current public sample set supports the **Agent Action Security Review**.
Examples are synthetic or explanatory, not customer evidence or complete review
deliveries. This map records repository source state as of 2026-10-31; it does
not establish production deployment.

## Retained public examples

| Page under `/review/sample-cases/` | Role | Public artifacts |
| --- | --- | --- |
| `ai-agent-action-proof-run` | Historical synthetic compromised-key rotation specimen | `/samples/api-key-rotation/v1/`; exact specimen bytes, manifest and sample-specific verifier |
| `witnessed-crm-status-change` | Recorded synthetic CRM action and browser replay | `/samples/witnessed-crm-status-change/v1/specimen.json`; generated unsigned demo receipt |
| `privileged-access-grant` | Explanatory approval, identity and permission-boundary example | Narrative only; no complete downloadable package |
| `approval-gated-containment` | Explanatory action gated by approval | Narrative only; no complete downloadable package |

`/review/sample-report` illustrates the report shape for one deployment-approval
action. It is not a live customer report or a claim that a review was performed.

`/samples/governed-agent-verifier-conformance/v1/` remains a technical verifier
fixture used by the skill contract and conformance checks. It is not another paid
review or customer case. `/verify` and `/api/verify` remain receipt-only.

The key-rotation specimen's signed artifacts and verifier are purpose-limited demo
mechanics. They do not add signed receipts, production signing-key custody or
source-system verification to the Agent Action Security Review's deliverables.

## Retired sample pages

These stable paths return 410 in the source revision. Their page implementations
are removed; none is relabelled as an Agent Action Security Review sample.

| Retired path under `/review/sample-cases/` | Historical identity |
| --- | --- |
| `external-exposure-assessment` | External Attack Surface Review; former Public Exposure Review sample |
| `local-server-security-review` | One Server / Local Server Audit sample |
| `customer-security-review-sprint` | Customer Security Review Sprint sample |
| `launch-readiness-review` | Launch readiness sample |
| `custody-wallet-ops-review` | Custody / wallet-ops sample |
| `incident-readiness-review` | Incident readiness sample |
| `access-removed-proof` | Access-removal method sample |
| `sbom-cisa-2026-minimum-elements` | SBOM minimum-elements method sample |

## Removed public downloads

The following folders are removed from `apps/witnessops-web/public/samples/`.
Earlier paths in historical commercial documents identify retired artifacts, not
current download instructions. Their original names and bytes remain in Git
history; manifests and signatures have not been rewritten into new samples.

| Retired folder | Historical artifact identity |
| --- | --- |
| `offsec-external-exposure/` | External Attack Surface Review synthetic worked example |
| `offsec-shield-local-server-audit/` | One Server web fixture; `local-fixture-a` family |
| `offsec-local-audit/` | One Server suite sample; `pr_lsa_20260710120000_198fd7aceb` |
| `offsec-launch-ready/` | Launch readiness suite sample |
| `offsec-custody-ops/` | Custody suite sample |
| `offsec-incident-ready/` | Incident readiness suite sample |
| `offsec-access-removed/` | Access-removal method sample |
| `csr-sprint-synthetic/` | CSR synthetic questionnaire package |
| `offsec-swarm-mesh-trust-round3/` | Legacy mesh export; not accepted by the receipt-only verifier |

The former `/.well-known/mesh-receipt-index.json` demonstration and its duplicate
index fixture are also removed. GET `/api/mesh-gate` reports no published index
and provides no download link. Its POST structural validator and independent
receipt fixture remain for compatibility; they are not Agent Action Security
Review deliverables.

## Retained test fixtures and private evidence

Independent fixtures under `apps/witnessops-web/fixtures/verify/` remain for
receipt-verifier compatibility and rejection coverage. In particular,
`swarm-mesh-export-round3.json` tests rejection of mesh exports; the local-server
and legacy Shield receipt fixtures test their existing structural adapter. They
do not depend on the removed public downloads and are not current offer samples.

Historical commercial records preserve issued-offer names and IDs. Private
operator source packages and restricted live-style reports remain outside this
public repository and are unchanged by this cleanup. Use their owning private
artifact index; public samples do not authorize access to private evidence.
