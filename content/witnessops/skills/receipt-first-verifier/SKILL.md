---
name: receipt-first-verifier
description: >
  Verify a WitnessOps receipt from uploaded or pasted JSON. Use when the user
  wants a receipt-scoped result. Do not accept proof-bundle ZIPs. Do not claim
  production truth when evidence or trust inputs were not independently checked.
---

# Receipt-first verifier

Run receipt-scoped checks. Name every evidence, artifact, signature, or trust
input that was not independently checked.

## When to use

- The user pastes receipt JSON
- The user asks to verify a WitnessOps receipt
- The user wants to know what Valid, Invalid, or Incomplete means

## Workflow

1. Accept `.json` or pasted JSON only. Proof-bundle ZIPs are out of scope.
2. Parse the receipt. If it is not a supported type, stop and say so.
3. Run the checks required for that receipt type.
4. Emit Valid, Invalid, or Incomplete.
5. List named failures and named unchecked inputs.

## Result language

- Valid means the checks required for this receipt type passed. On a public surface that is receipt-scoped only.
- Invalid means one or more of those checks failed. Read the named failure before relying on any claim built on the receipt.
- Incomplete means the receipt may be coherent, but required evidence, artifact, authorization, workflow, signature, or trust checks were not all independently completed. The API verdict is indeterminate.

## Guardrails

- Do not accept caller-supplied evidence or trust material on the public adapter.
- Do not claim the reviewed system is secure.
- Do not claim that a finding is true solely because a receipt exists.
- Do not treat a passed check as a valid result when required inputs were not checked.

## Outputs

- verdict
- named checks that ran
- named inputs that were not checked
