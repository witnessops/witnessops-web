# Scope agreement skeleton (pre-collection / pre-evidence)

Write in email or PDF. Keep short. **Nothing starts until both sides accept.**

For a new agreement, use only the Agent Action Security Review scope below and
the [current commercial index](./README.md). The historical blocks preserve
earlier agreements; they are not new-sales options.

---

## Header

```text
WitnessOps — Scope agreement
Product: Agent Action Security Review
Engagement ref: [id]
Date: [ISO date]
Customer: [legal or trading name]
Decision owner: [name, role, email]
WitnessOps contact: [name, email]
```

External Attack Surface Review, CSR Sprint, One Server Security Check and AI
Agent Tools & Access Review are historical identities for issued agreements,
not alternatives to paste into a new agreement.

---

## 1. Situation (non-secret)

```text
[One paragraph. No secrets, no credentials, no raw evidence.]
```

---

## 2. In scope

### Current: Agent Action Security Review

```text
- Offer identity: agent-action-security-review
- One consequential agent or automation action: [action and agreed boundary]
- Trigger, executing identity, approvals and permission boundary: [named path]
- Available execution evidence and agreed sources: [sources and explicit gaps]
- Operating mode: read, inspect, reconstruct and report
- Deliverables: action map covering authority, execution path, permission boundary
  and evidence chain; findings linked to sources; prioritised recommendations;
  documented unknowns; readout
- Not included: executing the action, remediation, retesting, wider workflow
  programmes, platform installation, production changes, exploitation,
  credential changes, persistence, continuous monitoring or safety certification
```

The distinct historical inventory-plus-action review is not included. This
one-action scope does not require or promise a full device inventory.

### Historical: External Attack Surface Review — existing agreements only

This scope is retained to interpret agreements accepted under the former
two-offer portfolio. Do not select or quote it for a new agreement.

```text
- Service identity: external-exposure-assessment
- Product identity: OFFSEC-EXTERNAL-EXPOSURE (not an offerId)
- One authorised internet-facing system: [system and ownership/authority]
- Signed target/check schedule: [targets, approved checks, window and exclusions]
- Maximum scope: 1 registrable root domain, 10 confirmed first-party hostnames,
  3 customer-attributed public IP addresses and 20 public service endpoints
- Endpoint definition: one confirmed hostname or IP plus protocol and port
- Method: passive discovery where applicable, followed by explicitly approved,
  low-impact unauthenticated DNS, TLS, HTTP(S), service-identification and
  allowlisted exposure checks; manual validation, deduplication and prioritisation
- Deliverables: authority/scope/check/exclusion/stop-condition record; external
  attack-surface map; evidence-backed findings; remediation priorities and
  explicit unknowns; executive report and technical appendix; evidence manifest
  and artifact hashes; signed receipt and offline verifier where the supported
  path is produced
- Handover: one 45-minute session
- Retest: one focused retest of reported findings within 30 calendar days of
  initial report handover; record the handover date and retest window
- Exclusions: those in the external offer record, including no exploitation,
  authenticated testing, credential collection, cloud-account/IAM review,
  private-network testing, open-ended discovery, certification or security guarantee
```

Caps are maximums, not authority to test discovered assets. Check only the signed
schedule; record out-of-scope assets without testing them. Additional or late
retesting remains held and is not offered. This is not a penetration test.

### Historical scope blocks — existing agreements only

The following blocks do not define the current Agent Action review. Preserve the terms
actually accepted under the historical offer identity.

**CSR**

```text
- One questionnaire: [name/type]
- One product/service scope: [name]
- Deliverables: proposed answer matrix, evidence index, qualifications list,
  open-item list, cover note draft for customer approval
```

**One Server**

```text
- One authorised Linux host: [admitted label / hostname as agreed]
- Profile: read-only allowlisted collection [profile name if any]
- Collection window (UTC): [start] – [end]
- Deliverables: posture, findings, report, [proof package if agreed], walkthrough
```

**AI Agent Tools & Access Review (historical option — do not use for a new agreement)**

