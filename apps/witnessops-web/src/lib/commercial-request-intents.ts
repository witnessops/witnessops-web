export const AI_AGENT_ACTION_PROOF_RUN_INTENT =
  "ai-agent-action-proof-run" as const;

export const ACCESS_CHANGE_PROOF_RUN_INTENT =
  "access-change-proof-run" as const;

export const EXTERNAL_EXPOSURE_ASSESSMENT_INTENT =
  "OFFSEC-EXTERNAL-EXPOSURE" as const;

export const BOUNDED_WORKFLOW_REVIEW_INTENT =
  "bounded-workflow-review" as const;

export const CUSTOMER_SECURITY_REVIEW_SPRINT_INTENT =
  "customer-security-review-sprint" as const;

export const ONE_SERVER_SECURITY_CHECK_INTENT =
  "OFFSEC-LOCAL-AUDIT" as const;

export const LAUNCH_READINESS_CHECK_INTENT =
  "OFFSEC-LAUNCH-READY" as const;

export const KEY_ACCESS_CUSTODY_REVIEW_INTENT =
  "OFFSEC-CUSTODY-OPS" as const;

export const INCIDENT_READINESS_REVIEW_INTENT =
  "OFFSEC-INCIDENT-READY" as const;

export const PROFESSIONAL_PUBLIC_FOOTPRINT_AUDIT_INTENT =
  "professional-public-footprint-audit" as const;

export const ASK_AI_CONTACT_INTENT = "ask-ai-contact" as const;

export const MANUAL_COMMERCIAL_POST_VERIFY_PATH =
  "/review/request/confirmed" as const;

export const MANUAL_COMMERCIAL_REQUEST_INTENTS = [
  AI_AGENT_ACTION_PROOF_RUN_INTENT,
  ACCESS_CHANGE_PROOF_RUN_INTENT,
  EXTERNAL_EXPOSURE_ASSESSMENT_INTENT,
  BOUNDED_WORKFLOW_REVIEW_INTENT,
  CUSTOMER_SECURITY_REVIEW_SPRINT_INTENT,
  ONE_SERVER_SECURITY_CHECK_INTENT,
  LAUNCH_READINESS_CHECK_INTENT,
  KEY_ACCESS_CUSTODY_REVIEW_INTENT,
  INCIDENT_READINESS_REVIEW_INTENT,
  PROFESSIONAL_PUBLIC_FOOTPRINT_AUDIT_INTENT,
  ASK_AI_CONTACT_INTENT,
] as const;

export type ManualCommercialRequestIntent =
  (typeof MANUAL_COMMERCIAL_REQUEST_INTENTS)[number];

export function isManualCommercialRequestIntent(
  intent: string | null | undefined,
): boolean {
  const normalized = intent?.trim();
  return MANUAL_COMMERCIAL_REQUEST_INTENTS.some(
    (candidate) => candidate === normalized,
  );
}

export function getCommercialRequestLabel(
  intent: string | null | undefined,
): string {
  switch (intent?.trim()) {
    case AI_AGENT_ACTION_PROOF_RUN_INTENT:
      return "AI Agent Action Proof Run request";
    case ACCESS_CHANGE_PROOF_RUN_INTENT:
      return "access-change package request";
    case EXTERNAL_EXPOSURE_ASSESSMENT_INTENT:
      return "Public Exposure Review request";
    case BOUNDED_WORKFLOW_REVIEW_INTENT:
      return "Agent Risk & Control Review request";
    case CUSTOMER_SECURITY_REVIEW_SPRINT_INTENT:
      return "Customer Security Review Sprint request";
    case ONE_SERVER_SECURITY_CHECK_INTENT:
      return "One Server Security Check request";
    case LAUNCH_READINESS_CHECK_INTENT:
      return "Launch Readiness Check request";
    case KEY_ACCESS_CUSTODY_REVIEW_INTENT:
      return "Key, Access and Custody Review request";
    case INCIDENT_READINESS_REVIEW_INTENT:
      return "Incident Readiness Review request";
    case PROFESSIONAL_PUBLIC_FOOTPRINT_AUDIT_INTENT:
      return "Professional Public Footprint Audit request";
    case ASK_AI_CONTACT_INTENT:
      return "Ask WitnessOps follow-up request";
    default:
      return "security-workflow package request";
  }
}
