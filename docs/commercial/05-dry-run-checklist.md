# Dry-run checklist — current two-offer portfolio

Use this checklist for the current [Agent Action Security Review and External
Attack Surface Review](./18-two-offer-portfolio.md). Rehearse with labelled
synthetic material. A dry run does not authorise customer access or testing.

## Current readiness checks

- [ ] New-sales discovery and request selection identify exactly the two current
  paid reviews. The free hostname check is separate; retired offers and the
  private pilot are not new-sales choices.
- [ ] Agent request identity is `agent-action-security-review`; external product
  identity is `OFFSEC-EXTERNAL-EXPOSURE`. Historical IDs retain their old meaning.
- [ ] Price is €2,500 fixed excluding VAT for the agent review, or €1,900 fixed
  excluding VAT for the external review. Delivery timing is per signed SOW.
- [ ] The [current scope block](./06-scope-agreement-skeleton.md) matches the
  selected review. Scope, authority, handling, required inputs, payment terms
  and capacity are resolved before work; a request alone grants no authority.
- [ ] Agent rehearsal covers one consequential action through read, inspect,
  reconstruct and report: action map, sourced findings, prioritised
  recommendations, documented unknowns and readout. No action execution,
  remediation, retesting or full-device inventory is promised.
- [ ] External rehearsal follows one signed system/target schedule within
  1 root domain / 10 first-party hostnames / 3 public IPs / 20 endpoints,
  using approved low-impact unauthenticated checks and manual validation.
  No exploitation, authenticated testing or pentest claim.
- [ ] External package and limitations match the [offer record](./10-public-exposure-review-offer.md),
  including the 45-minute handover and one focused retest of reported findings
  within 30 calendar days of initial report handover. Additional or late retests
  remain held and are not offered.
- [ ] Samples remain labelled synthetic. Available evidence, missing coverage
  and verification limits are clear; no security or certification guarantee.
- [ ] Record review/date, scope gaps and the next owner before accepting work.

## Historical CSR and One Server rehearsal — not current sales instructions

The checklist below is retained as an earlier operational record. Its catalogue
count, product choices, templates and deployment checks are superseded for new
sales. It does not change existing agreements or authorise any action.

Run this **before** the first real paid package for each product. Use synthetic samples as shape reference, not as customer evidence.

---

## Shared gates (both products)

### G0 — Public surfaces still true

- [ ] https://witnessops.com/catalog shows **6** buyer cards (no SBOM product card)  
- [ ] Methods strip present; no KEV/SBOM product pitch  
- [ ] Sample hub loads: https://witnessops.com/review/sample-cases  
- [ ] Dual deploy smoke last ship: prod + dev 200 (when you last deployed)

### G1 — Commercial discipline

- [ ] Fit check is non-secret only  
- [ ] Scope agreement template ready (price, timing, exclusions, handling, authority)  
- [ ] Claim blurb from `03-claim-blurb.md` ready to paste  
- [ ] Delivery email from `02-delivery-email.md` ready  

### G2 — No overclaim

- [ ] Will not say secure / compliant / audit-ready / guaranteed acceptance  
- [ ] Will not pitch scripts as products  
- [ ] Samples always labelled synthetic  

---

## One Server (`OFFSEC-LOCAL-AUDIT`)

### Public anchors

- [ ] Service: https://witnessops.com/catalog/offsec-local-audit  
- [ ] Sample page: https://witnessops.com/review/sample-cases/local-server-security-review  
- [ ] Web fixture: `/samples/offsec-shield-local-server-audit/RECEIPT.json`  
- [ ] Suite package walkthrough: `/samples/offsec-local-audit/local-server-audit-pr_lsa_20260710120000_198fd7aceb/BUYER_WALKTHROUGH.md`  
- [ ] Suite `report.md` + `findings.json` open  
- [ ] Suite `.proofpack` downloads (200)  

### Operator dry-run (synthetic + private study)

- [ ] Read suite `BUYER_WALKTHROUGH`  
- [ ] Open the restricted private operator report and explain **valid + partial** in your own words (do not publish)
- [ ] Confirm offline verify story without over-promising `/api/verify` for every receipt family  
- [ ] Confirm authority requirements for a **live** run: decision owner, host binding, window, read-only profile, exclusions  
- [ ] Confirm live path never requests secrets in fit check  
- [ ] Confirm delivery will restate: not pentest; valid ≠ secure; partial ≠ “failed security test”  

### Live readiness (when first real host is offered)

- [ ] Written authority / scope on record  
- [ ] Host admitted by name/id agreed in scope  
- [ ] Collection window UTC agreed  
- [ ] Operator-present path understood if required by product  
- [ ] Exclusions explicit (hosts, data classes, actions)  
- [ ] Package assembly path known (report + findings + proofpack where agreed)  
- [ ] Delivery email draft filled for this engagement  

**Pass:** you can explain sample → scope → collection → package → inspect without inventing a new product story.

---

## CSR Sprint

### Public anchors

- [ ] Service: https://witnessops.com/customer-security-review  
- [ ] Sample page: https://witnessops.com/review/sample-cases/customer-security-review-sprint  
- [ ] Synthetic matrix visible; “not customer evidence” banner present  
- [ ] Full package: `/samples/csr-sprint-synthetic/exports/answer_matrix.csv` opens  
- [ ] Evidence stub example: `/samples/csr-sprint-synthetic/evidence/EVD-001_security_overview.md`  
- [ ] One-pager PDF opens if used in sales  

### Operator dry-run (synthetic only)

- [ ] Open answer matrix + evidence inventory and explain status columns  
- [ ] Can explain deliverables: matrix, evidence index, qualifications, open items, cover note  
- [ ] Can explain customer owns final submission  
- [ ] Can explain no inventing evidence / no compliance cert  
- [ ] Fit-check reply B ready  

### Live readiness (when first real questionnaire is offered)

- [ ] One questionnaire + one product scope written  
- [ ] Decision owner + answer approver named  
- [ ] Deadline known  
- [ ] Evidence handling agreed **before** files move  
- [ ] Open-item owner list process defined  
- [ ] Delivery email draft filled  

**Pass:** you can walk CSR sample → scope → package → their approval/submit without promising acceptance.

---

## 30-minute combined dry-run (recommended once)

1. Open catalog → point at CSR + One Server only.  
2. Open One Server sample → open two package files.  
3. Open CSR sample → point at matrix + ownership.  
4. Open fit-check page → state non-secret rule.  
5. Send yourself fit-check template A (test email).  
6. Paste claim blurbs into a draft scope doc.  
7. Stop. Do **not** invent a multi-host or KEV demo.

**Sign-off**

| Role | Name | Date | Product dry-run passed |
| --- | --- | --- | --- |
| Operator | | | CSR / One Server / both |
| Founder | | | CSR / One Server / both |

---

## If something fails

| Failure | Action |
| --- | --- |
| Sample 404 / package unreadable | Fix public assets before any sales call |
| Catalog shows extra product cards | Do not demo until grid matches P0 |
| Tempted to demo tools | Return to methods strip wording |
| Real secrets in fit-check thread | Stop; reset handling; do not store in mail |

---

## After first real delivery

- [ ] Note time-to-package vs public timing promise  
- [ ] Note any claim language that almost overreached  
- [ ] Update this checklist with one lesson only (no new SKUs)  
