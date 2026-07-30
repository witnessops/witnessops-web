# Operator playbook — complete P0 path

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
3. Optional private study: `~/Desktop/witnessops-ops-dev-01-report.html` — see how **partial** is explained when sections are incomplete.  

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
| ops-dev-01 private report | Teaching partial outcomes only — never customer-facing |

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
