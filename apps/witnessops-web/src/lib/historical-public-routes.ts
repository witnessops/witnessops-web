/**
 * Historical offer pages that stay reachable by URL and carry a historical
 * record banner. They are omitted from the sitemap, internal docs search,
 * and the Ask WitnessOps public source index. robots.txt does not Disallow
 * them; each page sets robots { index: false, follow: true }.
 */
export const HISTORICAL_UNINDEXED_PUBLIC_PATHS = [
  "/catalog/workflows",
  "/catalog/professional-public-footprint-audit",
  "/pl/catalog/professional-public-footprint-audit",
  "/customer-security-review",
  "/pl/customer-security-review",
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
