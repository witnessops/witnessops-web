import { NextResponse } from "next/server";

import {
  ClaimantActionError,
  disagreeWithClaimantScope,
} from "@/lib/server/claimant-actions";
import { isClaimantSessionAuthorized } from "@/lib/server/claimant-session";
import {
  PUBLIC_JSON_BODY_LIMIT_BYTES,
  readBoundedRequestJson,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface RouteContext {
  params: Promise<{ issuanceId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { issuanceId } = await params;

  let body: { email?: unknown; reason?: unknown };
  try {
    body = (await readBoundedRequestJson(
      request,
      PUBLIC_JSON_BODY_LIMIT_BYTES,
    )) as typeof body;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return invalid("Request body is too large.", 413);
    }
    return invalid("Invalid request body.", 400);
  }

  const email = typeof body.email === "string" ? body.email : "";
  const reason = typeof body.reason === "string" ? body.reason : "";

  if (!email) {
    return invalid("email is required.", 400);
  }
  if (!isClaimantSessionAuthorized(request, { issuanceId, email })) {
    return invalid("Claimant session is required.", 401);
  }

  try {
    const result = await disagreeWithClaimantScope({
      issuanceId,
      email,
      reason,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ClaimantActionError) {
      return invalid(error.message, error.status);
    }
    const message =
      error instanceof Error ? error.message : "Disagree failed.";
    return invalid(message, 500);
  }
}
