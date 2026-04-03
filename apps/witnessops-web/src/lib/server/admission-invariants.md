# WitnessOps Admission Invariants

This is the short version. If the code drifts from this file, the code is wrong.

## Authority

- The append-only event ledger is the source of truth for admission history.
- Snapshot JSON in `intakes/` and `issuances/` is a read model.
- Snapshots may lag, but they must always be derivable from the ledger.
- If a snapshot and the ledger disagree, prefer the ledger and rebuild the snapshot.

## State Model

The canonical happy path is:

`submitted -> verification_sent -> verified -> admitted`

Optional terminal or side-path states are:

- `expired`
- `rejected`
- `replayed`
- `responded`

## Invariants

- Assessment never starts before `admitted`.
- Support never redirects to assessment.
- `responded` means the first external operator reply was successfully delivered for an admitted intake. Viewing, opening, or drafting does not change state.
- Downstream provider or mailbox outcomes are separate evidence about that reply attempt. They enrich custody but do not rewrite `responded` or create it retroactively.
- Re-submit after the first successful operator reply does not send a second first-response email. It returns the existing response evidence and preserves the original `INTAKE_RESPONDED` event as authority.
- `intakeId`, `issuanceId`, and `threadId` are distinct identifiers with distinct meanings and must not be reused across domains of meaning.
- Every material transition emits an append-only event.
- Repeat verification may emit replay evidence, but it must not create a second `INTAKE_ADMITTED` transition or a second assessment run for the same issuance.

## Projection Ordering

- Queue projection replays the ledger in append order.
- `occurred_at` timestamps describe evidence time, but they do not outrank append order for causal reconstruction.

## Recovery Rules

- Ledger evidence is the durable proof of state. External side effects and snapshots do not outrank it.
- If a snapshot write succeeds and the corresponding ledger append fails, treat the snapshot as stale and reconcile from the ledger before further processing.
- If a ledger event exists and a snapshot is missing or behind, rebuild the snapshot from the ledger.
- If a verification email is delivered without durable ledger evidence of `verification_sent`, treat delivery as an incomplete side effect pending reconciliation, not as authoritative state.
- If an operator reply is delivered and the snapshot is updated but the `INTAKE_RESPONDED` append fails, surface the divergence and block resend until reconciliation.
- If downstream provider evidence arrives later, record it as a separate append-only fact and project it beside the original response attempt rather than mutating admission state.
- Strong downstream provider outcomes may close a missing-response ambiguity in the derived queue and report, but they still do not create `INTAKE_RESPONDED` or fabricate manual reconciliation.
- Reconciliation visibility must include the actor, mailbox, provider, provider message ID, and internal delivery attempt ID for the first external reply.
- Reconciliation does not rewrite history. It emits a new fact that an operator reviewed delivery evidence without matching durable confirmation and recorded a reconciliation decision.
- Reconciliation must carry the current evidence subcase. Operators may inherit that subcase from the queue, but they must not reconcile against an unclassified ambiguity.
- Reconciliation notes are required and case-aware. They must explain the actual evidence gap under the current subcase instead of recording decorative approval text.
- Reconciliation actor identity must remain exportable as both the actor string and the admin auth context that produced it.

## Provider Correlation

### Resend
- `providerMessageId`: Resend email ID returned at send time (`body.id`).
- `deliveryAttemptId`: Embedded as `witnessops_delivery_attempt_id` tag at send time.
- Webhook verification: Svix HMAC (`WITNESSOPS_RESEND_WEBHOOK_SECRET`).

### M365 (Microsoft Graph)
- `providerMessageId`: Deterministic Internet-Message-ID from `deliveryAttemptId` (`<rsp_…@witnessops.m365>`).
- `deliveryAttemptId`: Embedded as `X-WitnessOps-Delivery-Attempt-Id` internet message header.
- Webhook verification: HMAC-SHA256 (`WITNESSOPS_M365_WEBHOOK_SECRET`).

### File provider
- No downstream outcome pipeline (classified as `local_attempt_recorded_provider_outcome_unknown`).

## Evidence Sources

| Source | Route | Auth | Purpose |
|--------|-------|------|---------|
| Resend webhook | `POST /api/provider-events/response-outcome` | Svix | Delivery status |
| M365 webhook | `POST /api/provider-events/response-outcome` | HMAC | Delivery status |
| Trusted normalized | `POST /api/provider-events/response-outcome` | Secret header | Pre-normalized events |
| Mailbox receipt | `POST /api/provider-events/mailbox-receipt` | Secret header | End-to-end confirmation |

## Ambiguity Resolution Hierarchy

1. Manual reconciliation (operator judgment) — takes precedence when recorded.
2. Strong provider outcome (`delivered`, `bounced`, `failed`) — auto-closes.
3. Strong mailbox receipt — auto-closes when no provider outcome resolves.
4. Pending — `accepted` or missing evidence.

Manual reconciliation is blocked when strong provider or mailbox receipt evidence already closes the case.

## Thread Semantics

- `threadId` is not a convenience grouping key.
- It represents conversation continuity for admitted work and must remain stable across operator responses in that conversation.
- It must not be repurposed as a surrogate for `intakeId` or `issuanceId`.
