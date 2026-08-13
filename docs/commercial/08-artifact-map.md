# Artifact map — samples and operator files

Complete index of artifacts used for demos, learning, and delivery.  
**Public** = safe on witnessops.com. **Private** = disk only.

---

## Public site samples (`https://witnessops.com/samples/…`)

| Path under `/samples/` | Product / role | Key files |
| --- | --- | --- |
| `offsec-shield-local-server-audit/` | One Server **web fixture** | `RECEIPT.json`, `VERIFY_NOTE.json`, `evidence/*`, `SAMPLE-MANIFEST.json` |
| `offsec-local-audit/` | One Server **full suite sample** | `proofpack-….proofpack`, `local-server-audit-pr_lsa_…/BUYER_WALKTHROUGH.md`, `report.md`, `findings.json`, `receipt.json` |
| `offsec-launch-ready/` | Launch readiness suite sample | proofpack + package dir |
| `offsec-custody-ops/` | Custody suite sample | proofpack + package dir |
| `offsec-incident-ready/` | Incident readiness suite sample | proofpack + package dir |
| `offsec-access-removed/` | Access-removed **method** sample | proofpack + package dir |
| `csr-sprint-synthetic/` | CSR full synthetic package | `exports/`, `evidence/`, `canonical/`, `manifest.json` |
| `offsec-swarm-mesh-trust-round3/` | Legacy mesh sample | (legacy) |

**Note:** Prefer `.proofpack` over `.zip` for downloads (static `.zip` often 404 on this runtime).

---

## Public sample **pages**

| Page | Links to |
| --- | --- |
| `/review/sample-cases/local-server-security-review` | Shield fixture + suite local-audit package |
| `/review/sample-cases/customer-security-review-sprint` | CSR synthetic table + package files |
| `/review/sample-cases/launch-readiness-review` | `/samples/offsec-launch-ready/` |
| `/review/sample-cases/custody-wallet-ops-review` | `/samples/offsec-custody-ops/` |
| `/review/sample-cases/incident-readiness-review` | `/samples/offsec-incident-ready/` |
| `/review/sample-cases/access-removed-proof` | method only |
| `/review/sample-cases/sbom-cisa-2026-minimum-elements` | method only |
| `/review/sample-cases/ai-agent-action-proof-run` | GitHub sample-cases |

---

## Private disk artifacts (operator)

| Absolute path | Role | Public? |
| --- | --- | --- |
| `~/Desktop/WITNESSOPS_OFFSEC_PRODUCT_SUITE_V1/` | Full suite extract (source, samples, hardening) | No (source); samples mirrored selectively |
| `~/Desktop/WITNESSOPS_OFFSEC_PRODUCT_SUITE_V1_6.zip` | Suite archive | No |
| Private live-style report held outside this repo | Operator study of a **valid + partial** outcome | **Never public** |
| `~/Downloads/WITNESSOPS_CUSTOMER_SECURITY_REVIEW_SYNTHETIC_DATA_V1/` | CSR synthetic source (mirrored to site samples) | Source private; mirror public |
| `~/Downloads/WitnessOps_CSR_*` | CSR campaign / one-pager sources | Private |
| `repos/witnessops-web/docs/commercial/` | This kit | Repo (not marketing pages) |

---

## One Server sample families (do not confuse)

| Family | Sample id / run | Use for |
| --- | --- | --- |
| Web fixture | `offsec-shield-local-server-audit` / `local-fixture-a` | `/verify` structural story, light demo |
| Suite product sample | `pr_lsa_20260710120000_198fd7aceb` | Full buyer walkthrough + offline verify story |
| Private live-style | Restricted artifact held outside this repo | Operator learning of **partial** outcomes only |

---

## Quick open commands (local)

```bash
# Suite LSA walkthrough
open ~/Desktop/WITNESSOPS_OFFSEC_PRODUCT_SUITE_V1/products/OFFSEC-LOCAL-AUDIT/sample/local-server-audit-pr_lsa_20260710120000_198fd7aceb/BUYER_WALKTHROUGH.md

# Private partial report: use the restricted operator artifact index

# CSR answer matrix
open ~/Downloads/WITNESSOPS_CUSTOMER_SECURITY_REVIEW_SYNTHETIC_DATA_V1/exports/answer_matrix.csv

# Commercial kit
open ~/WitnessOps/repos/witnessops-web/docs/commercial/README.md
```
