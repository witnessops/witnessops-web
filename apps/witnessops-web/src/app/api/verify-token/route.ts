import { NextResponse } from "next/server";

import {
  verifyTokenRequestSchema,
  verifyTokenContextRequestSchema,
  type VerifyTokenResponse,
  verifyTokenResponseSchema,
} from "@/lib/token-contract";
import {
  claimantSessionCookieName,
  claimantSessionCookieOptions,
  createClaimantSessionCookieValue,
} from "@/lib/server/claimant-session";
import {
  verifyIssuedToken,
  verifyIssuedTokenWithContext,
} from "@/lib/server/token-issuance";
import { PUBLIC_JSON_BODY_LIMIT_BYTES, readBoundedRequestJson, RequestBodyTooLargeError } from "@/lib/server/bounded-request-body";

export const runtime = "nodejs";

const verificationResponseHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
} as const;

function invalidRequest(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: verificationResponseHeaders },
  );
}

async function handleVerification(
  payload: unknown,
): Promise<VerifyTokenResponse | NextResponse> {
  const contextRequest = verifyTokenContextRequestSchema.safeParse(payload);
  if (contextRequest.success) {
    try {
      return verifyTokenResponseSchema.parse(
        await verifyIssuedTokenWithContext(contextRequest.data),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Token verification failed.";
      return invalidRequest(message, 400);
    }
  }

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
    const result = await handleVerification(
      await readBoundedRequestJson(request, PUBLIC_JSON_BODY_LIMIT_BYTES),
    );
    if (result instanceof NextResponse) return result;
    const response = NextResponse.json(result, {
      headers: verificationResponseHeaders,
    });
    response.cookies.set(
      claimantSessionCookieName(result.issuanceId),
      createClaimantSessionCookieValue({
        issuanceId: result.issuanceId,
        email: result.email,
      }),
      claimantSessionCookieOptions(request.url),
    );
    return response;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return invalidRequest("Request body is too large.", 413);
    }
    return invalidRequest("Invalid request body.");
  }
}

export async function GET(request: Request) {
  void request;
  return NextResponse.json(
    { ok: false, error: "Use POST to verify a mailbox code." },
    {
      status: 405,
      headers: {
        Allow: "POST",
        ...verificationResponseHeaders,
      },
    },
  );
}
