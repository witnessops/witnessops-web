# CRA 24/72 Reporting Readiness Proof Run V1

Status: `DRAFT_FOR_FOUNDER_REVIEW`

Commercial base: `WORKFLOW-S` (`from €1,500`, quote after scope)

This is a request shape for an existing WitnessOps workflow package. It is not a new public SKU and does not authorize publication, sale, execution, merge, or deployment.

## Buyer problem

A manufacturer of one product with digital elements needs to know whether its team can assemble, approve, and preserve the evidence required for a CRA early warning within 24 hours and a fuller notification within 72 hours after awareness of a qualifying event.

The European Commission states that CRA reporting obligations apply from 11 September 2026. Manufacturers must submit an early warning within 24 hours of awareness and a full notification within 72 hours for actively exploited vulnerabilities and severe incidents affecting product security.

Primary source:

- European Commission, CRA reporting obligations: https://digital-strategy.ec.europa.eu/en/policies/cra-reporting

## Highest-leverage incomplete element fixed here

The existing Incident Readiness Pack and Workflow L are too broad for a first regulatory-readiness purchase. This contract freezes a smaller buyer-legible boundary that can be sold and repeated without claiming incident response, legal advice, or CRA compliance.

## Fixed proof-run boundary

The proof run covers exactly:

- one named manufacturer or responsible legal entity;
- one named product with digital elements and one buyer-declared product/version boundary;
- one synthetic vulnerability or severe-incident scenario approved by the buyer;
- one internal awareness-to-reporting pathway;
- one remote execution window of up to four hours;
- up to five named participants;
- two simulated checkpoints: `T+24h` and `T+72h`;
- one final evidence package and one review session.

The proof run does not expand to additional products, subsidiaries, reporting regimes, live incidents, or technical remediation.

## Required buyer inputs

The buyer must provide before execution:

1. A named sponsor who can authorize the exercise.
2. A named product owner or security owner.
3. The buyer-declared product and version boundary.
4. The current incident, vulnerability, or escalation procedure used for the selected pathway.
5. The named roles expected to detect, classify, approve, and report.
6. A synthetic scenario approved for use.
7. A non-secret evidence-transfer method agreed during the fit check.
8. Written confirmation that no live incident, customer evidence, credentials, personal data, or restricted product data will be supplied.

Missing mandatory inputs produce `NO_GO_SCOPE_INCOMPLETE`; they do not produce a partial compliance claim.

## Authority model

- **Buyer sponsor:** authorizes the exercise and selected product boundary.
- **Buyer product/security owner:** confirms the operational facts supplied by the buyer.
- **Buyer reporting decision owner:** decides whether the synthetic facts would trigger escalation or reporting.
- **WitnessOps operator:** facilitates the bounded exercise, records evidence and decisions, and packages the result.
- **WitnessOps reviewer:** checks package completeness and internal reference integrity.

WitnessOps does not decide whether the buyer is legally in scope, whether the synthetic event is legally reportable, or whether a real notification should be filed.

## Execution steps

1. **Fit and authority check** — confirm sponsor, product boundary, participants, scenario, exclusions, and evidence channel.
2. **Freeze scenario and clock** — issue a scenario identifier and record `awareness_at` as the start of the simulated reporting clock.
3. **T+24h checkpoint** — record known facts, affected product boundary, evidence references, uncertainty, owner, and proposed early-warning decision.
4. **T+72h checkpoint** — record updated facts, impact assessment, mitigation state, evidence references, uncertainty, owner, and proposed full-notification decision.
5. **Gap classification** — separate missing evidence, missing authority, unclear ownership, unavailable data, and unresolved legal interpretation.
6. **Package assembly** — create the fixed delivery artifacts and SHA-256 manifest.
7. **Integrity check and review** — recompute the manifest, record the result, and conduct one buyer review session.

## Fixed delivery artifact

The delivery ZIP must contain exactly these top-level files:

