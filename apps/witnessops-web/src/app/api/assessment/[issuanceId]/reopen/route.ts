import { NextResponse } from "next/server";

import {
  ClaimantActionError,
  reopenClaimantExit,
} from "@/lib/server/claimant-actions";

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
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("Invalid request body.", 400);
  }

  const email = typeof body.email === "string" ? body.email : "";
  const reason = typeof body.reason === "string" ? body.reason : "";

  try {
    const result = await reopenClaimantExit({
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
      error instanceof Error ? error.message : "Reopen failed.";
    return invalid(message, 500);
  }
}
