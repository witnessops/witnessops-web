import { NextResponse } from "next/server";

import { isBusinessEmail } from "@/lib/freemail-policy";
import {
  engageRequestSchema,
  engageResponseSchema,
} from "@/lib/token-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { publicIssuanceErrorResponse } from "@/lib/server/public-issuance-error";
import { createVerificationIssuance } from "@/lib/server/token-issuance";

export async function POST(request: Request) {
  try {
    const rateLimitResponse = enforcePublicIntakeRateLimit(request, "contact");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsed = engageRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "A valid business email is required." },
        { status: 400 },
      );
    }

    const { email, name, org, intent, scope } = parsed.data;
    if (!isBusinessEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please use your business email." },
        { status: 400 },
      );
    }

    const issuance = await createVerificationIssuance({
      channel: "engage",
      email,
      source: "api/contact",
      submission: {
        name,
        org,
        intent,
        scope,
      },
    });

    return NextResponse.json(engageResponseSchema.parse(issuance), {
      status: 201,
    });
  } catch (error) {
    return publicIssuanceErrorResponse("api/contact", error);
  }
}
