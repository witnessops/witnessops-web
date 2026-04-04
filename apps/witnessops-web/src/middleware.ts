import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSurface } from "@witnessops/config";

import {
  isLocalAdminRequest,
  verifyAdminSessionCookie,
} from "@/lib/server/admin-session";

const surface = getSurface("witnessops");
const primaryHost = surface?.hostname;
const docsHost = surface?.docsHost;

function normalizeHost(host: string | null) {
  return host?.split(":")[0].toLowerCase() ?? "";
}

function stripDocsPrefix(pathname: string) {
  if (pathname === "/docs" || pathname === "/docs/") {
    return "/";
  }

  if (pathname.startsWith("/docs/")) {
    return pathname.slice("/docs".length);
  }

  return null;
}

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

  if (host === primaryHost) {
    const docsPath = stripDocsPrefix(pathname);

    if (docsPath !== null) {
      return NextResponse.redirect(
        `https://${docsHost}${docsPath}${search}`,
        308,
      );
    }
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
