/**
 * WEB-002: bounded operator retry-request surface.
 *
 * Records an operator's intent to retry delivery for a given control-plane
 * run. This is local web state — it never marks the run as delivered. The
 * authoritative delivered/acknowledged/completed transitions stay in
 * control-plane (CP-001/CP-002).
 *
 * Bound: at most one outstanding retry request per run. A request is
 * "outstanding" if no successful delivery has been observed in upstream
 * after it was made. The route refuses additional requests until either
 * recovery is observed or the existing request is older than upstream's
 * latest delivered_at.
 */
import { NextRequest, NextResponse } from "next/server";

import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import {
  appendDeliveryRetryRequest,
  getLatestDeliveryRetryRequest,
} from "@/lib/server/delivery-retry-ledger";
import { getCompletionView } from "@/lib/server/control-plane-client";

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

  let body: { reason?: unknown };
  try {
    body = (await request.json()) as { reason?: unknown };
  } catch {
    return invalid("Invalid request body.", 400);
  }

  const reason =
    typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return invalid("reason is required.", 400);
  }
  if (reason.length > 500) {
    return invalid("reason must be 500 characters or fewer.", 400);
  }

  // Bound check: refuse if a retry is already outstanding for this run.
  const existing = await getLatestDeliveryRetryRequest(runId);
  if (existing) {
    let upstream;
    try {
      upstream = await getCompletionView(runId);
    } catch {
      // Upstream unreachable — we cannot prove recovery either way.
      // Refuse the new request rather than spam.
      return invalid(
        "A retry is already outstanding and control plane is unreachable. Wait for recovery or upstream visibility.",
        409,
      );
    }
    if (upstream === "not_configured" || upstream === "not_found") {
      return invalid(
        "A retry is already outstanding and upstream lifecycle is not visible.",
        409,
      );
    }
    const deliveredAt = upstream.delivery?.delivered_at ?? null;
    const recovered =
      deliveredAt && Date.parse(deliveredAt) > Date.parse(existing.requested_at);
    if (!recovered) {
      return invalid(
        "A retry is already outstanding for this run. Wait for control plane to record delivery before requesting another.",
        409,
      );
    }
  }

  const written = await appendDeliveryRetryRequest({
    run_id: runId,
    requested_by: session.actor,
    reason,
  });

  return NextResponse.json({
    ok: true,
    request: written,
    note: "Retry intent recorded locally. This does not mark delivery as successful — control plane remains the source of truth.",
  });
}
