import type { VerifiedAdminSession } from "./admin-session";
import { hasBusinessAuthority, isSameOperator } from "./admin-authorization";
import {
  getAllIssuances,
  getIntakeById,
  getIssuanceById,
  type IntakeRecord,
  withIntakeLock,
} from "./token-store";

export class AdminBusinessAuthorizationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function requireAssignedBusinessAuthority(
  session: VerifiedAdminSession,
  intake: IntakeRecord,
): void {
  if (!hasBusinessAuthority(session.role)) {
    throw new AdminBusinessAuthorizationError(
      "Business authority is required for this action.",
      403,
    );
  }

  if (
    session.role === "Delegated Operator" &&
    !isSameOperator(
      intake.queue?.projection.assignedOperator ?? null,
      session.actor,
    )
  ) {
    throw new AdminBusinessAuthorizationError(
      "Delegated operators may change only records assigned to them.",
      403,
    );
  }
}

export async function requireIntakeBusinessAccess(
  session: VerifiedAdminSession,
  intakeId: string,
): Promise<IntakeRecord> {
  if (!hasBusinessAuthority(session.role)) {
    throw new AdminBusinessAuthorizationError(
      "Business authority is required for this action.",
      403,
    );
  }

  return withIntakeLock(intakeId, async () => {
    const intake = await getIntakeById(intakeId);
    if (!intake) {
      throw new AdminBusinessAuthorizationError("Intake not found.", 404);
    }
    requireAssignedBusinessAuthority(session, intake);
    return intake;
  });
}

export async function requireRunBusinessAccess(
  session: VerifiedAdminSession,
  runId: string,
): Promise<IntakeRecord> {
  if (!hasBusinessAuthority(session.role)) {
    throw new AdminBusinessAuthorizationError(
      "Business authority is required for this action.",
      403,
    );
  }

  const issuanceMatch = (await getAllIssuances()).find(
    (candidate) =>
      candidate.controlPlaneRunId === runId ||
      candidate.assessmentRunId === runId,
  );
  if (!issuanceMatch?.intakeId) {
    throw new AdminBusinessAuthorizationError("Run not found.", 404);
  }
  return withIntakeLock(issuanceMatch.intakeId, async () => {
    const intake = await getIntakeById(issuanceMatch.intakeId!);
    if (!intake) {
      throw new AdminBusinessAuthorizationError("Intake not found.", 404);
    }
    requireAssignedBusinessAuthority(session, intake);
    const issuance = await getIssuanceById(issuanceMatch.issuanceId);
    if (
      !issuance ||
      (issuance.controlPlaneRunId !== runId &&
        issuance.assessmentRunId !== runId)
    ) {
      throw new AdminBusinessAuthorizationError("Run not found.", 404);
    }
    return intake;
  });
}
