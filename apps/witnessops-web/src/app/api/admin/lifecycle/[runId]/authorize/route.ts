import { NextRequest, NextResponse } from "next/server";

import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import { authorizeRun } from "@/lib/server/control-plane-client";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface RouteContext {
  params: Promise<{ runId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getVerifiedAdminSession(request);
  if (!session) {
    return invalid("Unauthorized.", 401);
  }

  const { runId } = await context.params;
  if (!runId || !runId.startsWith("run_")) {
    return invalid("runId must be a control-plane run identifier.", 400);
  }

  try {
    const result = await authorizeRun(runId);
    if (result.kind === "not_configured") {
      return invalid("Control plane is not configured for this deployment.", 503);
    }
    if (result.kind === "conflict") {
      return invalid(result.message, result.status);
    }

    return NextResponse.json({
      ok: true,
      run: result.run,
      actor: session.actor,
      actorAuthSource: session.actorAuthSource,
      actorSessionHash: session.actorSessionHash,
      note: "Control-plane run authorized. Execution may proceed.",
    });
  } catch (error) {
    return invalid(
      error instanceof Error ? error.message : "Unable to authorize control-plane run.",
      502,
    );
  }
}
