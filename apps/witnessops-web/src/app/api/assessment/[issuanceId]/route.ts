import { NextResponse } from "next/server";
import { getIssuanceById, updateIssuance } from "@/lib/server/token-store";
import { getAssessmentStatus } from "@/lib/server/assessment-client";
import { normalizedEmailSchema } from "@/lib/token-contract";

export const runtime = "nodejs";

async function persistAssessmentStatus(
  issuanceId: string,
  next: { status: "pending" | "running" | "completed" | "failed"; error?: string },
) {
  await updateIssuance(issuanceId, (record) => {
    if (
      record.assessmentStatus === next.status &&
      (record.assessmentError ?? null) === (next.error ?? null)
    ) {
      return record;
    }
    return {
      ...record,
      assessmentStatus: next.status,
      assessmentError: next.error ?? null,
    };
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ issuanceId: string }> },
) {
  const { issuanceId } = await params;
  const { searchParams } = new URL(request.url);
  const rawEmail = searchParams.get("email") ?? "";

  // Validate the email param
  const emailParsed = normalizedEmailSchema.safeParse(rawEmail);
  if (!emailParsed.success) {
    return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
  }

  const record = await getIssuanceById(issuanceId);
  if (!record) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  if (record.email !== emailParsed.data) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // Base response from stored record
  const base = {
    issuanceId: record.issuanceId,
    assessmentStatus: record.assessmentStatus ?? "unavailable",
    assessmentRunId: record.assessmentRunId ?? null,
  };

  if (record.assessmentRunId) {
    try {
      const live = await getAssessmentStatus(record.assessmentRunId);
      if (live) {
        await persistAssessmentStatus(record.issuanceId, {
          status: live.status,
          error: live.error,
        });
        return NextResponse.json({
          ok: true,
          ...base,
          assessmentStatus: live.status,
          run: live,
        });
      }
    } catch {
      // Fall through to stored status if live fetch fails
    }
  }

  return NextResponse.json({ ok: true, ...base });
}
