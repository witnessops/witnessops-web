import { NextRequest, NextResponse } from "next/server";

import { createAdminSessionCookie, ADMIN_SESSION_COOKIE_NAME } from "@/lib/server/admin-session";
import {
  ADMIN_OIDC_STATE_COOKIE_NAME,
  verifyAdminOidcCode,
  verifyAdminOidcStateCookie,
} from "@/lib/server/admin-oidc";

function redirectToLogin(request: NextRequest, diagnosticCode: string) {
  console.warn(`[admin-microsoft-oidc] ${diagnosticCode}`);
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("error", "microsoft_auth_failed");
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(ADMIN_OIDC_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const stateCookie = request.cookies.get(ADMIN_OIDC_STATE_COOKIE_NAME)?.value;

  if (!state || !code || !stateCookie) {
    return redirectToLogin(request, "callback_state_missing");
  }

  const parsedState = await verifyAdminOidcStateCookie(stateCookie);
  if (!parsedState || parsedState.state !== state) {
    return redirectToLogin(request, "callback_state_invalid");
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
  } catch {
    return redirectToLogin(request, "callback_failed");
  }
}
