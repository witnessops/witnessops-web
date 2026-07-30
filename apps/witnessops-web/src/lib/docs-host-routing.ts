/**
 * Pure docs dual-host routing helpers (apex vs docs.witnessops.com).
 * Used by middleware; unit-tested without Next admin session imports.
 */

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
