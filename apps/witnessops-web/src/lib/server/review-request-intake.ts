import { NextResponse } from "next/server";

import { isBusinessEmail } from "@/lib/freemail-policy";
import {
  engageRequestSchema,
  engageResponseSchema,
} from "@/lib/token-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { publicIssuanceErrorResponse } from "@/lib/server/public-issuance-error";
import { createVerificationIssuance } from "@/lib/server/token-issuance";
import {
  PUBLIC_JSON_BODY_LIMIT_BYTES,
  readBoundedRequestJson,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";

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

    const parsed = engageRequestSchema.safeParse(
      await readBoundedRequestJson(request, PUBLIC_JSON_BODY_LIMIT_BYTES),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "A valid business email is required." },
        { status: 400 },
      );
    }

    const { email, name, org, intent, locale, scope } = parsed.data;
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
        intent: intent ?? "review",
        locale: locale ?? "en",
        scope,
      },
    });

    return NextResponse.json(engageResponseSchema.parse(issuance), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { ok: false, error: "Request body is too large." },
        { status: 413 },
      );
    }
    return publicIssuanceErrorResponse(options.source, error);
  }
}
