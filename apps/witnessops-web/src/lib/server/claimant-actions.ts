/**
 * Claimant-side back-out and amendment actions (WEB-003).
 *
 * Three actions are exposed to the claimant before scope approval:
 *
 *  - amend    : the claimant updates the submission scope text. The
 *               engagement remains open; approval is still allowed.
 *  - retract  : the claimant exits the engagement. Terminal until
 *               re-opened. Approval is blocked.
 *  - disagree : the claimant disputes the proposed scope. Terminal
 *               until re-opened. Approval is blocked.
 *
 * Auth model: claimant actions reuse the existing email-match check that
 * `approveScopeAndStartRecon` uses — the caller must present the email
 * recorded on the issuance.
 *
 * Boundary: this module ONLY writes the local intake/issuance store. It
 * never writes delivered, acknowledged, or completed truth — those are
 * control-plane authority (CP-001 / CP-002).
 */
import { appendIntakeEvent } from "./intake-event-ledger";
import {
  type ClaimantActionRecord,
  getIntakeById,
  getIssuanceById,
  updateIntake,
  updateIssuance,
  type TokenIssuanceRecord,
} from "./token-store";

export type ClaimantActionKind = ClaimantActionRecord["kind"];

export class ClaimantActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface ClaimantActionInput {
  issuanceId: string;
  email: string;
  reason: string;
  /** Required when kind === "amend". */
  amendedScope?: string | null;
}

