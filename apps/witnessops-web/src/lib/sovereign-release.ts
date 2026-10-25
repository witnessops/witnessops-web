/**
 * Preview publication is a non-production decision.
 *
 * NEXT_PUBLIC_WO_PREVIEW and NEXT_PUBLIC_SOVEREIGN_RELEASE are pinned in
 * next.config.js `env` (default "0"). A production bundle therefore does not
 * keep a live lookup of either flag. The NODE_ENV check below is the server
 * gate: a production build stays closed even if a container sets those
 * variables only at runtime.
 *
 * The release flag does not publish the assistant, the review rail, the
 * simulated labels, or POST /api/ask-witnessops. Opening any of those in
 * production is a later code change after an explicit release GO.
 *
 * ?sim switches are dev-only. See previewTriggersEnabled().
 */
export function sovereignAssistantPublished(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_WO_PREVIEW === "1";
}

/** The internal review rail stays off in production, including when the release flag is set. */
export function sovereignNeedsReviewVisible(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE === "1";
}

/**
 * The Ask WitnessOps handler stays in the source. Production builds answer
 * 410 before it runs. The preview flag and the release flag cannot reopen it.
 */
export function askWitnessOpsRouteAvailable(): boolean {
  return process.env.NODE_ENV !== "production";
}
