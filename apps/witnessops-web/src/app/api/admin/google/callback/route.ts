import { NextRequest, NextResponse } from "next/server";

import {
  GOOGLE_OIDC_TRANSACTION_COOKIE_NAME,
  GoogleAdminOidcError,
  verifyGoogleOidcCode,
  verifyGoogleOidcTransactionCookie,
  type VerifiedGoogleOidcTransaction,
} from "@/lib/server/admin-google-oidc";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionCookie,
} from "@/lib/server/admin-session";

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

function equalOpaqueValues(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function clearTransactionCookie(
  response: NextResponse,
  request: NextRequest,
): void {
  response.cookies.set(GOOGLE_OIDC_TRANSACTION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: usesSecureCookies(request),
    sameSite: "lax",
    path: "/api/admin/google",
    maxAge: 0,
  });
}

function failedCallback(
  request: NextRequest,
  diagnosticCode: string,
): NextResponse {
  console.warn(`[admin-google-oidc] ${diagnosticCode}`);
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("error", "google_auth_failed");
  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  clearTransactionCookie(response, request);
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get(
    GOOGLE_OIDC_TRANSACTION_COOKIE_NAME,
  )?.value;

  if (!state || !stateCookie) {
    return failedCallback(request, "callback_state_missing");
  }

  let transaction: VerifiedGoogleOidcTransaction;
  try {
    transaction = await verifyGoogleOidcTransactionCookie(stateCookie);
  } catch (error) {
    const diagnosticCode =
      error instanceof GoogleAdminOidcError
        ? error.code
        : "callback_state_invalid";
    return failedCallback(request, diagnosticCode);
  }
  if (!equalOpaqueValues(transaction.state, state)) {
    return failedCallback(request, "callback_state_invalid");
  }

  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    return failedCallback(
      request,
      providerError === "access_denied"
        ? "provider_access_denied"
        : "provider_callback_error",
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return failedCallback(request, "authorization_code_missing");
  }

  try {
    const identity = await verifyGoogleOidcCode(code, transaction);
    const sessionCookie = await createAdminSessionCookie({
      actor: identity.actor,
      actorAuthSource: "oidc_session",
      actorSessionHash: identity.sessionHash,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    });

    const response = NextResponse.redirect(
      new URL(transaction.returnTo, request.url),
      303,
    );
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: usesSecureCookies(request),
      sameSite: "strict",
      path: "/",
      maxAge: 28_800,
    });
    clearTransactionCookie(response, request);
    return response;
  } catch (error) {
    const diagnosticCode =
      error instanceof GoogleAdminOidcError ? error.code : "callback_failed";
    return failedCallback(request, diagnosticCode);
  }
}
