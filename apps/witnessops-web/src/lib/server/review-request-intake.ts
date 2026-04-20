import { NextResponse } from "next/server";

import { isBusinessEmail } from "@/lib/freemail-policy";
import {
  engageRequestSchema,
  engageResponseSchema,
} from "@/lib/token-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { publicIssuanceErrorResponse } from "@/lib/server/public-issuance-error";
import { createVerificationIssuance } from "@/lib/server/token-issuance";

type ReviewRequestIntakeOptions = {
  rateLimitNamespace: string;
  source: string;
};

export async function handleReviewRequestIntake(
  request: Request,
  options: ReviewRequestIntakeOptions,
) {
  try {
    const rateLimitResponse = enforcePublicIntakeRateLimit(
      request,
      options.rateLimitNamespace,
    );
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

    const { email, name, org, scope } = parsed.data;
    if (!isBusinessEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please use your business email." },
        { status: 400 },
      );
    }

    const issuance = await createVerificationIssuance({
      channel: "engage",
      email,
      source: options.source,
      submission: {
        name,
        org,
        intent: "review",
        scope,
      },
    });

    return NextResponse.json(engageResponseSchema.parse(issuance), {
      status: 201,
    });
  } catch (error) {
    return publicIssuanceErrorResponse(options.source, error);
  }
}
