# Worked example — Acme · Customer Security Review Sprint

Fictional. Use as a model when a questionnaire engagement arrives.

---

## 1. Inbound

```text
Name: Jordan Kim
Company: Acme Tools Ltd
Email: jordan@acme-tools.example
Situation: Enterprise buyer sent a security questionnaire. Deal is waiting. We need proposed answers with evidence references for one product: Acme Cloud API.
Preferred product: CSR Sprint
Deadline: 2026-08-12 (buyer portal closes)
```

---

## 2. Fit-check reply (sent)

```text
Subject: CSR Sprint — fit check next steps

Hi Jordan,

From your description, the Customer Security Review Sprint looks like the right shape:

- One questionnaire
- One product scope
- Proposed answers + evidence index + open items + cover note for *your* approval
- You own final answers and submission

Commercial line (public): From €1,600 after a non-secret fit check.
Timing (public): about three working days after scope, owners, inputs, and evidence access are confirmed.

To move to a scope agreement, send only non-secret:

1. Questionnaire type / source (e.g. customer portal, PDF name — no login)
2. Product / service name in scope
3. Decision owner and who will approve answers
4. Deadline the customer set
5. Whether evidence already exists in-house (yes/no — not the files yet)

What we will not do: invent evidence, certify compliance, or guarantee the customer accepts the package.

Sample package shape (synthetic, not your deal):
https://witnessops.com/review/sample-cases/customer-security-review-sprint

Service page:
https://witnessops.com/customer-security-review

If that matches, we will send a short scope agreement (price, timing, exclusions, handling) before any evidence is transferred.

— Karol
WitnessOps
```

---

## 3. Their non-secret answers

```text
1. PDF "Acme_Vendor_Security_2026.pdf" from buyer procurement (no portal login shared)
2. Product: Acme Cloud API (hosted production only)
3. Decision owner: Jordan Kim (Head of Security). Final approver: Alex Rivera (CTO)
4. Deadline: 2026-08-12
5. Evidence exists in-house: yes (policies and architecture notes) — files after scope
```

---

## 4. Scope agreement (accepted)

```text
WitnessOps — Scope agreement
Product: Customer Security Review Sprint
Engagement ref: WO-2026-CSR-0017
Date: 2026-07-30
Customer: Acme Tools Ltd
Decision owner: Jordan Kim, Head of Security, jordan@acme-tools.example
WitnessOps contact: Karol Stefanski, ks@witnessops.com

1. Situation (non-secret)
Enterprise buyer questionnaire is blocking a commercial deal for Acme Cloud API.
Acme needs a proposed answer package for approval and their own submission.

2. In scope
- One questionnaire: Acme_Vendor_Security_2026.pdf (buyer vendor security questionnaire)
- One product/service scope: Acme Cloud API (hosted production)
- Deliverables: proposed answer matrix, evidence index, qualifications list,
  open-item list, cover note draft for internal approver / customer

3. Out of scope / exclusions
- No inventing evidence
- No compliance certification
- No guarantee of buyer acceptance
- No second product line or on-prem variant
- No WitnessOps submission to the buyer on Acme’s behalf
- No secret collection in fit-check channels

4. Commercial
Price: €1,600 after non-secret fit check (this engagement)
Timing: approximately three working days after scope, owners, required inputs and evidence access are confirmed
Payment: invoice on delivery, Net 14

5. Authority and handling
- Customer confirms authority to engage WitnessOps for this questionnaire and product
- Evidence transferred only after this agreement is accepted, via [agreed channel]
- Handling: package to Jordan + Alex; retention 90 days unless extended
- Secrets: never in fit-check mail

6. Claim limits
This engagement produces a response package for one questionnaire and one product
scope: proposed answers, evidence references, qualifications, open items, and a
cover note for the customer’s approval.

The customer owns final answers, approvals, and submission. WitnessOps does not
certify compliance, invent evidence, or guarantee that a customer, auditor, or
procurement team will accept the package.

7. Acceptance
Accepted by customer decision owner: Jordan Kim  date: 2026-07-31
Accepted by WitnessOps: Karol Stefanski  date: 2026-07-31
```

---

## 5. Delivery email

```text
Subject: CSR Sprint package — Acme Cloud API / buyer questionnaire — for your approval

Hi Jordan,

Attached / linked is the Customer Security Review Sprint package for:

- Questionnaire: Acme_Vendor_Security_2026.pdf
- Product scope: Acme Cloud API
- Engagement ref: WO-2026-CSR-0017

What you receive:
- Proposed answer matrix
- Evidence index
- Qualifications / unsupported-claim list
- Open items with owners
- Cover note for internal approver / customer (draft)

What you must still do:
- Review every proposed answer
- Resolve open items or accept residual risk
- Approve final wording with Alex
- Submit to the buyer yourselves

WitnessOps does not certify compliance and does not guarantee acceptance by the customer, auditor, or procurement team. We do not invent evidence.

One-liner: Proposed answers for one questionnaire — you own submission; not a compliance certificate.

Service: https://witnessops.com/customer-security-review
Synthetic sample (shape only): https://witnessops.com/review/sample-cases/customer-security-review-sprint

Please confirm receipt and name the internal approver if it is not you.

— Karol
WitnessOps
```

---

## 6. Shape reference (live synthetic)

Study before authoring a real package:

- https://witnessops.com/samples/csr-sprint-synthetic/exports/answer_matrix.csv  
- https://witnessops.com/samples/csr-sprint-synthetic/exports/evidence_index.csv  
- https://witnessops.com/samples/csr-sprint-synthetic/canonical/questionnaire.json  
