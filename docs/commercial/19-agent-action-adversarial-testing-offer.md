# Agent Action Security Review — active adversarial testing

This record implements the founder scope direction supplied for this update.
It defines maintained source, not production publication or customer testing
authority. The [commercial index](./README.md) selects this scope for new work.

## Buyer promise

> WitnessOps actively tests one consequential AI-agent action across the complete path: attacker-controlled input, the agent’s selected action, tool or API execution, effective permissions, the actual saved change, and the evidence supporting the result. Within an agreed environment and test boundary, we attempt prohibited outcomes and show which controls resisted, which failed, what changed, and what needs fixing.

Short version:

> We try to make your AI agent take actions it should refuse, then show you the evidence and what needs fixing.

Keep the name **Agent Action Security Review** and request identity
`agent-action-security-review`. The scope revision is
`one_action_adversarial_testing_v2`. Record the accepted scope revision and actual
terms in each SOW. An identity alone never expands an earlier request or agreement.
This does not reopen parked or retired offers.

## Coverage

| Stage | What the test establishes |
| --- | --- |
| Attacker-controlled input | Whether an agreed input surface can redirect the workflow into a prohibited action. |
| Agent decision | The selected action, tool and parameters from observable behaviour; no claim to inspect private reasoning. |
| Tool or API call | What was actually submitted, including validation, errors, retries and unexpected operations. |
| Effective permissions | Which identity acted, what it could access, and whether approval and resource boundaries were enforced. |
| Actual saved change | What the authoritative backend changed, including partial, duplicate or absent changes. A tool success message alone is insufficient. |
| Evidence | Whether recorded inputs, calls and resulting state support a reproducible finding, and what remains unavailable. |

Authorization must be enforced **before the system changes**. These six stages
describe coverage, not an instruction to check permissions after execution.

## Agreement and execution boundary

Resolve these fields in the SOW before accepting or starting testing:

- One consequential action, intended allowed behaviour and prohibited outcomes.
- Named environment, resources, input surfaces, affected systems and ownership,
  including any third-party authority.
- Test identities, effective access, permitted operations, test data and side-effect
  limits. Arrange limited access securely after agreement; no credentials, secrets
  or customer evidence through the public fit check.
- Written authorization, test window, case/attempt allowance, rate or cost limits,
  stop conditions, escalation contact, saved baseline and recovery method.
- Evidence sources, before/after authoritative backend readback, secure handling,
  recipients, retention, redaction and reproduction constraints.
- Fee, payment terms, delivery capacity, delivery timing, and whether a retest is
  included. Name its cases, window and allowance when included.

Attempt agreed prohibited outcomes only after these conditions are satisfied.
Stop when authority, the environment, a side-effect limit or a stop condition
fails; record partial results and resolve scope before resuming. An enquiry,
payment or approved offer direction does not authorize testing or production changes.

Production changes require separate explicit authorization. Destructive activity,
persistence, unrelated data access, remediation implementation, continuous
monitoring, certification and whole-environment assurance are excluded. This is
not a penetration test of the whole environment or a security guarantee. Do not
retain the old blanket exclusion of execution or exploitation: attempts at the
specifically agreed prohibited outcomes are the core test method.

## Deliverable and acceptance criteria

Deliver the action map, test results, demonstrated impact, reproduction conditions,
mitigation recommendations, explicit gaps, written report and readout. A retest
can be part of the original agreement when its cases and allowance are specified;
it is neither automatically excluded nor unlimited.

For every agreed case, record input and preconditions, environment/configuration
revision, observable decision, submitted calls/parameters, validation/errors/retries,
acting identity and approval boundary, before/after authoritative state, evidence
references, impact and limitations. State one outcome:

| Outcome | Required support |
| --- | --- |
| Failure demonstrated | Evidence connects the agreed prohibited outcome to the observed action and authoritative resulting state. State actual impact and reproduction conditions. |
| Resisted under tested conditions | The recorded attempt was blocked in the named conditions, with backend readback for the agreed effect. Do not generalize to untested inputs or environments. |
| Inconclusive | Missing or conflicting evidence prevents a supported conclusion. An attempted but unobservable case is not a pass. |
| Not tested | The case was not run; give the reason and coverage gap. |

Record recovery and residual changes where applicable. Missing access, missing
evidence or an agent/tool error does not establish that a control resisted.
Reproduction respects evidence handling and the test boundary. Existing synthetic
specimens are not completed customer adversarial tests. Public `/verify` and
`/api/verify` stay receipt-only; they confer no testing or signing authority.

## Commercial status and earlier agreements

The expanded package has **no approved fixed price, delivery capacity or default
retest allowance**. Public copy says **Fee agreed in signed SOW**. Delivery timing
agreed in the signed statement of work. Resolve capacity and commercial terms
before accepting work; do not make an automatic booking or customer commitment.

The earlier public Agent Action Security Review was **€2,500 excluding VAT** for
read, inspect, reconstruct and report. It excluded executing the action,
exploitation and retesting. Its source record is retained as
`READ_ONLY_AGENT_ACTION_OFFER` in `commercial-truth.ts`; the older
`bounded-workflow-review` and `agent-tools-access-review` contracts also remain.
Issued agreements retain the scope, exclusions, fee and retest terms actually
accepted. Do not sell expanded work at the old fee by implication.

## Maintained surfaces

Keep the commercial index, scope agreement, dry-run checklist and operator
playbook aligned. The shared `PUBLIC_AGENT_ACTION_OFFER`, landing/preparation
copy, EN/PL home, catalogue, review/pricing/request pages, public guidance,
metadata and buyer docs use this scope. Keep regressions and buyer-path smoke
aligned. This source change does not update a separately retained company master,
publish the site, or authorize customer testing.
