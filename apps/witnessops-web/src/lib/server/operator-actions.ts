/**
 * Operator-side reject and request-clarification actions (WEB-004).
 *
 * Two actions an operator can take against an intake without misusing
 * the reply / reconcile flows:
 *
 *  - reject               : terminal denial. Writes the existing reserved
 *                           states `intake.state = "rejected"` and
 *                           `issuance.approvalStatus = "approval_denied"`,
 *                           and appends an intake event for audit.
 *  - request_clarification: non-terminal. Records the operator's question
 *                           on the intake without advancing intake.state
 *                           and without flipping approvalStatus to
 *                           approval_denied. Approval is not blocked.
 *
 * Schema discipline: this module reuses the existing `rejected` admission
 * state and the existing `approval_denied` approvalStatus value rather
 * than introducing parallel terminal vocabulary. The only new field is
 * `operatorAction` on IntakeRecord (added in token-store.ts), mirroring
 * the structured field used by claimantAction in WEB-003.
 *
 * Boundary: this module never writes delivered, acknowledged, or
 * completed truth — those remain control-plane authority (CP-001/CP-002).
 */
import { appendIntakeEvent, readIntakeEvents } from "./intake-event-ledger";
import type { AdmissionState } from "@/lib/token-contract";
import {
  getIntakeById,
  getIssuanceById,
  type IntakeRecord,
  type OperatorActionRecord,
  type TokenIssuanceRecord,
  updateIntake,
  updateIssuance,
} from "./token-store";

export type OperatorActionKind = OperatorActionRecord["kind"];

/**
 * WEB-006: pre-approval intake states from which an operator may take
 * an intake-stage action (reject or request_clarification). Outside
 * this set the intake has either already been engaged (responded), is
 * already terminal (rejected, expired, replayed), or is otherwise
 * outside the operator's intake-stage vocabulary, and the action would
 * be a state-corrupting overwrite.
 */
const OPERATOR_ACTION_ALLOWED_STATES: ReadonlySet<AdmissionState> = new Set([
  "submitted",
  "verification_sent",
  "verified",
  "admitted",
]);

export class OperatorActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface OperatorActionInput {
  intakeId: string;
  actor: string;
  reason: string;
  /** Required when kind === "request_clarification". */
  clarificationQuestion?: string | null;
}

