# Operator playbook — current two-offer delivery path

Start with the [current portfolio](./18-two-offer-portfolio.md), the matching
[scope agreement block](./06-scope-agreement-skeleton.md), and the
[external offer record](./10-public-exposure-review-offer.md) when applicable.
The historical playbooks below are not current new-sales instructions.

## Current lifecycle

| Stage | Required outcome |
| --- | --- |
| Enquiry | Non-secret description of one consequential agent action or one internet-facing system, decision owner and intended deadline. No evidence or credentials requested in the fit check. |
| Fit | Select `agent-action-security-review` or external product `OFFSEC-EXTERNAL-EXPOSURE`; confirm that the bounded review fits the need. Do not reinterpret a historical request or offer the private pilot. |
| Agreement | Confirm selected scope, exclusions, authority, handling, inputs, payment terms and capacity. Agent: €2,500 excl. VAT. External: €1,900 excl. VAT. Delivery timing agreed in the signed statement of work. |
| Work | Agent: read, inspect, reconstruct and report one action. External: approved low-impact unauthenticated checks and manual validation within the signed target schedule and caps. Stop and re-scope when the authorised boundary no longer holds. |
| Package | Match the selected offer's deliverables, link findings to evidence, prioritise recommendations and state unknowns. Do not promise execution, remediation, certification or complete security. |
| Handover | Agent: action map, sourced findings, prioritised recommendations, documented unknowns and readout. External: package from the offer record and one focused retest of reported findings. |
| Follow-up | External only: one focused retest of reported findings within 30 calendar days of initial report handover; record that date and the agreed retest window. No agent retest or additional/late external retest is offered. |

For external work, the maximum scope is one system, 1 registrable root domain,
10 confirmed first-party hostnames, 3 customer-attributed public IP addresses
and 20 public service endpoints. An endpoint is a confirmed hostname or IP plus
protocol and port. Caps are not testing authority; the signed schedule controls.
No exploitation or authenticated testing is included. This is not a penetration test.

## Current operator checks

- [ ] The selected review, identifiers and accepted terms agree; the public
  new-sales choice contains exactly two reviews, with the free check separate.
- [ ] Initial enquiry, scope acceptance, payment and permission to work remain
  separate; collection or testing starts only after the applicable gates.
- [ ] The package matches the agreed scope, preserves evidence limits and
  labels samples as synthetic. Historical templates are not sent as current terms.
- [ ] Handover and any included external retest are recorded against the
  accepted agreement. Existing historical agreements keep their original terms.

## Historical complete P0 path — CSR and One Server only

The following earlier playbooks, sales routes, six-card check and deployment
references are retained for historical context. They are superseded for current
new sales and do not authorise work, publication or a change to issued terms.

End-to-end steps for **CSR** and **One Server**. Use with the learning guide (`00`) and templates (`01`–`06`).

---

## Shared lifecycle

```text
INBOUND → FIT CHECK → SCOPE → WORK → PACKAGE → DELIVER → FOLLOW-UP
```

| Stage | Exit criteria | Template |
| --- | --- | --- |
| Inbound | Non-secret description exists | Fit-check A |
| Fit check | Product chosen or not-a-fit | Fit-check B/C/D |
| Scope | Written acceptance of price, timing, exclusions, authority | Scope skeleton `06` + claim blurb `03` |
| Work | Evidence handling agreed; work only inside scope | Product runbook / suite source |
| Package | Deliverables match scope; limits written | Claim blurb |
| Deliver | Email sent; receipt confirmed | Delivery `02` |
| Follow-up | Open items owned or closed | Short chat note |

**Hard stop:** no collection, no questionnaire evidence intake, no secrets until scope is accepted.

---

## Playbook A — One Server Security Check

### A1. Fit check

1. Receive `/review/request` or email.  
2. Reply with fit-check template **C** (`01-fit-check-reply.md`).  
3. Confirm: one host class, goal, decision owner, window, exclusions.  

### A2. Scope

1. Fill scope skeleton (`06`) — product One Server.  
2. Paste One Server claim blurb (`03`).  
3. Get explicit acceptance from decision owner.  
4. Record engagement ref.  

### A3. Prepare collection (after scope)

1. Re-read product boundary: read-only, `linux_baseline_v1` (or admitted profile), no secrets in mail.  
2. Study synthetic package before live run:  
   - Site: https://witnessops.com/samples/offsec-local-audit/local-server-audit-pr_lsa_20260710120000_198fd7aceb/BUYER_WALKTHROUGH.md  
   - Site report: …/report.md  
   - Web fixture receipt (different sample family): https://witnessops.com/samples/offsec-shield-local-server-audit/RECEIPT.json  
3. Optional private study: use the restricted operator report held outside this repo to see how **partial** is explained when sections are incomplete.

### A4. Collection and package

1. Operator-present local read-only path per product source (suite: `products/OFFSEC-LOCAL-AUDIT/source`).  
2. Assemble: posture, findings, report, evidence manifest, receipt, proofpack when in scope.  
3. Self-check against claim blurb before send.  

### A5. Deliver

1. Use delivery email **B** (`02`).  
2. Include walkthrough path and inspection order.  
3. State: valid ≠ secure; outcome pass/partial is collection completeness.  
4. Confirm receipt.  

### A6. Demo path (sales)

1. Catalog → One Server service → local-server sample page.  
2. Open suite package files under `/samples/offsec-local-audit/…`.  
3. Fit check page.  
4. See `04-demo-script-15min.md`.  

---

## Playbook B — CSR Sprint

### B1. Fit check

1. Reply with fit-check template **B**.  
2. Confirm: one questionnaire, one product, owner, deadline.  

### B2. Scope

1. Scope skeleton — product CSR.  
2. Claim blurb CSR.  
3. Written acceptance.  

### B3. Evidence handling (after scope)

1. Only then accept evidence / questionnaire material via agreed channel.  
2. Study synthetic full package:  
   - https://witnessops.com/samples/csr-sprint-synthetic/README.md  
   - exports/answer_matrix.csv  
   - evidence/*  
   - canonical/questionnaire.json  

### B4. Author package

1. Map evidence → answers; separate supported / qualified / open / unsupported.  
2. Never invent evidence.  
3. Cover note for *their* approver.  

### B5. Deliver

1. Delivery email **A**.  
2. They own final submit.  
3. Confirm receipt + internal approver.  

### B6. Demo path (sales)

1. CSR service → CSR sample page → open synthetic exports if technical buyer.  
2. Fit check.  

---

## Verification language cheat sheet

| Phrase | Use |
| --- | --- |
| Structural `/verify` on local-server **web fixture** | When showing `offsec-shield-local-server-audit` RECEIPT family |
| Offline `witnessops-local-audit verify` | Full suite proofpack path |
| CSR package | No “security verified” claim — supportable answers only |
| Restricted private report | Teaching partial outcomes only — never customer-facing |

---

## Daily operator checklist

- [ ] Inbox: any fit checks unanswered >24h?  
- [ ] Any engagement past scope without package?  
- [ ] Any email that almost requested secrets?  
- [ ] Catalog still 6 cards?  
- [ ] Last dual deploy smoke OK if you shipped code?  

---

## Escalation

| Situation | Action |
| --- | --- |
| Multi-host ask | Do not stretch One Server; hold pilot or re-scope |
| Live IR / breach | Out of scope for Incident Readiness product as sold; do not improvise |
| Customer wants “certification” | Decline; use claim blurb |
| Secrets already sent | Do not process in fit-check thread; reset channel after scope |
