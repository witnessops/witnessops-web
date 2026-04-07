/**
 * Customer proof package disposition action (WEB-014).
 *
 * POST /api/package/[issuanceId]/disposition
 *
 * Body: { email, disposition: "accepted" | "rejected", comment?: string }
 *
 * Resolves the issuance, verifies the caller's email matches the
 * issuance email, then submits the disposition to control-plane
 * (CP-003 authority). First-write-wins + idempotent replay semantics
 * are enforced by control-plane; this route only maps its responses.
 */
import { NextResponse } from "next/server";

import { getIssuanceById } from "@/lib/server/token-store";
import {
  submitCustomerAcceptance,
  type CustomerAcceptanceSubmitResult,
} from "@/lib/server/control-plane-client";

export const runtime = "nodejs";

const MAX_COMMENT_LENGTH = 2000;

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface ParsedInput {
  email: string;
  disposition: "accepted" | "rejected";
  comment: string | null;
}

function parseBody(body: unknown): ParsedInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }
  const record = body as Record<string, unknown>;

  const rawEmail = record.email;
  if (typeof rawEmail !== "string" || rawEmail.trim() === "") {
    return { error: "email is required." };
  }
  const email = rawEmail.toLowerCase().trim();

  const rawDisposition = record.disposition;
  if (rawDisposition !== "accepted" && rawDisposition !== "rejected") {
    return { error: "disposition must be 'accepted' or 'rejected'." };
  }

  let comment: string | null = null;
  if (record.comment !== undefined && record.comment !== null) {
    if (typeof record.comment !== "string") {
      return { error: "comment must be a string." };
    }
    const trimmed = record.comment.trim();
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      return {
        error: `comment exceeds maximum length of ${MAX_COMMENT_LENGTH} characters.`,
      };
    }
    comment = trimmed === "" ? null : trimmed;
  }

  return { email, disposition: rawDisposition, comment };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ issuanceId: string }> },
) {
  const { issuanceId } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("Invalid request body.", 400);
  }

  const parsed = parseBody(raw);
  if ("error" in parsed) {
    return fail(parsed.error, 422);
  }

  const record = await getIssuanceById(issuanceId);
  if (!record) {
    return fail("Issuance not found.", 404);
  }
  if (record.email !== parsed.email) {
    return fail("Email does not match issuance.", 403);
  }

  const runId = record.controlPlaneRunId;
  if (!runId) {
    return fail(
      "Proof package is not yet available for disposition.",
      409,
    );
  }

  let result: CustomerAcceptanceSubmitResult;
  try {
    result = await submitCustomerAcceptance(runId, {
      disposition: parsed.disposition,
      accepted_by: parsed.email,
      comment: parsed.comment,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Submission failed.";
    return fail(message, 502);
  }

  if (result.kind === "not_configured") {
    return fail(
      "Proof package disposition is not available in this environment.",
      503,
    );
  }
  if (result.kind === "conflict") {
    return fail(result.message || "Disposition conflict.", 409);
  }
  return NextResponse.json({ ok: true, record: result.record });
}