export interface OperatorActionResult {
  intakeId: string;
  state: IntakeRecord["state"];
  operatorAction: OperatorActionRecord;
  approvalStatus: TokenIssuanceRecord["approvalStatus"];
  blocksApproval: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function requireReason(reason: string): string {
  const trimmed = (reason ?? "").trim();
  if (!trimmed) {
    throw new OperatorActionError("reason is required.", 400);
  }
  if (trimmed.length > 1000) {
    throw new OperatorActionError(
      "reason must be 1000 characters or fewer.",
      400,
    );
  }
  return trimmed;
}

async function loadIntake(intakeId: string): Promise<IntakeRecord> {
  if (!intakeId) {
    throw new OperatorActionError("intakeId is required.", 400);
  }
  const intake = await getIntakeById(intakeId);
  if (!intake) {
    throw new OperatorActionError("Intake not found.", 404);
  }
  return intake;
}

/**
 * Operator rejects the intake. Writes the reserved states and the
 * matching intake event so the admission queue surfaces the rejection
 * coherently.
 */
export async function rejectIntakeAsOperator(
  input: OperatorActionInput,
): Promise<OperatorActionResult> {
  const intake = await loadIntake(input.intakeId);
  const reason = requireReason(input.reason);
  const actor = (input.actor ?? "").trim();
  if (!actor) {
    throw new OperatorActionError("actor is required.", 400);
  }
  if (intake.state === "rejected") {
    // Idempotent replay — return current state without rewriting.
    if (intake.operatorAction?.kind === "reject") {
      return {
        intakeId: intake.intakeId,
        state: intake.state,
        operatorAction: intake.operatorAction,
        approvalStatus: "approval_denied",
        blocksApproval: true,
      };
    }
    throw new OperatorActionError(
      "Intake is already rejected by another path.",
      409,
    );
  }
  // WEB-006: refuse on states outside the pre-approval intake stage so
  // a reject does not silently overwrite responded / replayed / expired
  // facts. The rejected case above stays first so its idempotent-replay
  // path is not blocked by this gate.
  if (!OPERATOR_ACTION_ALLOWED_STATES.has(intake.state)) {
    throw new OperatorActionError(
      `Cannot reject an intake in state "${intake.state}". Operator reject is only valid in the pre-approval intake stage.`,
      409,
    );
  }

  const occurredAt = nowIso();
  const action: OperatorActionRecord = {
    kind: "reject",
    recordedAt: occurredAt,
    actor,
    reason,
  };

  const previousState = intake.state;
  const updatedIntake = await updateIntake(intake.intakeId, (current) => ({
    ...current,
    state: "rejected",
    rejectedAt: occurredAt,
    updatedAt: occurredAt,
    operatorAction: action,
  }));

  // Reuse the existing append-only intake event ledger so the rejection
  // is part of the same audit substrate the queue already reads.
  await appendIntakeEvent({
    event_type: "intake.rejected_by_operator",
    occurred_at: occurredAt,
    channel: updatedIntake.channel,
    intake_id: updatedIntake.intakeId,
    issuance_id: updatedIntake.latestIssuanceId,
    thread_id: updatedIntake.threadId,
    previous_state: previousState,
    next_state: "rejected",
    source: "web/operator-actions/reject",
    payload: { actor, reason },
  });

  // Reflect the rejection on the latest issuance through the existing
  // approval_denied vocabulary so the claimant assessment page sees it.
  if (updatedIntake.latestIssuanceId) {
    await updateIssuance(updatedIntake.latestIssuanceId, (current) => ({
      ...current,
      approvalStatus: "approval_denied",
    }));
  }

  return {
    intakeId: updatedIntake.intakeId,
    state: updatedIntake.state,
    operatorAction: action,
    approvalStatus: "approval_denied",
    blocksApproval: true,
  };
}

/**
 * Operator records a clarification request. Non-terminal: intake state
 * and approvalStatus are unchanged. Approval is NOT blocked, so the
 * claimant can still amend their submission and proceed.
 */
export async function requestClarificationAsOperator(
  input: OperatorActionInput,
): Promise<OperatorActionResult> {
  const intake = await loadIntake(input.intakeId);
  const reason = requireReason(input.reason);
  const actor = (input.actor ?? "").trim();
  if (!actor) {
    throw new OperatorActionError("actor is required.", 400);
  }
  const question = (input.clarificationQuestion ?? "").trim();
  if (!question) {
    throw new OperatorActionError(
      "clarificationQuestion is required for request_clarification.",
      400,
    );
  }
  if (question.length > 2000) {
    throw new OperatorActionError(
      "clarificationQuestion must be 2000 characters or fewer.",
      400,
    );
  }
  if (intake.state === "rejected") {
    throw new OperatorActionError(
      "Cannot request clarification on a rejected intake.",
      409,
    );
  }
  // WEB-006: refuse on states outside the pre-approval intake stage so
  // a clarification request is not recorded against an already-engaged
  // (responded) or terminal (replayed/expired) intake. The rejected
  // case above stays first to preserve its existing 409 error message.
  if (!OPERATOR_ACTION_ALLOWED_STATES.has(intake.state)) {
    throw new OperatorActionError(
      `Cannot request clarification on an intake in state "${intake.state}". Operator clarification is only valid in the pre-approval intake stage.`,
      409,
    );
  }

  const occurredAt = nowIso();
  const action: OperatorActionRecord = {
    kind: "request_clarification",
    recordedAt: occurredAt,
    actor,
    reason,
    clarificationQuestion: question,
  };

  const updatedIntake = await updateIntake(intake.intakeId, (current) => ({
    ...current,
    updatedAt: occurredAt,
    operatorAction: action,
  }));

  await appendIntakeEvent({
    event_type: "intake.clarification_requested",
    occurred_at: occurredAt,
    channel: updatedIntake.channel,
    intake_id: updatedIntake.intakeId,
    issuance_id: updatedIntake.latestIssuanceId,
    thread_id: updatedIntake.threadId,
    previous_state: updatedIntake.state,
    next_state: updatedIntake.state,
    source: "web/operator-actions/request-clarification",
    payload: { actor, reason, clarificationQuestion: question },
  });

  // Approval is not blocked. The latest issuance keeps its current
  // approvalStatus. The claimant assessment page will surface the
  // clarification question via intake.operatorAction.
  return {
    intakeId: updatedIntake.intakeId,
    state: updatedIntake.state,
    operatorAction: action,
    approvalStatus: undefined,
    blocksApproval: false,
  };
}

/**
 * Pure predicate: does the issuance currently sit under an operator
 * rejection? Used by the approve route gate. Note that the existing
 * approval_denied check already covers most of this, but the explicit
 * predicate keeps the gate symmetric with the WEB-003 claimant gate
 * and yields a clearer error message.
 */
export function operatorRejectionBlocksApproval(
  record: TokenIssuanceRecord | null | undefined,
): boolean {
  return record?.approvalStatus === "approval_denied";
}

export interface RescindRejectionInput {
  intakeId: string;
  actor: string;
  reason: string;
}

/**
 * Operator rescinds a prior reject (WEB-005).
 *
 * Reverses the three mutations the original `rejectIntakeAsOperator`
 * call performed:
 *
 *   1. `intake.state` reverts to its **previous_state** as recorded in
 *      the original `intake.rejected_by_operator` ledger event. This is
 *      precise — it does not guess `verified` or any fallback. If the
 *      ledger event is missing, or its `previous_state` is null, the
 *      rescind fails closed (500) rather than producing an incoherent
 *      state. Operators must investigate before retrying.
 *   2. `intake.rejectedAt` is cleared.
 *   3. `intake.operatorAction` is cleared.
 *   4. `issuance.approvalStatus` reverts to `"pending"`.
 *
 * The original rejection event remains in the intake event ledger; this
 * function only **appends** a complementary
 * `intake.reopen.operator_rejection_rescinded` event for the audit trail.
 */
export async function rescindOperatorRejection(
  input: RescindRejectionInput,
): Promise<OperatorActionResult> {
  const intake = await loadIntake(input.intakeId);
  const reason = requireReason(input.reason);
  const actor = (input.actor ?? "").trim();
  if (!actor) {
    throw new OperatorActionError("actor is required.", 400);
  }

  if (intake.state !== "rejected") {
    throw new OperatorActionError(
      "Nothing to rescind: intake is not in the rejected state.",
      409,
    );
  }
  if (intake.operatorAction?.kind !== "reject") {
    throw new OperatorActionError(
      "Nothing to rescind: intake is rejected by a path other than operator reject.",
      409,
    );
  }

  // Fail-closed: read the original rejection event from the existing
  // append-only ledger and recover its previous_state. We deliberately
  // do not guess a fallback (e.g. "verified"). If the ledger does not
  // carry the original event, or carries it with no previous_state,
  // operators must investigate before we mutate state.
  const events = await readIntakeEvents();
  const rejectionEvents = events.filter(
    (e) =>
      e.intake_id === intake.intakeId &&
      e.event_type === "intake.rejected_by_operator",
  );
  if (rejectionEvents.length === 0) {
    throw new OperatorActionError(
      "Cannot rescind: no intake.rejected_by_operator event found in the ledger for this intake. Investigate before retrying.",
      500,
    );
  }
  const latestRejection = rejectionEvents[rejectionEvents.length - 1]!;
  const targetState: AdmissionState | null = latestRejection.previous_state ?? null;
  if (!targetState) {
    throw new OperatorActionError(
      "Cannot rescind: latest intake.rejected_by_operator ledger event has no previous_state. Investigate before retrying.",
      500,
    );
  }

  const occurredAt = nowIso();
  const originalRejectionReason =
    typeof intake.operatorAction?.reason === "string"
      ? intake.operatorAction.reason
      : "";
  const originalActor =
    typeof intake.operatorAction?.actor === "string"
      ? intake.operatorAction.actor
      : "";

  const updatedIntake = await updateIntake(intake.intakeId, (current) => {
    const next: IntakeRecord = {
      ...current,
      state: targetState,
      updatedAt: occurredAt,
      operatorAction: null,
    };
    // Clear the per-state timestamp set by the original rejection so
    // the snapshot does not falsely advertise that the intake was
    // rejected at any point in its current lifecycle position.
    delete (next as { rejectedAt?: string }).rejectedAt;
    return next;
  });

  await appendIntakeEvent({
    event_type: "intake.reopen.operator_rejection_rescinded",
    occurred_at: occurredAt,
    channel: updatedIntake.channel,
    intake_id: updatedIntake.intakeId,
    issuance_id: updatedIntake.latestIssuanceId,
    thread_id: updatedIntake.threadId,
    previous_state: "rejected",
    next_state: targetState,
    source: "web/operator-actions/rescind-rejection",
    payload: {
      actor,
      reopen_reason: reason,
      original_rejection_reason: originalRejectionReason,
      original_actor: originalActor,
      restored_to_state: targetState,
    },
  });

  // Revert the latest issuance's approvalStatus from approval_denied
  // back to pending so the approve gate stops refusing.
  let restoredApprovalStatus: TokenIssuanceRecord["approvalStatus"] = undefined;
  if (updatedIntake.latestIssuanceId) {
    const issuance = await getIssuanceById(updatedIntake.latestIssuanceId);
    if (issuance && issuance.approvalStatus === "approval_denied") {
      const updatedIssuance = await updateIssuance(
        updatedIntake.latestIssuanceId,
        (current) => ({
          ...current,
          approvalStatus: "pending",
        }),
      );
      restoredApprovalStatus = updatedIssuance.approvalStatus;
    } else if (issuance) {
      restoredApprovalStatus = issuance.approvalStatus;
    }
  }

  // Synthesize a result. The operatorAction field is a sentinel
  // describing what was just cleared, mirroring the WEB-005 claimant
  // reopen pattern. UI / tests should rely on `blocksApproval` and on
  // a subsequent `getIntakeById` call for authoritative state.
  return {
    intakeId: updatedIntake.intakeId,
    state: updatedIntake.state,
    operatorAction: {
      kind: "reject",
      recordedAt: latestRejection.occurred_at,
      actor: originalActor,
      reason: originalRejectionReason,
    },
    approvalStatus: restoredApprovalStatus,
    blocksApproval: false,
  };
}
