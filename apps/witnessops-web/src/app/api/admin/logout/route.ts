import { NextRequest, NextResponse } from "next/server";
import { ADMIN_OIDC_STATE_COOKIE_NAME } from "@/lib/server/admin-oidc";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/server/admin-session";

export async function POST(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";

  const response = NextResponse.redirect(url, 303);
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(ADMIN_OIDC_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