- `00_README.md`
- `01_SCOPE_AND_AUTHORITY.json`
- `02_SYNTHETIC_SCENARIO.json`
- `03_RESPONSE_TIMELINE.json`
- `04_T24_EVIDENCE_RECORD.json`
- `05_T72_EVIDENCE_RECORD.json`
- `06_GAPS_AND_LIMITS.json`
- `07_FINDINGS.md`
- `08_RECEIPT.json`
- `09_VERIFIER_RESULT.json`
- `MANIFEST.sha256`

No raw customer secrets, credentials, personal data, production logs, or unapproved customer evidence may be included.

## Acceptance criteria

The proof run is accepted when all of the following are true:

1. The named sponsor, product boundary, scenario identifier, participants, and exercise clock are present.
2. Both checkpoint records distinguish observed facts, buyer statements, inference, and unresolved uncertainty.
3. Every material timeline event names an actor or role, authority source, timestamp, evidence reference, and uncertainty state.
4. Each finding points to at least one package evidence reference or is explicitly labelled unsupported/unresolved.
5. Every path listed in `MANIFEST.sha256` exists in the delivered ZIP.
6. `sha256sum -c MANIFEST.sha256` returns success on the delivered package.
7. Mutating one manifested file causes the same command to return failure.
8. `09_VERIFIER_RESULT.json` records the command, execution time, tool version or environment, clean-package result, and mutation-test result.
9. The buyer receives one review session and a written list of unresolved gaps.

If criteria 1–8 are not met, the delivery is incomplete and the bounded claim below must not be issued.

## Price boundary

Use the existing `WORKFLOW-S` commercial anchor: `from €1,500`, quote after scope.

The €1,500 entry boundary applies only when the fixed scope above is preserved, execution is remote, the scenario is synthetic, buyer inputs are ready, and no additional legal, technical, or regulatory work is requested.

Any scope increase requires a new written fit decision rather than silent expansion.

## Bounded claim

When the acceptance criteria pass, WitnessOps may claim only:

> For the named synthetic scenario, product boundary, participants, and execution window, WitnessOps recorded and packaged the buyer-supplied evidence, authority, decisions, timing, and unresolved gaps at simulated 24-hour and 72-hour checkpoints. The delivered manifest passed the recorded integrity and mutation checks.

## Explicit non-claims

This proof run does not establish or claim:

- that the buyer or product is in scope of the Cyber Resilience Act;
- legal advice or a legal interpretation of Article 14;
- CRA compliance, conformity assessment, certification, or CE-marking readiness;
- that a real incident or vulnerability is reportable;
- submission to ENISA, a CSIRT, the CRA Single Reporting Platform, or another authority;
- product security, absence of vulnerabilities, or correctness of remediation;
- incident response, forensic investigation, penetration testing, vulnerability research, or continuous monitoring;
- regulator acceptance of the package;
- completeness or truth of buyer-supplied facts beyond the named checks;
- independent evaluator, notified-body, auditor, or legal-representative status.

## Stop conditions

Stop before or during execution if:

- the buyer cannot name an authorizing sponsor;
- the product or version boundary remains ambiguous;
- the buyer supplies a live incident instead of the approved synthetic scenario;
- secrets, credentials, personal data, customer evidence, or restricted data are offered;
- the buyer asks WitnessOps to decide legal scope or file a notification;
- the exercise requires product access, exploitation, remediation, or production changes;
- the scope expands beyond one product, one scenario, or one reporting pathway;
- the manifest or mutation acceptance tests cannot be completed.

## Repeatability rule

A second run is a new proof run using the same contract and a new scenario identifier. Comparison or drift is not included unless separately scoped as a Workflow Re-run.

## Founder release gate

Before this request shape can be offered to a buyer, the founder must approve:

- the fixed boundary;
- use of the €1,500 entry anchor;
- the buyer intake checklist;
- the synthetic sample scenario;
- the delivery templates;
- the manifest and mutation-test procedure;
- the final non-claims.
