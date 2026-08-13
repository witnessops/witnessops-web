# Offer learning guide (read this first)

Plain-language map of what WitnessOps sells, what is only a method, and where every real sample lives on this machine and on the public site.

---

## The mental model (learn this once)

```text
SITUATION (catalog card)
    → non-secret FIT CHECK
    → SCOPE AGREEMENT (authority, price, exclusions)
    → WORK (collection or questionnaire review)
    → PACKAGE (report + evidence + limits)
    → BUYER INSPECTS (walkthrough; offline verify when named)
```

| Word | Means | Does not mean |
| --- | --- | --- |
| **Offer / SKU** | A bounded buyer situation with a handover package | Every script you own |
| **Method** | A tool used inside an engagement when scoped | A catalog product |
| **Sample** | Labelled synthetic package for orientation | Live customer evidence |
| **valid** (verifier) | Named integrity/structure checks passed | Host is secure / compliant |
| **outcome: pass/partial** (One Server) | Collection sections complete or not | Security grade |
| **Proof beats memory** | Recorded, checkable handover | Marketing fluff only |

---

## P0 offers you operate this week

### 1. Customer Security Review Sprint (CSR)

| | |
| --- | --- |
| **Buyer situation** | A security questionnaire is blocking a deal |
| **You deliver** | Proposed answers, evidence index, qualifications, open items, cover note |
| **They own** | Final answers and submission |
| **Price (public)** | From €1,600 after non-secret fit check |
| **Timing (public)** | ~3 working days after scope, owners, inputs, evidence access confirmed |
| **Service page** | https://witnessops.com/customer-security-review |
| **Public sample page** | https://witnessops.com/review/sample-cases/customer-security-review-sprint |
| **Full synthetic package (site)** | https://witnessops.com/samples/csr-sprint-synthetic/ (manifest, evidence, exports) |
| **Full synthetic package (disk)** | `~/Downloads/WITNESSOPS_CUSTOMER_SECURITY_REVIEW_SYNTHETIC_DATA_V1/` |
| **One-pagers** | Site `/assets/one-pagers/csr-sprint-en-a4.pdf` (+ PL) |

**Learning tip:** Open `exports/answer_matrix.csv` and `canonical/questionnaire.json` in the synthetic package — that is the shape of the deliverable, not a real customer.

---

### 2. One Server Security Check (`OFFSEC-LOCAL-AUDIT`)

| | |
| --- | --- |
| **Buyer situation** | Need a clear, read-only picture of **one** authorised Linux host |
| **You deliver** | Posture, findings, report, signed proofpack (when agreed), walkthrough |
| **Price (public)** | €950 standard after non-secret fit check |
| **Timing (public)** | Within 2 business days after authorised collection window |
| **Service page** | https://witnessops.com/catalog/offsec-local-audit |
| **Public sample page** | https://witnessops.com/review/sample-cases/local-server-security-review |
| **Web-oriented fixture (site)** | https://witnessops.com/samples/offsec-shield-local-server-audit/ (`RECEIPT.json`, evidence, VERIFY_NOTE) |
| **Full suite product sample (site)** | https://witnessops.com/samples/offsec-local-audit/ (proofpack + package dir + BUYER_WALKTHROUGH) |
| **Full suite product sample (disk)** | `~/Desktop/WITNESSOPS_OFFSEC_PRODUCT_SUITE_V1/products/OFFSEC-LOCAL-AUDIT/sample/` |
| **Private live-style report (not public)** | Restricted operator artifact held outside this repo; **outcome: partial**, **verifier: valid** |

**Learning tip:** Compare three layers:

1. **Public sample page** — buyer language  
2. **Suite package** `report.md` + `findings.json` + `BUYER_WALKTHROUGH.md` — product shape  
3. **Private live-style report** — how an operator-present run reads when outcome is **partial** (incomplete sections, not “failed security”)

**Never publish** a private live-style report as a public sample (real host name, live collection).

---

## Secondary offers (samples exist; sell only if you will operate)

| Product | Catalog | Sample page | Suite package on site |
| --- | --- | --- | --- |
| Launch readiness | `/catalog/offsec-launch-ready` | `/review/sample-cases/launch-readiness-review` | `/samples/offsec-launch-ready/` |
| Custody / wallet-ops | `/catalog/offsec-custody-ops` | `/review/sample-cases/custody-wallet-ops-review` | `/samples/offsec-custody-ops/` |
| Incident readiness | `/catalog/offsec-incident-ready` | `/review/sample-cases/incident-readiness-review` | `/samples/offsec-incident-ready/` |
| Bounded workflow | `/catalog/workflows` | AI agent sample | (GitHub sample-cases) |

## Methods only (not product cards)

| Method | Where | Role |
| --- | --- | --- |
| Access-removed package | `/review/sample-cases/access-removed-proof` | Method sample |
| SBOM field checklist | `/review/sample-cases/sbom-cisa-2026-minimum-elements` | Method sample |
| KEV / deps scripts | operator tooling (e.g. wops-local-llm) | Not catalog |

---

## Device inventory (operator reference)

| Path | What it is |
| --- | --- |
| `~/Desktop/WITNESSOPS_OFFSEC_PRODUCT_SUITE_V1/` | Full OffSec suite v1.x extract (source + samples + hardening) |
| `~/Desktop/WITNESSOPS_OFFSEC_PRODUCT_SUITE_V1_6.zip` | Canonical suite zip + sha256 |
| Restricted artifact outside this repo | Private One Server style report (partial) |
| `~/Desktop/CAR-OFFER-TEMP/...` | Another suite copy — prefer main Desktop suite |
| `~/Downloads/WITNESSOPS_CUSTOMER_SECURITY_REVIEW_SYNTHETIC_DATA_V1/` | Full CSR synthetic package |
| `~/Downloads/WitnessOps_CSR_Sales_OnePager_*` | CSR sales one-pager sources |
| `repos/witnessops-web/apps/.../public/samples/` | Everything published under https://witnessops.com/samples/… |
| `docs/commercial/` | This kit |

---

## How to study for 45 minutes

1. Read this file (10 min).  
2. Open One Server service + sample page (5 min).  
3. Open suite package files: `report.md`, `findings.json`, `BUYER_WALKTHROUGH.md` (10 min).  
4. Open the restricted private report and note **partial vs valid** language (5 min).
5. Open CSR service + sample + `answer_matrix.csv` (10 min).  
6. Read fit-check reply templates once (5 min).  

Then run dry-run checklist `05-dry-run-checklist.md`.