export interface ClaimantActionResult {
  issuanceId: string;
  intakeId: string;
  email: string;
  approvalStatus: TokenIssuanceRecord["approvalStatus"];
  claimantAction: ClaimantActionRecord;
  /**
   * True for retract / disagree — these block subsequent approval until
   * a re-opening flow is exercised. WEB-003 does not ship a re-open path.
   */
  blocksApproval: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normaliseEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

async function loadAndAuthorise(
  input: ClaimantActionInput,
): Promise<{ issuance: TokenIssuanceRecord; intakeId: string }> {
  if (!input.issuanceId) {
    throw new ClaimantActionError("issuanceId is required.", 400);
  }
  const issuance = await getIssuanceById(input.issuanceId);
  if (!issuance) {
    throw new ClaimantActionError("Issuance not found.", 404);
  }
  if (normaliseEmail(issuance.email) !== normaliseEmail(input.email)) {
    throw new ClaimantActionError(
      "Email does not match the issuance.",
      403,
    );
  }
  if (issuance.approvalStatus === "approved") {
    throw new ClaimantActionError(
      "Scope has already been approved. Claimant actions only apply before approval.",
      409,
    );
  }
  if (!issuance.intakeId) {
    throw new ClaimantActionError("Issuance has no associated intake.", 500);
  }
  return { issuance, intakeId: issuance.intakeId };
}

function requireReason(reason: string): string {
  const trimmed = (reason ?? "").trim();
  if (!trimmed) {
    throw new ClaimantActionError("reason is required.", 400);
  }
  if (trimmed.length > 1000) {
    throw new ClaimantActionError(
      "reason must be 1000 characters or fewer.",
      400,
    );
  }
  return trimmed;
}

/**
 * Claimant amends the submission scope. Existing record state is updated
 * via the existing intake/issuance schema — no new approvalStatus enum
 * value is introduced. The replacement scope is written to
 * `intake.submission.scope`, and the issuance carries a claimantAction
 * marker so the assessment page can render the amendment clearly.
 *
 * Approval is NOT blocked after an amend. The claimant may still proceed.
 */
export async function amendClaimantScope(
  input: ClaimantActionInput,
): Promise<ClaimantActionResult> {
  const { issuance, intakeId } = await loadAndAuthorise(input);
  const reason = requireReason(input.reason);
  const amendedScope = (input.amendedScope ?? "").trim();
  if (!amendedScope) {
    throw new ClaimantActionError(
      "amendedScope is required for amend.",
      400,
    );
  }
  if (amendedScope.length > 4000) {
    throw new ClaimantActionError(
      "amendedScope must be 4000 characters or fewer.",
      400,
    );
  }

  // Existing schema path — write the amended scope through updateIntake.
  const intake = await getIntakeById(intakeId);
  if (!intake) {
    throw new ClaimantActionError("Intake not found.", 500);
  }
  await updateIntake(intakeId, (current) => ({
    ...current,
    submission: {
      ...current.submission,
      scope: amendedScope,
    },
    updatedAt: nowIso(),
  }));

  const action: ClaimantActionRecord = {
    kind: "amend",
    recordedAt: nowIso(),
    reason,
    amendedScope,
  };
  const next = await updateIssuance(issuance.issuanceId, (current) => ({
    ...current,
    claimantAction: action,
  }));

  return {
    issuanceId: next.issuanceId,
    intakeId,
    email: next.email,
    approvalStatus: next.approvalStatus ?? "pending",
    claimantAction: action,
    blocksApproval: false,
  };
}

/**
 * Claimant retracts the engagement. Terminal exit signal — approval is
 * blocked thereafter (WEB-003 does not ship a re-open path).
 */
export async function retractClaimantEngagement(
  input: ClaimantActionInput,
): Promise<ClaimantActionResult> {
  const { issuance, intakeId } = await loadAndAuthorise(input);
  const reason = requireReason(input.reason);

  const action: ClaimantActionRecord = {
    kind: "retract",
    recordedAt: nowIso(),
    reason,
  };
  const next = await updateIssuance(issuance.issuanceId, (current) => ({
    ...current,
    claimantAction: action,
  }));

  return {
    issuanceId: next.issuanceId,
    intakeId,
    email: next.email,
    approvalStatus: next.approvalStatus ?? "pending",
    claimantAction: action,
    blocksApproval: true,
  };
}

/**
 * Claimant records a scope disagreement. Approval is blocked until the
 * disagreement is cleared (WEB-003 does not ship the clearing path).
 */
export async function disagreeWithClaimantScope(
  input: ClaimantActionInput,
): Promise<ClaimantActionResult> {
  const { issuance, intakeId } = await loadAndAuthorise(input);
  const reason = requireReason(input.reason);

  const action: ClaimantActionRecord = {
    kind: "disagree",
    recordedAt: nowIso(),
    reason,
  };
  const next = await updateIssuance(issuance.issuanceId, (current) => ({
    ...current,
    claimantAction: action,
  }));

  return {
    issuanceId: next.issuanceId,
    intakeId,
    email: next.email,
    approvalStatus: next.approvalStatus ?? "pending",
    claimantAction: action,
    blocksApproval: true,
  };
}

/**
 * Claimant clears their own terminal exit (WEB-005).
 *
 * Reverses a prior retract or disagree by clearing `claimantAction`.
 * Refused if the issuance is not in one of those terminal states.
 * Refused if the issuance has already been approved (no need to reopen)
 * or if the email does not match (same auth model as the other claimant
 * actions). The original retract/disagree event remains in the intake
 * event ledger; this function only appends a complementary
 * `intake.reopen.claimant_action_cleared` event for the audit trail.
 */
export async function reopenClaimantExit(
  input: ClaimantActionInput,
): Promise<ClaimantActionResult> {
  const { issuance, intakeId } = await loadAndAuthorise(input);
  const reason = requireReason(input.reason);

  const current = issuance.claimantAction ?? null;
  if (!current) {
    throw new ClaimantActionError(
      "Nothing to reopen: there is no claimant action on this issuance.",
      409,
    );
  }
  if (current.kind === "amend") {
    // Amend is non-terminal — there is nothing to clear. This is
    // surfaced explicitly so a UI that incorrectly calls reopen on an
    // amended run gets a precise error instead of a generic 409.
    throw new ClaimantActionError(
      "Nothing to reopen: amend is non-terminal and does not block approval. Submit approve directly.",
      409,
    );
  }
  if (current.kind !== "retract" && current.kind !== "disagree") {
    throw new ClaimantActionError(
      "Nothing to reopen: claimant action is not a terminal exit.",
      409,
    );
  }

  const clearedKind = current.kind;
  const clearedReason = current.reason;

  const next = await updateIssuance(issuance.issuanceId, (existing) => ({
    ...existing,
    claimantAction: null,
  }));

  // Append a reopen event to the existing intake event ledger so the
  // audit story is complete: original retract/disagree event remains,
  // and this complementary event records the clearance.
  const intake = await getIntakeById(intakeId);
  if (intake) {
    await appendIntakeEvent({
      event_type: "intake.reopen.claimant_action_cleared",
      occurred_at: nowIso(),
      channel: intake.channel,
      intake_id: intake.intakeId,
      issuance_id: issuance.issuanceId,
      thread_id: intake.threadId,
      previous_state: intake.state,
      next_state: intake.state,
      source: "web/claimant-actions/reopen",
      payload: {
        cleared_kind: clearedKind,
        cleared_reason: clearedReason,
        requested_by_email: next.email,
        reopen_reason: reason,
      },
    });
  }

  // Synthesize a result that reflects the reopened state. The
  // `claimantAction` field is intentionally a non-null sentinel here
  // so the existing ClaimantActionResult shape stays consistent for
  // callers; UI / tests should rely on `blocksApproval` and on a
  // subsequent `getIssuanceById` call for authoritative state.
  return {
    issuanceId: next.issuanceId,
    intakeId,
    email: next.email,
    approvalStatus: next.approvalStatus ?? "pending",
    claimantAction: {
      kind: clearedKind,
      recordedAt: current.recordedAt,
      reason: clearedReason,
    },
    blocksApproval: false,
  };
}

/**
 * Pure predicate: does the issuance currently carry a claimant action
 * that conflicts with approval? Used by the approve route gate.
 */
export function claimantActionBlocksApproval(
  record: TokenIssuanceRecord | null | undefined,
): { blocked: boolean; kind: ClaimantActionKind | null } {
  const action = record?.claimantAction ?? null;
  if (!action) return { blocked: false, kind: null };
  if (action.kind === "retract" || action.kind === "disagree") {
    return { blocked: true, kind: action.kind };
  }
  return { blocked: false, kind: action.kind };
}
