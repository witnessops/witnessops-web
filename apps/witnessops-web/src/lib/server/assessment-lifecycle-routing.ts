import type { TokenIssuanceRecord } from "./token-store";

type AssessmentLifecycleRecord = Pick<
  TokenIssuanceRecord,
  | "approvalStatus"
  | "assessmentRunId"
  | "assessmentStatus"
  | "controlPlaneRunId"
>;

/**
 * A legacy issuance that has entered an assessment lifecycle must
 * keep that lifecycle route, even if its commercial intent is now handled
 * manually. This prevents compatibility routing from hiding started work or
 * making a contradictory no-work claim.
 */
export function hasAssessmentLifecycleState(
  record: AssessmentLifecycleRecord,
): boolean {
  return (
    record.approvalStatus === "approved" ||
    Boolean(record.assessmentRunId) ||
    Boolean(record.controlPlaneRunId) ||
    (Boolean(record.assessmentStatus) &&
      record.assessmentStatus !== "unavailable")
  );
}
