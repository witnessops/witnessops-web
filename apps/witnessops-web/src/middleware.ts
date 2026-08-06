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

  // Apex (and www): serve /docs in-app. No redirect to docs.witnessops.com.
  return NextResponse.next();
}

export const config = {
  matcher: [
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
