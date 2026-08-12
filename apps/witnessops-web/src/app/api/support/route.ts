import { NextResponse } from "next/server";
import {
  supportRequestSchema,
  supportResponseSchema,
} from "@/lib/token-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { publicIssuanceErrorResponse } from "@/lib/server/public-issuance-error";
import { createVerificationIssuance } from "@/lib/server/token-issuance";
import { PUBLIC_JSON_BODY_LIMIT_BYTES, readBoundedRequestJson, RequestBodyTooLargeError } from "@/lib/server/bounded-request-body";

export async function POST(request: Request) {
  try {
    const rateLimitResponse = enforcePublicIntakeRateLimit(request, "support");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsed = supportRequestSchema.safeParse(
      await readBoundedRequestJson(request, PUBLIC_JSON_BODY_LIMIT_BYTES),
    );
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
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    return publicIssuanceErrorResponse("api/support", error);
  }
}
