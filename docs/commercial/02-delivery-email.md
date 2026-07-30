# Delivery email templates

Send only after scope agreement and package assembly. Attach or link **only** agreed deliverables. Re-state claim limits.

---

## A. CSR Sprint — package delivery

```text
Subject: CSR Sprint package — [Customer / questionnaire short name] — for your approval

Hi [Name],

Attached / linked is the Customer Security Review Sprint package for:

- Questionnaire: [name or type]
- Product scope: [product]
- Engagement ref: [id]

What you receive:
- Proposed answer matrix
- Evidence index
- Qualifications / unsupported-claim list
- Open items with owners
- Cover note for internal approver / customer (draft)

What you must still do:
- Review every proposed answer
- Resolve open items or accept residual risk
- Approve final wording
- Submit to the customer yourselves

WitnessOps does not certify compliance and does not guarantee acceptance by the customer, auditor, or procurement team. We do not invent evidence.

Claim blurb (keep with the package):
[paste from 03-claim-blurb.md — CSR]

Service reference: https://witnessops.com/customer-security-review
Synthetic sample (shape only): https://witnessops.com/review/sample-cases/customer-security-review-sprint

Please confirm receipt and name the internal approver if it is not you.

— [Your name]
WitnessOps
```

---

## B. One Server — package delivery

```text
Subject: One Server Security Check package — [host label] — ready to inspect

Hi [Name],

Attached / linked is the One Server Security Check package for:

- Host label (admitted): [name or opaque id — no secrets]
- Collection window: [UTC range]
- Engagement ref / run id: [id]

What you receive:
- Posture and findings for agreed read-only checks
- Report with named limits and unresolved items
- Evidence references / manifest
- Signed proof package where agreed
- Buyer walkthrough for offline inspection

How to inspect:
1. Read the buyer walkthrough first
2. Open report and findings
3. Check exclusions and incomplete sections
4. If a verifier path is named, use the offline product verifier with a trust registry obtained separately from the package
5. Public /verify is only for supported receipt types named in the package — do not invent a verifier

Important:
- status valid (if present) means named integrity/structure checks passed
- It does not mean the host is secure, uncompromised, or compliant
- This was not a penetration test

Claim blurb (keep with the package):
[paste from 03-claim-blurb.md — One Server]

Service: https://witnessops.com/catalog/offsec-local-audit
Synthetic sample (shape only): https://witnessops.com/review/sample-cases/local-server-security-review

Please confirm receipt and whether you want a short walkthrough call.

— [Your name]
WitnessOps
```

---

## C. Short handover note (chat / Slack)

```text
Package delivered for [CSR / One Server] — [ref].
You own approval/submission (CSR) or inspection next steps (One Server).
Limits: no compliance cert; no “secure host” guarantee; secrets never in fit-check threads.
Walkthrough: [link or attach BUYER_WALKTHROUGH]
Confirm receipt when you have it.
```

---

## Operator checklist before send

- [ ] Scope agreement signed / written acceptance on record  
- [ ] Deliverables match scope (nothing extra that overclaims)  
- [ ] Claim blurb included  
- [ ] No secrets in email body or accidental CC  
- [ ] Synthetic sample links not presented as their result  
- [ ] Engagement ref matches internal ledger  
