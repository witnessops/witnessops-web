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

export function isManualProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return (
    isAiAgentActionProofRunIntent(intent) ||
    intent?.trim() === ACCESS_CHANGE_PROOF_RUN_INTENT
  );
}

// Legacy call sites use this name to decide whether an intake should stay on
// the mailbox-only proof-run confirmation path instead of entering the older
// assessment flow. Keep the exported name until those call sites are renamed.
export function isAccessChangeProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return isManualProofRunIntent(intent);
}

export function getProofRunRequestLabel(
  intent: string | null | undefined,
): string {
  return intent?.trim() === ACCESS_CHANGE_PROOF_RUN_INTENT
    ? "access-change proof-run request"
    : "AI-agent proof-run request";
}
