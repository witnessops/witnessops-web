export const AI_AGENT_ACTION_PROOF_RUN_INTENT =
  "ai-agent-action-proof-run" as const;

export const ACCESS_CHANGE_PROOF_RUN_INTENT =
  "access-change-proof-run" as const;

export const PROOF_RUN_POST_VERIFY_PATH = "/review/request/confirmed" as const;

// Backward-compatible export for the existing access-change offer while the
// primary public request lane is AI Agent Action Proof Run.
export const ACCESS_CHANGE_POST_VERIFY_PATH = PROOF_RUN_POST_VERIFY_PATH;

export function isAiAgentActionProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return intent?.trim() === AI_AGENT_ACTION_PROOF_RUN_INTENT;
}

export function isAccessChangeProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return intent?.trim() === ACCESS_CHANGE_PROOF_RUN_INTENT;
}

export function isManualProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return (
    isAiAgentActionProofRunIntent(intent) ||
    isAccessChangeProofRunIntent(intent)
  );
}

export function getProofRunRequestLabel(
  intent: string | null | undefined,
): string {
  return isAccessChangeProofRunIntent(intent)
    ? "access-change proof-run request"
    : "AI-agent proof-run request";
}
