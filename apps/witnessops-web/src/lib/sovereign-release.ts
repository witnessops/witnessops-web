/** The assistant stays unpublished until a separate release GO. */
export function sovereignAssistantPublished(): boolean {
  return process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE === "1" || process.env.NEXT_PUBLIC_WO_PREVIEW === "1";
}

/** The internal review rail stays hidden until that same release GO. */
export function sovereignNeedsReviewVisible(): boolean {
  return process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE === "1";
}
