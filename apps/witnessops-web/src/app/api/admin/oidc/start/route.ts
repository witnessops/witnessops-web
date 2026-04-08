import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_OIDC_STATE_COOKIE_NAME,
  buildAdminOidcAuthorizationUrl,
  createAdminOidcStateCookie,
  readAdminOidcConfig,
} from "@/lib/server/admin-oidc";

export async function GET(request: NextRequest) {
  const config = readAdminOidcConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Admin OIDC is not configured." },
      { status: 503 },
    );
  }

  const { state, nonce, cookieValue } = await createAdminOidcStateCookie();
  const response = NextResponse.redirect(
    buildAdminOidcAuthorizationUrl(config, state, nonce),
    302,
  );
  response.cookies.set(ADMIN_OIDC_STATE_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  response.headers.set("x-admin-login-path", loginUrl.pathname);
  return response;
}
