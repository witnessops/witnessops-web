/**
 * Pure docs dual-host routing helpers (apex vs docs.witnessops.com).
 * Used by middleware and docs chrome; unit-tested without Next session imports.
 */

export const DEFAULT_DOCS_HOST = "docs.witnessops.com";

export function normalizeHost(host: string | null) {
  return host?.split(":")[0].toLowerCase() ?? "";
}

/** Apex marketing hosts that should not serve a second indexed docs tree. */
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
 * App-internal docs path always uses /docs prefix (Next app routes).
 * Public browser path on docs host omits /docs (middleware rewrites).
 */
export function getPublicDocPath(
  slug: string[],
  opts: { host?: string; docsHost?: string } = {},
): string {
  const internal =
    slug.length === 0 ? "/docs" : `/docs/${slug.filter(Boolean).join("/")}`;
  return toPublicDocsHref(internal, opts.host, opts.docsHost);
}

/** Convert an internal `/docs/...` href (or leave absolute/external hrefs). */
export function toPublicDocsHref(
  href: string,
  host?: string,
  docsHost = DEFAULT_DOCS_HOST,
): string {
  if (!href.startsWith("/docs")) {
    return href;
  }
  if (!host || !isDocsHost(host, docsHost)) {
    return href;
  }
  if (href === "/docs" || href === "/docs/") {
    return "/";
  }
  if (href.startsWith("/docs/")) {
    return href.slice("/docs".length);
  }
  return href;
}

/** Normalize pathname for active-link compare across short vs /docs forms. */
export function normalizeDocsPathname(pathname: string): string {
  const bare = pathname.replace(/\/$/, "") || "/";
  if (bare === "/docs") return "/";
  if (bare.startsWith("/docs/")) return bare.slice("/docs".length) || "/";
  return bare;
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
 * Permanent Location for apex `/docs` → docs host (path without `/docs` prefix).
 * Does not touch `/pl/docs` (localized marketing surface stays on apex).
 */
export function apexDocsRedirectLocation(
  pathname: string,
  search: string,
  targetDocsHost: string,
): string | null {
  if (pathname === "/pl/docs" || pathname.startsWith("/pl/docs/")) {
    return null;
  }

  if (pathname !== "/docs" && !pathname.startsWith("/docs/")) {
    return null;
  }

  const canonicalPath = stripDocsPrefix(pathname) ?? "/";
  const pathPart = canonicalPath === "/" ? "/" : canonicalPath;
  return `https://${normalizeHost(targetDocsHost)}${pathPart}${search}`;
}
