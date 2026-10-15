import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSurface } from "@witnessops/config";
import {
  buildAdminPublicUrl,
  isTrustedAdminMutationOrigin,
} from "@/lib/admin-auth-origin";

import {
  isTestAdminRequest,
  verifyAdminSessionCookie,
} from "@/lib/server/admin-session-cookie";
import {
  legacyDocsHostRedirectLocation,
  normalizeHost,
} from "@/lib/docs-host-routing";
import {
  DOCUMENT_LANGUAGE_HEADER,
  documentLanguageForPathname,
} from "@/lib/request-language";
import {
  isPolishOfferPath,
  isWithdrawnOfferPath,
} from "@/lib/withdrawn-offer-routes";

const surface = getSurface("witnessops");
const primaryHost = surface?.hostname ?? "witnessops.com";
const docsHost = surface?.docsHost ?? "docs.witnessops.com";
const OIDC_CALLBACK_PATH = "/api/admin/google/callback";
const SAFE_REQUEST_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isAdminApiMutation(request: NextRequest): boolean {
  return (
    request.nextUrl.pathname.startsWith("/api/admin/") &&
    request.nextUrl.pathname !== OIDC_CALLBACK_PATH &&
    !SAFE_REQUEST_METHODS.has(request.method.toUpperCase())
  );
}

const WITHDRAWN_SHELL_HEADER = "x-witnessops-withdrawn-shell";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Withdrawn offer pages stay in the repo. The public response is 410 and
  // reuses the rendered site shell from /withdrawn-offer.
  if (
    isWithdrawnOfferPath(pathname) &&
    request.headers.get(WITHDRAWN_SHELL_HEADER) !== "1"
  ) {
    const headers = {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
    };
    if (request.method === "HEAD") {
      return new NextResponse(null, { status: 410, headers });
    }
    const shell = request.nextUrl.clone();
    shell.pathname = isPolishOfferPath(pathname)
      ? "/pl/withdrawn-offer"
      : "/withdrawn-offer";
    shell.search = "";
    const rendered = await fetch(shell, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "text/html",
        [WITHDRAWN_SHELL_HEADER]: "1",
      },
      signal: AbortSignal.timeout(8000),
    });
    return new NextResponse(await rendered.arrayBuffer(), {
      status: 410,
      headers: {
        ...headers,
        "content-type":
          rendered.headers.get("content-type") ?? headers["content-type"],
      },
    });
  }

  // Cookie-authenticated admin mutations must originate from the exact admin
  // origin. The federated OIDC callback is independently protected by its
  // signed transaction cookie, state, nonce, and PKCE and must accept the
  // identity provider's cross-origin POST.
  if (
    isAdminApiMutation(request) &&
    !isTrustedAdminMutationOrigin(request)
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid request origin." },
      {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  // Edge prefilter only. Admin server pages and APIs enforce durable revocation.
  // Skip the public login page.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isTestAdminRequest()) {
      const sessionCookie = request.cookies.get(
        "witnessops-admin-session",
      )?.value;

      if (!sessionCookie || !(await verifyAdminSessionCookie(sessionCookie))) {
        const loginUrl = buildAdminPublicUrl("/admin/login", request);
        loginUrl.searchParams.set("returnTo", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  const host = normalizeHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const { search } = request.nextUrl;

  // Legacy docs subdomain: permanent redirect to apex /docs (how-to path).
  if (host && host === normalizeHost(docsHost)) {
    const location = legacyDocsHostRedirectLocation(
      pathname,
      search,
      primaryHost,
    );
    return NextResponse.redirect(location, 308);
  }

  const requestHeaders = new Headers(request.headers);
  // Always overwrite the client value; this selects a minimal isolated workspace shell.
  requestHeaders.set("x-witnessops-local-workspace", pathname === "/proofpack" ? "proofpack" : pathname === "/check" ? "external-check" : "none");
  requestHeaders.set(
    DOCUMENT_LANGUAGE_HEADER,
    documentLanguageForPathname(pathname),
  );

  // The edge proxy owns apex/www canonicalization. The app supplies the
  // initial-document language before React renders.
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Central request-origin gate for cookie-authenticated admin mutations.
    // The OIDC callback stays matched and is explicitly exempted above.
    "/api/admin/:path*",
    // Admin paths must never inherit the public static-file exclusion below:
    // receipt identifiers are external values and may legitimately contain a
    // period. API routes keep their own route-level session checks.
    "/admin/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};

// Re-export pure helpers for tests that import from middleware historically.
export {
  apexDocsRedirectLocation,
  isApexMarketingHost,
  legacyDocsHostRedirectLocation,
  normalizeHost,
  stripDocsPrefix,
} from "@/lib/docs-host-routing";
