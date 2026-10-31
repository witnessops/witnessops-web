/**
 * Public chat ships with this source release. Deployment remains a separate
 * operator decision; preview flags do not publish internal review controls.
 * Non-production pages retain their existing explicit preview opt-in.
 */
export function sovereignAssistantPublished(): boolean {
  return process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_WO_PREVIEW === "1";
}

/** The internal review rail stays off in every production build. */
export function sovereignNeedsReviewVisible(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE === "1";
}
