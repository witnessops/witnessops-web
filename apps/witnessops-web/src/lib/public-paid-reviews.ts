/**
 * Founder-approved Two-Offer V1 discovery policy.
 *
 * This is a projection, not a replacement for the historical buyer registry.
 * Do not use it to prune routes, sitemap entries, issued terms or old records.
 * Service IDs are not interchangeable with offerId/productId request fields.
 */
export const PUBLIC_PAID_REVIEW_IDS = [
  "agent-tools-access-review",
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
