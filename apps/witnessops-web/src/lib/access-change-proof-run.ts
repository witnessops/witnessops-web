export const ACCESS_CHANGE_PROOF_RUN_INTENT = "access-change-proof-run" as const;

export const ACCESS_CHANGE_POST_VERIFY_PATH = "/review/request/confirmed" as const;

export function isAccessChangeProofRunIntent(
  intent: string | null | undefined,
): boolean {
  return intent?.trim() === ACCESS_CHANGE_PROOF_RUN_INTENT;
}
