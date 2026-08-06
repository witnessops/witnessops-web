import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_OIDC_TRANSACTION_COOKIE_NAME } from "@/lib/server/admin-google-oidc";
import { ADMIN_OIDC_STATE_COOKIE_NAME } from "@/lib/server/admin-oidc";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/server/admin-session";

function usesSecureCookies(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") {
    return true;
  }

  const hostname = request.nextUrl.hostname.toLowerCase();
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1";
  return request.nextUrl.protocol !== "http:" || !isLoopback;
}

export async function POST(request: NextRequest) {
  const url = new URL("/admin/login", request.url);
  const secure = usesSecureCookies(request);

  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(ADMIN_OIDC_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(GOOGLE_OIDC_TRANSACTION_COOKIE_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/admin/google",
    maxAge: 0,
  });
  return response;
}
