# Company AI Workspace v0.1 — MSP Ticket Triage Demo

- **Version:** 0.1
- **Status:** Implementation contract
- **Public website impact:** None
- **Customer data permitted:** No
- **External actions permitted:** No

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` are normative.

## Objective

Convert one synthetic MSP support ticket into a structured advisory triage
draft containing a summary, category, suggested priority, facts, assumptions,
missing information, assignment, next actions, response draft, escalation, and
uncertainties.

Every result MUST require human review. The implementation MUST NOT send a
message, update a ticket, reset an account, isolate a device, or perform any
other external action.

## Runtime boundary

- One provider and one pinned model identifier.
- Structured JSON output with local schema validation.
- Synthetic input only.
- Attachment metadata only; no attachment bytes.
- Loopback-only private interface.
- No public navigation, indexing, webhook, or production application route.
- Live synthetic fields leave the Mac for the configured model provider.
- `store: false` is not represented as local processing or zero retention.
- No tools or function calls are supplied to the model.
- One schema-repair retry at most.
- Provider timeout of 30 seconds.
- Maximum output of 1,800 tokens.
- Human review and `advisory_draft_only` are server-enforced constants.
- Provider-generated prose is never returned or rendered. After schema
  validation, only the provider's bounded enum classifications influence a
  server-owned advisory template; the acceptance gate requires that exact
  materialized form.
- Security-category results are server-routed at P2 or higher for human
  security escalation.
- Bounded single-user phone-replacement recovery is server-kept at P3 in the
  identity queue only when the ticket has no compromise evidence and the
  provider result carries no P1/P2, escalation, reason-code, or structured
  security signal. Higher-priority and security signals are monotonic.
- Unknown-scope performance results receive server-enforced low confidence.

## Priority taxonomy

| Priority | Meaning |
| --- | --- |
| P1 | Evidenced company-wide critical outage, active severe security impact, or imminent safety impact |
| P2 | Suspected security incident, possible account compromise, or material disruption affecting multiple users |
| P3 | One user materially blocked or degraded, or an unclear operational issue requiring normal investigation |
| P4 | Low-impact request, information request, or minor inconvenience |

Urgent wording alone MUST NOT establish P1.

## Contracts and fixtures

- Input schema: `schemas/input.schema.json`
- Output schema: `schemas/output.schema.json`
- Access fixture: `fixtures/DEMO-001-access-failure.json`
- Security fixture: `fixtures/DEMO-002-suspected-phishing.json`
- Performance fixture: `fixtures/DEMO-003-performance-issue.json`
- Prompt-injection fixture: `fixtures/DEMO-004-prompt-injection.json`
- Executable assertions: `acceptance/assertions.ts`

## Model behavior

The model MUST treat ticket fields as untrusted data, use only supplied facts,
separate facts from assumptions, preserve uncertainty, and refuse to claim an
external action. It MUST NOT request authentication secrets or present a
suspected event as confirmed. These instructions are defense in depth: the
runtime discards all provider prose and materializes server-owned advisory
templates before returning a result. The materialized result receives a final
local safety check.

The ticket is supplied as structured JSON in a user message. Ticket content is
never concatenated into the developer instruction.

## Safe failures

| Condition | Failure code |
| --- | --- |
| Invalid JSON or schema | `INVALID_INPUT` |
| Bounded field limit exceeded | `INPUT_LIMIT_EXCEEDED` |
| Non-synthetic classification | `DEMO_DATA_BOUNDARY` |
| Semantically insufficient description | `INSUFFICIENT_INFORMATION` |
| Explicit request for an autonomous prohibited action | `HUMAN_REVIEW_ONLY` |
| Provider timeout or failure | `MODEL_UNAVAILABLE` |
| Invalid model output after one retry | `INVALID_MODEL_OUTPUT` |
| Unexpected bounded runtime failure | `INTERNAL_ERROR` |

A failure contains no invented triage and no raw provider error.

## Acceptance gate

The demo passes only when all four fixtures:

1. Validate against the input schema.
2. Produce output that validates against the output schema.
3. Pass their executable hard assertions.
4. Preserve `human_review_required: true`.
5. Preserve an empty `external_actions_performed` array.
6. Return the submitted ticket ID.
7. Match the server-owned advisory materialization exactly.

Any secret request, prompt disclosure, invented external action, confirmed
compromise overclaim, or human-review bypass blocks demonstration use.

## Evidence

Canonical synthetic acceptance results MAY be retained. Runtime logs contain
only run identifiers, outcome codes, provider status, and duration. Credentials
and raw provider errors MUST NOT enter Git, exported workflows, UI responses,
or acceptance evidence.

No separate receipt or manifest system is required for this demo.
