import { NextResponse } from "next/server";

import {
  scopeApprovalRequestSchema,
  scopeApprovalResponseSchema,
} from "@/lib/token-contract";
import { isClaimantSessionAuthorized } from "@/lib/server/claimant-session";
import {
  PUBLIC_JSON_BODY_LIMIT_BYTES,
  readBoundedRequestJson,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";
import {
  approveScopeAndStartRecon,
  ScopeApprovalInputError,
} from "@/lib/server/token-issuance";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ issuanceId: string }> },
) {
  const { issuanceId } = await params;

  let body: unknown;
  try {
    body = await readBoundedRequestJson(request, PUBLIC_JSON_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return invalid("Request body is too large.", 413);
    }
    return invalid("Invalid request body.", 400);
  }

  const parsed = scopeApprovalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalid("email is required.", 400);
  }

  if (
    !isClaimantSessionAuthorized(request, {
      issuanceId,
      email: parsed.data.email,
    })
  ) {
    return invalid("Claimant session is required.", 401);
  }

  try {
    const response = await approveScopeAndStartRecon({
      issuanceId,
      email: parsed.data.email,
      approverName: parsed.data.approverName ?? null,
      approvalNote: parsed.data.approvalNote ?? null,
      source: "api/assessment/approve",
    });

    return NextResponse.json(scopeApprovalResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof ScopeApprovalInputError) {
      return invalid(error.message, 400);
    }
    console.error("Scope approval could not be completed", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return invalid("Scope approval could not be completed. Retry or contact support.", 502);
  }
}
