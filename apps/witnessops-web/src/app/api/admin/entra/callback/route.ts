import { NextRequest, NextResponse } from "next/server";

import { buildAdminPublicUrl } from "@/lib/admin-auth-origin";
import {
  ENTRA_AUTH_FAILED_ERROR,
  ENTRA_OIDC_TRANSACTION_COOKIE_NAME,
  ENTRA_OIDC_TRANSACTION_COOKIE_PATH,
  EntraAdminOidcError,
  verifyEntraOidcCode,
  verifyEntraOidcTransactionCookie,
  type VerifiedEntraOidcTransaction,
} from "@/lib/server/admin-entra-oidc";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionCookie,
} from "@/lib/server/admin-session";
import { adminRoleFromEnvironment } from "@/lib/server/admin-authorization";
import { requireAdminSessionStorage } from "@/lib/server/admin-session-revocation";

const MAX_CALLBACK_BODY_BYTES = 16 * 1024;
const MAX_CALLBACK_PARAMETERS = 16;
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

function equalOpaqueValues(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function clearTransactionCookie(response: NextResponse): void {
  response.cookies.set(ENTRA_OIDC_TRANSACTION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: ENTRA_OIDC_TRANSACTION_COOKIE_PATH,
    maxAge: 0,
  });
}

function failedCallback(
  request: NextRequest,
  diagnosticCode: string,
): NextResponse {
  console.warn(`[admin-entra-oidc] ${diagnosticCode}`);
  const loginUrl = buildAdminPublicUrl("/admin/login", request);
  loginUrl.searchParams.set("error", ENTRA_AUTH_FAILED_ERROR);
  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  clearTransactionCookie(response);
  return response;
}

async function readCallbackParameters(
  request: NextRequest,
): Promise<URLSearchParams> {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/x-www-form-urlencoded") {
    throw new Error("callback_content_type_invalid");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAX_CALLBACK_BODY_BYTES
    ) {
      throw new Error("callback_body_invalid");
    }
  }

  if (!request.body) {
    throw new Error("callback_body_missing");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_CALLBACK_BODY_BYTES) {
      await reader.cancel();
      throw new Error("callback_body_too_large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(body);
  const parameters = new URLSearchParams(decoded);
  if ([...parameters].length > MAX_CALLBACK_PARAMETERS) {
    throw new Error("callback_parameters_excessive");
  }
  return parameters;
}

function singleParameter(
  parameters: URLSearchParams,
  name: string,
): string | null {
  const values = parameters.getAll(name);
  if (values.length > 1) {
    throw new Error("callback_parameter_duplicate");
  }
  return values[0] ?? null;
}

export async function POST(request: NextRequest) {
  let parameters: URLSearchParams;
  try {
    parameters = await readCallbackParameters(request);
  } catch {
    return failedCallback(request, "callback_request_invalid");
  }

  let state: string | null;
  let providerError: string | null;
  let code: string | null;
  try {
    state = singleParameter(parameters, "state");
    providerError = singleParameter(parameters, "error");
    code = singleParameter(parameters, "code");
  } catch {
    return failedCallback(request, "callback_parameter_invalid");
  }

  const stateCookie = request.cookies.get(
    ENTRA_OIDC_TRANSACTION_COOKIE_NAME,
  )?.value;

  if (!state || !stateCookie) {
    return failedCallback(request, "callback_state_missing");
  }

  let transaction: VerifiedEntraOidcTransaction;
  try {
    transaction = await verifyEntraOidcTransactionCookie(stateCookie);
  } catch (error) {
    const diagnosticCode =
      error instanceof EntraAdminOidcError
        ? error.code
        : "callback_state_invalid";
    return failedCallback(request, diagnosticCode);
  }
  if (!equalOpaqueValues(transaction.state, state)) {
    return failedCallback(request, "callback_state_invalid");
  }

  if (providerError) {
    return failedCallback(
      request,
      providerError === "access_denied"
        ? "provider_access_denied"
        : "provider_callback_error",
    );
  }

  if (!code) {
    return failedCallback(request, "authorization_code_missing");
  }

  try {
    const identity = await verifyEntraOidcCode(code, transaction);
    await requireAdminSessionStorage();
    const issuedAt = Date.now();
    const sessionCookie = await createAdminSessionCookie({
      version: 4,
      identityProvider: "microsoft",
      issuer: identity.issuer,
      subject: identity.subject,
      actor: identity.actor,
      actorAuthSource: "oidc_session",
      actorSessionHash: identity.sessionHash,
      role: adminRoleFromEnvironment(),
      iat: issuedAt,
      exp: issuedAt + SESSION_LIFETIME_MS,
    });

    const response = NextResponse.redirect(
      buildAdminPublicUrl(transaction.returnTo, request),
      303,
    );
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 28_800,
    });
    clearTransactionCookie(response);
    return response;
  } catch (error) {
    const diagnosticCode =
      error instanceof EntraAdminOidcError ? error.code : "callback_failed";
    return failedCallback(request, diagnosticCode);
  }
}
