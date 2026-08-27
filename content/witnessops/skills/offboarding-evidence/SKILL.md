---
name: offboarding-evidence
description: >
  Use when evaluating offboarding or access-removed evidence. Work from raw
  evidence and a deterministic checklist. Do not narrate access removal that
  the evidence does not show.
---

# Offboarding evidence

Access removed is a claim. The specimen has to carry it.

## Workflow

1. Collect the raw evidence (tickets, IdP events, key revocation records).
2. Evaluate against a declared checklist.
3. Hash the evidence set.
4. Write a human-readable report that cites those hashes.
5. Name every checklist item that did not fire.

## Guardrails

- Do not claim access was removed because someone said it was.
- Do not mix this customer with a labelled sample.
- Do not skip the hash step.
- If revocation of signing keys is unverified, say Incomplete.

## Outputs

- checklist result
- SHA-256 manifest
- human-readable report
