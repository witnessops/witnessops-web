---
name: proof-run-handover
description: >
  Use when closing a bounded proof run or preparing a public sample case.
  The package must name scope, evidence references, and limits. It is not a
  pentest report and not a certification.
---

# Proof-run handover

The buyer should be able to re-check the record without taking it on trust.

## Package shape

- Scope that was authorised
- Checks that ran
- Evidence references (paths, receipts)
- Named unknowns
- Explicit non-claims
- How to verify the receipt, if one exists

## Workflow

1. Restate the authorised scope in one paragraph.
2. List checks that ran. Do not imply checks that did not.
3. Attach evidence references, not raw secrets.
4. Write the limitation next to the result.
5. Point at Verify a receipt or Check a Skill when those surfaces apply.

## Guardrails

- Do not present a sample as a live customer artifact.
- Do not drop the limitation to make the package look cleaner.
- Do not include credentials, tokens, or internal paths.

## Outputs

- handover note
- evidence index
- verification pointer
