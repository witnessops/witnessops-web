import { NextResponse } from "next/server";
import {
  supportRequestSchema,
  supportResponseSchema,
} from "@/lib/token-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { publicIssuanceErrorResponse } from "@/lib/server/public-issuance-error";
import { createVerificationIssuance } from "@/lib/server/token-issuance";

export async function POST(request: Request) {
  try {
    const rateLimitResponse = enforcePublicIntakeRateLimit(request, "support");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsed = supportRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "email, category, severity, and message are required." },
        { status: 400 },
      );
    }

    const { email, subject, category, severity, message } = parsed.data;

    const issuance = await createVerificationIssuance({
      channel: "support",
      email,
      source: "api/support",
      submission: {
        subject: subject || `[${category}] ${message.slice(0, 80)}`,
        category,
        severity,
        message,
      },
    });

    return NextResponse.json(supportResponseSchema.parse(issuance), {
      status: 202,
    });
  } catch (error) {
    return publicIssuanceErrorResponse("api/support", error);
  }
}
