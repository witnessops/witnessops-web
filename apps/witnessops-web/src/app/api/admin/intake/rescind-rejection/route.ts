import { NextRequest, NextResponse } from "next/server";

import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import {
  ADMIN_JSON_BODY_LIMIT_BYTES,
  readBoundedRequestJson,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";
import {
  AdminBusinessAuthorizationError,
} from "@/lib/server/admin-business-authorization";
import {
  OperatorActionError,
  rescindOperatorRejection,
} from "@/lib/server/operator-actions";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedAdminSession(request);
  if (!session) return invalid("Unauthorized.", 401);

  let body: { intakeId?: unknown; reason?: unknown };
  try {
    body = (await readBoundedRequestJson(request, ADMIN_JSON_BODY_LIMIT_BYTES)) as typeof body;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return invalid("Request body is too large.", 413);
    }
    return invalid("Invalid request body.", 400);
  }

  const intakeId = typeof body.intakeId === "string" ? body.intakeId : "";
  const reason = typeof body.reason === "string" ? body.reason : "";

  try {
    const result = await rescindOperatorRejection({
      intakeId,
      actor: session.actor,
      reason,
      role: session.role,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AdminBusinessAuthorizationError) {
      return invalid(error.message, error.status);
    }
    if (error instanceof OperatorActionError) {
      return invalid(error.message, error.status);
    }
    const message =
      error instanceof Error ? error.message : "Rescind failed.";
    return invalid(message, 500);
  }
}
