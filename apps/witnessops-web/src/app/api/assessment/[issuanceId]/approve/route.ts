import { NextResponse } from "next/server";

import {
  scopeApprovalRequestSchema,
  scopeApprovalResponseSchema,
} from "@/lib/token-contract";
import { approveScopeAndStartRecon } from "@/lib/server/token-issuance";

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
    body = await request.json();
  } catch {
    return invalid("Invalid request body.", 400);
  }

  const parsed = scopeApprovalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalid("email is required.", 400);
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
    const message =
      error instanceof Error ? error.message : "Scope approval failed.";
    return invalid(message, 400);
  }
}
