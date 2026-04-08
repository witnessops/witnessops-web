import { NextRequest, NextResponse } from "next/server";

import { createAdminSessionCookie, ADMIN_SESSION_COOKIE_NAME } from "@/lib/server/admin-session";
import {
  ADMIN_OIDC_STATE_COOKIE_NAME,
  verifyAdminOidcCode,
  verifyAdminOidcStateCookie,
} from "@/lib/server/admin-oidc";

function redirectToLogin(request: NextRequest, error: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const stateCookie = request.cookies.get(ADMIN_OIDC_STATE_COOKIE_NAME)?.value;

  if (!state || !code || !stateCookie) {
    return redirectToLogin(request, "oidc_missing_callback_state");
  }

  const parsedState = await verifyAdminOidcStateCookie(stateCookie);
  if (!parsedState || parsedState.state !== state) {
    return redirectToLogin(request, "oidc_invalid_state");
  }

  try {
    const identity = await verifyAdminOidcCode(code, parsedState.nonce);
    const sessionCookie = await createAdminSessionCookie({
      actor: identity.actor,
      actorAuthSource: "oidc_session",
      actorSessionHash: identity.sessionHash,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    });

    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";

    const response = NextResponse.redirect(url, 303);
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 28800,
    });
    response.cookies.set(ADMIN_OIDC_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    const response = redirectToLogin(
      request,
      error instanceof Error ? error.message : "oidc_auth_failed",
    );
    response.cookies.set(ADMIN_OIDC_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