```text
- Offer identity: agent-tools-access-review (not bounded-workflow-review)
- Agreed device / OS / owner / inspection window: [name]
- Dated system-level application/package or managed-endpoint inventory: [source, observation time, coverage]
- Named agent setup and configuration/state: [source, identity, method]
- Selected MCP/tool connection: [source, capability description, method]
- One consequential action: [proposed or observed; approver, executing identity, downstream system]
- Authority/approval and downstream effective-permission sources: [named records]
- Optional source classes and explicit exclusions: [list]
- Deliverables: source coverage matrix, observed tool/connection map, one action
  reconstruction, prioritized sourced findings, fixed report revision and readout
- Coverage states: observed / not found within source / unavailable-failed / not inspected
```

---

## 3. Out of scope / exclusions

For a new agreement, use the Agent Action scope block above and state the
complete exclusions in the accepted SOW. The earlier examples below are
retained for historical agreements only; they do not replace the current boundary.

```text
[Explicit list. Examples:]
- No penetration test / exploitation
- No compliance certification
- No guarantee of customer acceptance (CSR)
- No host-security or “secure” guarantee (One Server)
- No additional hosts / questionnaires without a new agreement
- No secret collection in fit-check channels
```

---

## 4. Commercial

```text
Price: [match public line or firm quote]
Timing: [match public line or firm date after authority/inputs confirmed]
Payment: [terms]
```

Current paid review, for a new agreement:

- Agent Action Security Review: €2,500 excluding VAT (fixed fee). Inspection and reporting only; no retesting.

Delivery timing agreed in the signed statement of work.

The historical External Attack Surface Review standard price was
€1,900 excluding VAT (fixed fee), with one focused retest of reported findings within
30 calendar days of initial report handover. AI Agent Tools & Access Review,
CSR Sprint and One Server Security Check are also historical. Do not copy any
former quote or handover wording into a new agreement. Existing agreements
keep their signed terms. Record the actual start date and any pause.

---

## 5. Authority and handling

```text
- Customer confirms authority to engage WitnessOps for this scope
- Evidence / collection only after this agreement is accepted
- Handling: [how files move, retention, who may access]
- Material: approved non-secret source material only, through the agreed channel
```

For historical External Attack Surface Review agreements, credential and
secret collection remain excluded at every stage.

The following handling paragraph is historical and applies only to AI Agent
Tools & Access Review agreements; its correction round and retention default do
not become terms of the current review.

For AI Agent Tools & Access Review, name both parties and decision owners,
source owners, operator, approved read-only method, secure transfer channel,
permitted storage, report recipients and handling contact. Customer acceptance
must confirm authority for each named device/source, including third-party
records. Prefer live views; retain raw copies only while needed and delete as
soon as practical, with 30 calendar days after handover as the default maximum.
Record return/deletion and any agreed legal hold or backup limitation. Stop
and re-scope when authority, provenance, privacy, a required source or the
device/action/downstream boundary fails or changes. Include one consolidated
factual-correction round within five working days; further work needs scope.
No access or evidence transfer begins from an initial request alone.

---

## 6. Claim limits

For the current agent review, use the one-action scope above and the
[current commercial index](./README.md): findings and recommendations
from agreed inspection, with explicit unknowns; no execution, remediation,
retesting or security guarantee. For historical External Attack Surface Review
agreements, use the complete exclusions and evidence limits in [its offer
record](./10-public-exposure-review-offer.md).
Package-integrity checks do not prove that a system is secure.

For historical AI Agent Tools & Access Review agreements, use the limits in
`17-ai-agent-tools-access-review-offer.md`: agreed-source observation only,
one action path, manual/read-only work, explicit unavailable and uninspected
states, and no complete discovery or security guarantee. For other historical
products, use the owning contract and approved blurb from that agreement.

---

## 7. Acceptance

```text
Accepted by customer decision owner: _______________  date: ________
Accepted by WitnessOps: _______________  date: ________
```

---

## Operator note

If they “agree in chat,” paste this skeleton back and get an explicit “accepted” with the decision owner’s name. Chat-only handwaves are not enough for live collection.
