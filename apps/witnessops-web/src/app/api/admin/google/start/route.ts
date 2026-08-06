import { NextRequest, NextResponse } from "next/server";

import { buildAdminPublicUrl } from "@/lib/admin-auth-origin";
import {
  GOOGLE_OIDC_TRANSACTION_COOKIE_NAME,
  GoogleAdminOidcError,
  buildGoogleOidcAuthorizationUrl,
  createGoogleOidcTransaction,
  readGoogleAdminOidcConfig,
} from "@/lib/server/admin-google-oidc";

function clearTransactionCookie(
  response: NextResponse,
): void {
  response.cookies.set(GOOGLE_OIDC_TRANSACTION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/api/admin/google",
    maxAge: 0,
  });
}

function unavailableResponse(
  request: NextRequest,
  diagnosticCode: string,
): NextResponse {
  console.warn(`[admin-google-oidc] ${diagnosticCode}`);
  const loginUrl = buildAdminPublicUrl("/admin/login", request);
  loginUrl.searchParams.set("error", "google_auth_unavailable");
  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  clearTransactionCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const config = readGoogleAdminOidcConfig();
    if (!config) {
      return unavailableResponse(request, "configuration_missing");
    }

    const transaction = await createGoogleOidcTransaction(
      request.nextUrl.searchParams.get("returnTo"),
    );
    const authorizationUrl = buildGoogleOidcAuthorizationUrl(
      config,
      transaction,
    );
    const response = NextResponse.redirect(authorizationUrl, 302);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(
      GOOGLE_OIDC_TRANSACTION_COOKIE_NAME,
      transaction.cookieValue,
      {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/api/admin/google",
        maxAge: 600,
      },
    );
    return response;
  } catch (error) {
    const diagnosticCode =
      error instanceof GoogleAdminOidcError ? error.code : "start_failed";
    return unavailableResponse(request, diagnosticCode);
  }
}
