import { NextRequest, NextResponse } from "next/server";

import {
  adminIntakeReconcileRequestSchema,
  adminIntakeReconcileResponseSchema,
} from "@/lib/token-contract";
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
  IntakeReconciliationError,
  reconcileIntakeResponse,
} from "@/lib/server/intake-reconciliation";
import { logUnexpectedRouteError } from "@/lib/server/route-error-boundary";

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
    body = await readBoundedRequestJson(request, ADMIN_JSON_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return invalid("Request body is too large.", 413);
    }
    return invalid("Invalid request body.", 400);
  }

  const parsed = adminIntakeReconcileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalid("intakeId, evidenceSubcase, and note are required.", 400);
  }

  try {
    const response = await reconcileIntakeResponse({
      ...parsed.data,
      actor: session.actor,
      role: session.role,
      actorAuthSource: session.actorAuthSource,
      actorSessionHash: session.actorSessionHash,
      source: "api/admin/intake/reconcile",
    });

    return NextResponse.json(
      adminIntakeReconcileResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof AdminBusinessAuthorizationError) {
      return invalid(error.message, error.status);
    }
    if (error instanceof IntakeReconciliationError) {
      if (error.status >= 500) {
        logUnexpectedRouteError("Intake reconciliation failed", error);
        return invalid("Reconciliation failed.", error.status);
      }
      return invalid(error.message, error.status);
    }

    logUnexpectedRouteError("Intake reconciliation failed", error);
    return invalid("Reconciliation failed.", 500);
  }
}
