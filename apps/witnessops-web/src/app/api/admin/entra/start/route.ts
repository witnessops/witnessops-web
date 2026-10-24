import { NextRequest, NextResponse } from "next/server";

import { buildAdminPublicUrl } from "@/lib/admin-auth-origin";
import {
  ENTRA_NOT_CONFIGURED_ERROR,
  ENTRA_OIDC_TRANSACTION_COOKIE_NAME,
  ENTRA_OIDC_TRANSACTION_COOKIE_PATH,
  ENTRA_OIDC_TRANSACTION_MAX_AGE_SECONDS,
  EntraAdminOidcError,
  buildEntraOidcAuthorizationUrl,
  createEntraOidcTransaction,
  isAdminEntraEnabled,
  readEntraAdminOidcConfig,
} from "@/lib/server/admin-entra-oidc";

function clearTransactionCookie(response: NextResponse): void {
  response.cookies.set(ENTRA_OIDC_TRANSACTION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: ENTRA_OIDC_TRANSACTION_COOKIE_PATH,
    maxAge: 0,
  });
}

function notConfiguredResponse(
  request: NextRequest,
  diagnosticCode: string,
): NextResponse {
  console.warn(`[admin-entra-oidc] ${diagnosticCode}`);
  const loginUrl = buildAdminPublicUrl("/admin/login", request);
  loginUrl.searchParams.set("error", ENTRA_NOT_CONFIGURED_ERROR);
  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  clearTransactionCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminEntraEnabled()) {
      return notConfiguredResponse(request, "flag_disabled");
    }
    const config = readEntraAdminOidcConfig();
    if (!config) {
      return notConfiguredResponse(request, "not_configured");
    }

    const transaction = await createEntraOidcTransaction(
      request.nextUrl.searchParams.get("returnTo"),
    );
    const authorizationUrl = buildEntraOidcAuthorizationUrl(
      config,
      transaction,
    );
    const response = NextResponse.redirect(authorizationUrl, 302);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(
      ENTRA_OIDC_TRANSACTION_COOKIE_NAME,
      transaction.cookieValue,
      {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: ENTRA_OIDC_TRANSACTION_COOKIE_PATH,
        maxAge: ENTRA_OIDC_TRANSACTION_MAX_AGE_SECONDS,
      },
    );
    return response;
  } catch (error) {
    const diagnosticCode =
      error instanceof EntraAdminOidcError ? error.code : "start_failed";
    return notConfiguredResponse(request, diagnosticCode);
  }
}
