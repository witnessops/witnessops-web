---
name: decision-fabric-validator
description: >
  Use when checking a decision run, workflow class, or fixture against the
  declared schema. Negative fixtures must fail. Do not rewrite a failing
  fixture into a pass.
---

# Decision fabric validator

The class is the contract. The run is the evidence. Fixtures keep both honest.

## Workflow

1. Load the workflow class. If it is missing, stop.
2. Load the decision run or fixture.
3. Validate field by field against the class.
4. Record each miss with the field path.
5. Keep negative fixtures negative.

## Guardrails

- Do not "fix" a negative fixture to make the suite green.
- Do not infer missing approvals.
- Do not promote a draft class to production authority.
- If the class and the run disagree, name the disagreement.

## Outputs

- class id
- run id
- field-level misses
- pass / fail of the fixture intent
