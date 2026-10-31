/**
 * Historical public URLs omitted from the sitemap, internal docs search, and
 * the Ask WitnessOps public source index. The workflows and customer security
 * review URLs are middleware-owned 410 withdrawal responses; the other entries
 * remain reachable historical or parked pages with noindex copy. robots.txt
 * does not Disallow these URLs.
 */
export const HISTORICAL_UNINDEXED_PUBLIC_PATHS = [
  "/catalog/workflows",
  "/catalog/professional-public-footprint-audit",
  "/pl/catalog/professional-public-footprint-audit",
  "/customer-security-review",
  "/pl/customer-security-review",
  "/catalog/offsec-external-exposure",
  "/pl/catalog/offsec-external-exposure",
  "/reviews/external-attack-surface-review",
  "/pl/reviews/external-attack-surface-review",
  "/review/sample-cases/external-exposure-assessment",
] as const;

export function isHistoricallyUnindexedPublicPath(value: string): boolean {
  const path = publicPathname(value);
  return HISTORICAL_UNINDEXED_PUBLIC_PATHS.some(
    (route) => path === route || path === `${route}/`,
  );
}

function publicPathname(value: string): string {
  if (value.startsWith("/")) return value.split(/[?#]/)[0] ?? value;
  try {
    return new URL(value).pathname;
  } catch {
    return value;
  }
}
