import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSurface } from "@witnessops/config";
import { buildAdminPublicUrl } from "@/lib/admin-auth-origin";

import {
  isLocalAdminRequest,
  verifyAdminSessionCookie,
} from "@/lib/server/admin-session";
import {
  legacyDocsHostRedirectLocation,
  normalizeHost,
} from "@/lib/docs-host-routing";
import {
  DOCUMENT_LANGUAGE_HEADER,
  documentLanguageForPathname,
} from "@/lib/request-language";

const surface = getSurface("witnessops");
const primaryHost = surface?.hostname ?? "witnessops.com";
const docsHost = surface?.docsHost ?? "docs.witnessops.com";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin route protection (skip login page)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isLocalAdminRequest(request)) {
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
