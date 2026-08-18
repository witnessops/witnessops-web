const PRODUCTION_ADMIN_ORIGIN = "https://witnessops.com";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

interface AdminRequestUrl {
  nextUrl: {
    hostname: string;
    origin: string;
    protocol: string;
  };
}

export function getAdminPublicOrigin(request?: AdminRequestUrl): string {
  if (process.env.NODE_ENV !== "production" && request) {
    const hostname = request.nextUrl.hostname.toLowerCase();
    if (
      LOOPBACK_HOSTS.has(hostname) &&
      (request.nextUrl.protocol === "http:" ||
        request.nextUrl.protocol === "https:")
    ) {
      return request.nextUrl.origin;
    }
  }

  return PRODUCTION_ADMIN_ORIGIN;
}

export function buildAdminPublicUrl(
  path: string,
  request?: AdminRequestUrl,
): URL {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    throw new Error("Admin redirect path must be root-relative");
  }
  return new URL(path, getAdminPublicOrigin(request));
}

function originFromCandidate(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    if (url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Same-origin gate for cookie-clearing admin mutations.
 * Prefer Origin; fall back to Referer. Missing both is rejected.
 */
export function isTrustedAdminMutationOrigin(
  request: AdminRequestUrl & {
    headers: { get(name: string): string | null };
  },
): boolean {
  const expectedOrigin = getAdminPublicOrigin(request);
  const originHeader = request.headers.get("origin");
  if (originHeader !== null && originHeader !== "") {
    return originFromCandidate(originHeader) === expectedOrigin;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return false;
  }
  return originFromCandidate(referer) === expectedOrigin;
}
