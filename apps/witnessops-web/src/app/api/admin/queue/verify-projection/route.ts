import { NextRequest, NextResponse } from "next/server";

import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import { verifyQueueProjectionForIntake } from "@/lib/server/queue-projection";
import {
  AdminBusinessAuthorizationError,
  requireIntakeReadAccess,
} from "@/lib/server/admin-business-authorization";

export const runtime = "nodejs";

function invalid(message: string, status = 400, reasonCodes?: string[]) {
  return NextResponse.json(
    reasonCodes ? { ok: false, error: message, reasonCodes } : { ok: false, error: message },
    { status },
  );
}

interface VerifyQueueProjectionBody {
  intakeId?: string;
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedAdminSession(request);
  if (!session) {
    return invalid("Unauthorized.", 401, ["AUTHORIZATION_REQUIRED"]);
  }

  let body: VerifyQueueProjectionBody;
  try {
    body = (await request.json()) as VerifyQueueProjectionBody;
  } catch {
    return invalid("Invalid request body.", 400);
  }

  const intakeId = typeof body.intakeId === "string" ? body.intakeId : "";
  if (!intakeId) {
    return invalid("intakeId is required.", 400);
  }

  try {
    const intake = await requireIntakeReadAccess(session, intakeId);
    const result = await verifyQueueProjectionForIntake(intake);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminBusinessAuthorizationError) {
      return invalid(error.message, error.status, ["SNAPSHOT_MISSING"]);
    }
    const message =
      error instanceof Error ? error.message : "Queue projection verification failed.";
    return invalid(message, 500);
  }
}
