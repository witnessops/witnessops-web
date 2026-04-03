import { NextRequest, NextResponse } from "next/server";

import { adminReconciliationReportResponseSchema } from "@/lib/token-contract";
import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import { buildReconciliationReport } from "@/lib/server/reconciliation-report";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedAdminSession(request);
  if (!session) {
    return invalid("Unauthorized.", 401);
  }

  try {
    const report = await buildReconciliationReport();
    return NextResponse.json(
      adminReconciliationReportResponseSchema.parse(report),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build report.";
    return invalid(message, 500);
  }
}
