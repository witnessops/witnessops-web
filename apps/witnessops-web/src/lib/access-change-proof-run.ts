import {
  AI_AGENT_ACTION_PROOF_RUN_INTENT,
  MANUAL_COMMERCIAL_POST_VERIFY_PATH,
  getCommercialRequestLabel,
  isManualCommercialRequestIntent,
} from "./commercial-request-intents";

export * from "./commercial-request-intents";

// Backward-compatible proof-run names. The canonical classifier now describes
// the wider manual commercial lane used by proof runs, reviews, and Ask.
export const PROOF_RUN_POST_VERIFY_PATH = MANUAL_COMMERCIAL_POST_VERIFY_PATH;

// Backward-compatible export for the existing access-change offer.
export const ACCESS_CHANGE_POST_VERIFY_PATH = PROOF_RUN_POST_VERIFY_PATH;

export function isAiAgentActionProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return intent?.trim() === AI_AGENT_ACTION_PROOF_RUN_INTENT;
}

export function isManualProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return isManualCommercialRequestIntent(intent);
}

// Legacy call sites use this name to decide whether an intake should stay on
// the mailbox-only proof-run confirmation path instead of entering the older
// assessment flow. Keep the exported name until those call sites are renamed.
export function isAccessChangeProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return isManualCommercialRequestIntent(intent);
}

export function getProofRunRequestLabel(
  intent: string | null | undefined,
): string {
  return getCommercialRequestLabel(intent);
}
