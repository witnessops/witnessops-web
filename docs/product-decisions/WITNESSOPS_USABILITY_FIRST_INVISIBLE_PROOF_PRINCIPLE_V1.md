# WITNESSOPS_USABILITY_FIRST_INVISIBLE_PROOF_PRINCIPLE_V1

| Field | Value |
|---|---|
| Status | `ACCEPTED` |
| Authority | Founder / Product Authority |
| Effective date | `2026-07-10` |
| Scope | All WitnessOps user-facing workflows |
| Canonical record | This document |

## Decision

Speed, ease of use, and successful task completion are primary. Evidence and
verification should be generated automatically beneath the workflow wherever
possible.

WitnessOps must keep the ordinary user focused on the task they are trying to
complete. The system should capture the authority, execution lineage, evidence,
and receipt material needed for later reconstruction without requiring the user
to understand or operate that machinery during the normal path.

## Product rule

**Easy in the foreground. Reconstructable in the background.**

The ordinary user should encounter a short, legible path:

```text
Intent → clear proposal → necessary approval → useful result
```

The system should preserve the corresponding proof path beneath it:

```text
Authority → execution → evidence capture → receipt → optional verification
```

“Optional verification” means that verification is available to the user,
operator, reviewer, or independent verifier without being a mandatory step in
every ordinary workflow. It does not make evidence capture, receipt generation,
or reconstructability optional where those duties apply.

## Invariant

Verification must not create user friction unless the risk reduction justifies
the interruption.

Proof machinery should therefore remain background infrastructure by default.
Receipts, evidence details, provenance, and verifier paths should be available
at the point where they are useful—for inspection, challenge, review, export, or
reconstruction—without dominating routine task completion.

## Risk-justified interruptions

The workflow may interrupt the ordinary path for:

- explicit authority gates;
- irreversible actions;
- financial commitments;
- security-sensitive actions; and
- legally required disclosures.

An interruption under this section must be attributable to the applicable risk
or authority boundary. Verification ceremony alone is not sufficient reason to
add a user step.

## Scope of application

This decision applies across:

- public website flows;
- Ask WitnessOps;
- review requests;
- admin and operator interfaces;
- future proof-run products; and
- receipt and evidence presentation.

Implementations may differ by audience and risk, but they must preserve both the
foreground usability objective and the background reconstruction path.

## Relationship to the Verifier’s Chair

This decision refines, rather than removes, the Verifier’s Chair principle.

**The Verifier’s Chair governs what must remain reconstructable. The Invisible
Proof Principle governs how little of that machinery the ordinary user should
need to see.**

Usability does not authorize weaker evidence, ambiguous authority, missing
lineage, or unverifiable claims. Verifiability does not authorize unnecessary
ceremony in the normal user path.

## Governance and interpretation

- This file is the canonical authority record for this product decision.
- Repository pointers, implementation issues, interface copy, and tests may
  operationalize this decision but do not replace or supersede it.
- Conformance requires evaluating the visible user path and the background
  authority/evidence path separately.
- Any exception that adds friction should identify the risk reduced, the
  authority requiring the interruption, and the state preserved for safe
  continuation.
- A future decision that changes this principle must name this record and state
  whether it refines or supersedes it.

## Supersession

This record does not supersede the Verifier’s Chair. It establishes the
user-experience rule for implementing that principle across WitnessOps
user-facing workflows.
