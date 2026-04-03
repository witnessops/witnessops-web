import { NextRequest, NextResponse } from "next/server";

import {
  adminIntakeRespondRequestSchema,
  adminIntakeRespondResponseSchema,
} from "@/lib/token-contract";
import {
  IntakeResponseError,
  respondToIntake,
} from "@/lib/server/intake-response";
import { getVerifiedAdminSession } from "@/lib/server/admin-session";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedAdminSession(request);
  if (!session) {
    return invalid("Unauthorized.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid("Invalid request body.", 400);
  }

  const parsed = adminIntakeRespondRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalid("intakeId, subject, and body are required.", 400);
  }

  try {
    const response = await respondToIntake({
      ...parsed.data,
      actor: session.actor,
      actorAuthSource: session.actorAuthSource,
      actorSessionHash: session.actorSessionHash,
      source: "api/admin/intake/respond",
    });

    return NextResponse.json(adminIntakeRespondResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof IntakeResponseError) {
      return invalid(error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Response failed.";
    return invalid(message, 500);
  }
}
