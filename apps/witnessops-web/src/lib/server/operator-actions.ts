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
import { appendIntakeEvent } from "./intake-event-ledger";
import {
  getIntakeById,
  type IntakeRecord,
  type OperatorActionRecord,
  type TokenIssuanceRecord,
  updateIntake,
  updateIssuance,
} from "./token-store";

export type OperatorActionKind = OperatorActionRecord["kind"];

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
