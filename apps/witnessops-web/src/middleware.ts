import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSurface } from "@witnessops/config";

import {
  isLocalAdminRequest,
  verifyAdminSessionCookie,
} from "@/lib/server/admin-session";
import {
  apexDocsRedirectLocation,
  isApexMarketingHost,
  normalizeHost,
  stripDocsPrefix,
} from "@/lib/docs-host-routing";

const surface = getSurface("witnessops");
const primaryHost = surface?.hostname;
const docsHost = surface?.docsHost;

function isWitnessOpsSupportPath(pathname: string) {
  return pathname === "/support" || pathname.startsWith("/support/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin route protection (skip login page)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isLocalAdminRequest(request)) {
      const sessionCookie = request.cookies.get(
        "witnessops-admin-session",
      )?.value;

      if (!sessionCookie || !(await verifyAdminSessionCookie(sessionCookie))) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Host-based docs routing
  if (!primaryHost || !docsHost) {
    return NextResponse.next();
  }

  const host = normalizeHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const { search } = request.nextUrl;

  if (host === docsHost) {
    if (isWitnessOpsSupportPath(pathname)) {
      return NextResponse.redirect(
        `https://${primaryHost}${pathname}${search}`,
        308,
      );
    }

    if (pathname === "/docs" || pathname.startsWith("/docs/")) {
      const canonicalPath = stripDocsPrefix(pathname) ?? "/";
      return NextResponse.redirect(
        `https://${docsHost}${canonicalPath}${search}`,
        308,
      );
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = pathname === "/" ? "/docs" : `/docs${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  // Apex (and www): send English docs to the canonical docs host so human
  // path, robots, sitemap, and rel=canonical share one authority.
  if (isApexMarketingHost(host, primaryHost)) {
    const location = apexDocsRedirectLocation(pathname, search, docsHost);
    if (location) {
      return NextResponse.redirect(location, 308);
    }
  }

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
  normalizeHost,
  stripDocsPrefix,
} from "@/lib/docs-host-routing";
