import { NextResponse } from "next/server";

import { supportRequestSchema } from "@/lib/token-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { publicIssuanceErrorResponse } from "@/lib/server/public-issuance-error";
import { createVerificationIssuance } from "@/lib/server/token-issuance";

export async function POST(request: Request) {
  const rateLimitResponse = enforcePublicIntakeRateLimit(request, "support-message");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = supportRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "email, category, severity, and message are required." },
      { status: 400 },
    );
  }

  try {
    const { email, subject, category, severity, message } = parsed.data;
    const issuance = await createVerificationIssuance({
      channel: "support",
      email,
      source: "api/support/message",
      submission: {
        subject: subject || `[${category}] ${message.slice(0, 80)}`,
        category,
        severity,
        message,
      },
    });

    return NextResponse.json(issuance, { status: 202 });
  } catch (error) {
    return publicIssuanceErrorResponse("api/support/message", error);
  }
}
