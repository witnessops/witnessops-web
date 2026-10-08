import { NextResponse } from "next/server";

import { validateNewReviewIntake } from "@/lib/new-review-request-policy";

import { isBusinessEmail } from "@/lib/freemail-policy";
import {
  engageRequestSchema,
  engageResponseSchema,
  reviewRequestSchema,
} from "@/lib/token-contract";
import {
  enforcePublicIntakeRateLimit,
  enforcePublicIssuanceRateLimits,
} from "@/lib/server/public-intake-rate-limit";
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
  validation?: "engage" | "review";
};

function invalidRequestResponse(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  const issue = error.issues[0];
  const field = typeof issue?.path[0] === "string" ? issue.path[0] : undefined;
  const labels: Record<string, string> = {
    email: "Email address",
    name: "Name",
    org: "Organisation",
    intent: "Selected request",
    locale: "Locale",
    scope: "Review request details",
  };
  const label = field ? labels[field] : undefined;

  return NextResponse.json(
    {
      ok: false,
      error: label ? `${label} is invalid.` : "Request details are invalid.",
      ...(field ? { field } : {}),
    },
    { status: 400 },
  );
}

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

    const raw = await readBoundedRequestJson(
      request,
      PUBLIC_JSON_BODY_LIMIT_BYTES,
    );
    // Applies only to new public issuance, never stored-request verification.
    // Read raw selector fields before Zod can strip aliases or normalize intent.
    const selection = validateNewReviewIntake(raw);
    if (!selection.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "This selection is not available for new requests. Choose an AI or external review at /review/request.",
          field: "intent",
          code: "NEW_REVIEW_SELECTION_REQUIRED",
        },
        { status: 400 },
      );
    }
    const parsed = (
      options.validation === "review"
        ? reviewRequestSchema
        : engageRequestSchema
    ).safeParse(raw);
    if (!parsed.success) {
      return invalidRequestResponse(parsed.error);
    }

    const { email, name, org, locale, scope } = parsed.data;
    if (!isBusinessEmail(email)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please use your business email.",
          field: "email",
        },
        { status: 400 },
      );
    }

    const recipientRateLimitResponse = enforcePublicIssuanceRateLimits(
      email,
      "review-request-issuance",
    );
    if (recipientRateLimitResponse) return recipientRateLimitResponse;

    const issuance = await createVerificationIssuance({
      channel: "engage",
      email,
      source: options.source,
      submission: {
        name,
        org,
        intent: selection.intent,
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
