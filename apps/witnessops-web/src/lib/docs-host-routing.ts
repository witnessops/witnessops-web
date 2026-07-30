/**
 * Docs routing helpers.
 *
 * Canonical English docs live on the apex site under `/docs` and `/docs/*`.
 * The legacy host docs.witnessops.com permanently redirects to apex `/docs…`.
 */

export const DEFAULT_DOCS_HOST = "docs.witnessops.com";
export const DEFAULT_APEX_HOST = "witnessops.com";

export function normalizeHost(host: string | null) {
  return host?.split(":")[0].toLowerCase() ?? "";
}

/** Apex marketing hosts that serve the main WitnessOps app (including /docs). */
export function isApexMarketingHost(host: string, apexHost: string): boolean {
  const h = normalizeHost(host);
  const apex = normalizeHost(apexHost);
  if (!h || !apex) return false;
  return h === apex || h === `www.${apex}`;
}

export function isDocsHost(host: string, docsHost = DEFAULT_DOCS_HOST): boolean {
  return normalizeHost(host) === normalizeHost(docsHost);
}

/**
 * Public browser path for a doc slug. Always uses the `/docs` prefix on apex.
 */
export function getPublicDocPath(
  slug: string[],
  opts: { host?: string; docsHost?: string } = {},
): string {
  void opts;
  const internal =
    slug.length === 0 ? "/docs" : `/docs/${slug.filter(Boolean).join("/")}`;
  return toPublicDocsHref(internal);
}

/**
 * Convert an internal `/docs/...` href for public use.
 * With apex-only docs, public paths keep the `/docs` prefix (no short-path host).
 */
export function toPublicDocsHref(
  href: string,
  _host?: string,
  _docsHost = DEFAULT_DOCS_HOST,
): string {
  void _host;
  void _docsHost;
  return href;
}

/** Normalize pathname for active-link compare across short vs /docs forms. */
export function normalizeDocsPathname(pathname: string): string {
  const bare = pathname.replace(/\/$/, "") || "/";
  if (bare === "/docs") return "/docs";
  if (bare.startsWith("/docs/")) return bare;
  // Legacy short paths (from old docs host) map into /docs space for compare.
  if (bare === "/") return "/docs";
  return bare.startsWith("/") ? `/docs${bare}` : `/docs/${bare}`;
}

export function docsPathsMatch(pathname: string, href: string): boolean {
  return normalizeDocsPathname(pathname) === normalizeDocsPathname(href);
}

export function stripDocsPrefix(pathname: string) {
  if (pathname === "/docs" || pathname === "/docs/") {
    return "/";
  }

  if (pathname.startsWith("/docs/")) {
    return pathname.slice("/docs".length);
  }

  return null;
}

/**
 * @deprecated Apex no longer redirects away from /docs. Always returns null.
 * Kept for import compatibility during the migration.
 */
export function apexDocsRedirectLocation(
  _pathname: string,
  _search: string,
  _targetDocsHost: string,
): string | null {
  void _pathname;
  void _search;
  void _targetDocsHost;
  return null;
}

/**
 * Permanent Location for legacy docs.witnessops.com → apex /docs…
 * Short paths on the old host become /docs + path on the apex.
 */
export function legacyDocsHostRedirectLocation(
  pathname: string,
  search: string,
  apexHost: string = DEFAULT_APEX_HOST,
): string {
  const apex = normalizeHost(apexHost) || DEFAULT_APEX_HOST;

  if (pathname === "/support" || pathname.startsWith("/support/")) {
    return `https://${apex}${pathname}${search}`;
  }

  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    return `https://${apex}${pathname}${search}`;
  }

  if (pathname === "/" || pathname === "") {
    return `https://${apex}/docs${search}`;
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `https://${apex}/docs${path}${search}`;
}
