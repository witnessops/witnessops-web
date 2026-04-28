import { NextResponse } from "next/server";

import {
  verifyTokenRequestSchema,
  type VerifyTokenResponse,
  verifyTokenResponseSchema,
} from "@/lib/token-contract";
import {
  CLAIMANT_SESSION_COOKIE_NAME,
  claimantSessionCookieOptions,
  createClaimantSessionCookieValue,
} from "@/lib/server/claimant-session";
import { verifyIssuedToken } from "@/lib/server/token-issuance";

export const runtime = "nodejs";

function invalidRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function readPublicOrigin(request: Request): URL {
  const configuredOrigin =
    process.env.WITNESSOPS_VERIFY_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_OS_SITE_URL?.trim();

  return new URL(configuredOrigin || request.url);
}

async function handleVerification(
  payload: unknown,
): Promise<VerifyTokenResponse | NextResponse> {
  const parsed = verifyTokenRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return invalidRequest("issuanceId, email, and token are required.");
  }

  try {
    const verified = await verifyIssuedToken(parsed.data);
    return verifyTokenResponseSchema.parse(verified);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token verification failed.";
    return invalidRequest(message, 400);
  }
}

export async function POST(request: Request) {
  try {
    const result = await handleVerification(await request.json());
    if (result instanceof NextResponse) return result;
    const response = NextResponse.json(result);
    response.cookies.set(
      CLAIMANT_SESSION_COOKIE_NAME,
      createClaimantSessionCookieValue({
        issuanceId: result.issuanceId,
        email: result.email,
      }),
      claimantSessionCookieOptions(request.url),
    );
    return response;
  } catch {
    return invalidRequest("Invalid request body.");
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicOrigin = readPublicOrigin(request);
  const confirmationUrl = new URL("/verify-token", publicOrigin);

  for (const key of ["issuanceId", "email", "token"]) {
    const value = searchParams.get(key);
    if (value) {
      confirmationUrl.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(confirmationUrl, { status: 302 });
}
