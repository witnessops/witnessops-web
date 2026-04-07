import { NextRequest, NextResponse } from "next/server";

import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import {
  OperatorActionError,
  requestClarificationAsOperator,
} from "@/lib/server/operator-actions";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedAdminSession(request);
  if (!session) return invalid("Unauthorized.", 401);

  let body: {
    intakeId?: unknown;
    reason?: unknown;
    clarificationQuestion?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("Invalid request body.", 400);
  }

  const intakeId = typeof body.intakeId === "string" ? body.intakeId : "";
  const reason = typeof body.reason === "string" ? body.reason : "";
  const clarificationQuestion =
    typeof body.clarificationQuestion === "string"
      ? body.clarificationQuestion
      : "";

  try {
    const result = await requestClarificationAsOperator({
      intakeId,
      actor: session.actor,
      reason,
      clarificationQuestion,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof OperatorActionError) {
      return invalid(error.message, error.status);
    }
    const message =
      error instanceof Error ? error.message : "Clarification request failed.";
    return invalid(message, 500);
  }
}
