import { NextRequest, NextResponse } from "next/server";

import {
  adminIntakeReconcileRequestSchema,
  adminIntakeReconcileResponseSchema,
} from "@/lib/token-contract";
import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import {
  IntakeReconciliationError,
  reconcileIntakeResponse,
} from "@/lib/server/intake-reconciliation";

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

  const parsed = adminIntakeReconcileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalid("intakeId, evidenceSubcase, and note are required.", 400);
  }

  try {
    const response = await reconcileIntakeResponse({
      ...parsed.data,
      actor: session.actor,
      actorAuthSource: session.actorAuthSource,
      actorSessionHash: session.actorSessionHash,
      source: "api/admin/intake/reconcile",
    });

    return NextResponse.json(
      adminIntakeReconcileResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof IntakeReconciliationError) {
      return invalid(error.message, error.status);
    }

    const message =
      error instanceof Error ? error.message : "Reconciliation failed.";
    return invalid(message, 500);
  }
}
