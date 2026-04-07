import { NextResponse } from "next/server";

import {
  amendClaimantScope,
  ClaimantActionError,
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

  let body: { email?: unknown; reason?: unknown; amendedScope?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("Invalid request body.", 400);
  }

  const email = typeof body.email === "string" ? body.email : "";
  const reason = typeof body.reason === "string" ? body.reason : "";
  const amendedScope =
    typeof body.amendedScope === "string" ? body.amendedScope : "";

  try {
    const result = await amendClaimantScope({
      issuanceId,
      email,
      reason,
      amendedScope,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ClaimantActionError) {
      return invalid(error.message, error.status);
    }
    const message =
      error instanceof Error ? error.message : "Amend failed.";
    return invalid(message, 500);
  }
}
