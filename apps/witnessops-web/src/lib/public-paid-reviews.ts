/**
 * Founder-approved Two-Offer V1 discovery policy, amended 2026-10-08.
 *
 * This is a projection, not a replacement for the historical buyer registry.
 * Do not use it to prune routes, sitemap entries, issued terms or old records.
 * Service IDs are not interchangeable with offerId/productId request fields.
 */
/**
 * New-sale identity adopted on 2026-10-08 for the fixed EUR 2,500
 * Agent Action Security Review. Distinct from both historical
 * bounded-workflow-review and the inventory-based agent-tools-access-review.
 * This selector does not activate intake or change issued terms by itself.
 */
export const PUBLIC_AGENT_ACTION_REVIEW_ID = "agent-action-security-review" as const;

export const PUBLIC_PAID_REVIEW_IDS = [
  PUBLIC_AGENT_ACTION_REVIEW_ID,
  "external-exposure-assessment",
] as const;

export type PublicPaidReviewId = (typeof PUBLIC_PAID_REVIEW_IDS)[number];

export function isPublicPaidReviewId(value: unknown): value is PublicPaidReviewId {
  return typeof value === "string" && PUBLIC_PAID_REVIEW_IDS.some((id) => id === value);
}

/** Preserve the canonical source objects and fail on missing/ambiguous identities. */
export function publicPaidReviews<T extends { id: string }>(
  services: readonly T[],
): readonly T[] {
  return PUBLIC_PAID_REVIEW_IDS.map((id) => {
    const matches = services.filter((service) => service.id === id);
    const match = matches[0];
    if (matches.length !== 1 || !match) {
      throw new Error(`Expected exactly one public paid review: ${id}`);
    }
    return match;
  });
}
