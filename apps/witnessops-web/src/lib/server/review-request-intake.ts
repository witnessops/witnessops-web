import { NextResponse } from "next/server";

import { isBusinessEmail } from "@/lib/freemail-policy";
import { isFitCallTimeZone } from "@/lib/fit-call-timezone";
import {
  engageRequestSchema,
  engageResponseSchema,
  reviewRequestSchema,
  type FitCallRequest,
} from "@/lib/token-contract";
import {
  enforcePublicIntakeRateLimit,
  enforcePublicIssuanceRateLimits,
} from "@/lib/server/public-intake-rate-limit";
import {
  evaluateNewSalesIntakeBody,
  NEW_SALES_AGENT_ACTION_OFFER_ID,
} from "@/lib/new-review-request-policy";
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

const FIT_CALL_DURATION_MS = 20 * 60_000;
const FIT_CALL_HORIZON_MS = 90 * 24 * 60 * 60_000;

/** Resolve a proposed local minute only when it has one real instant in the selected zone. */
function localMinuteAt(formatter: Intl.DateTimeFormat, utcMs: number): number {
  const parts = formatter.formatToParts(new Date(utcMs));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
  );
}

function proposedLocalMinute(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const wallMs = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  return Number.isFinite(wallMs) &&
    new Date(wallMs).toISOString().slice(0, 16) === value
    ? wallMs
    : null;
}

function oneInstantForLocalMinute(
  formatter: Intl.DateTimeFormat,
  wallMs: number,
): number | null {
  const candidates = new Set<number>();
  // Sampling both sides of a zone transition finds all applicable offsets.
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wallMs + hours * 60 * 60_000;
    const offset = localMinuteAt(formatter, sample) - sample;
    const candidate = wallMs - offset;
    if (localMinuteAt(formatter, candidate) === wallMs) {
      candidates.add(candidate);
    }
  }
  return candidates.size === 1 ? [...candidates][0] : null;
}

export function fitCallPreferencesAreValid(fitCall: FitCallRequest, nowMs: number): boolean {
  if (!isFitCallTimeZone(fitCall.timezone)) return false;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: fitCall.timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }

  const starts: number[] = [];
  for (const value of fitCall.preferredStarts) {
    const wallMs = proposedLocalMinute(value);
    if (wallMs === null) return false;
    const startMs = oneInstantForLocalMinute(formatter, wallMs);
    if (
      startMs === null ||
      startMs <= nowMs ||
      startMs > nowMs + FIT_CALL_HORIZON_MS
    ) {
      return false;
    }
    starts.push(startMs);
  }

  starts.sort((a, b) => a - b);
  return starts[1] - starts[0] >= FIT_CALL_DURATION_MS;
}

function fitCallRequestSummary(fitCall: FitCallRequest): string {
  return [
    "20-minute fit call request for Agent Action Security Review.",
    `Discussion topic: ${fitCall.topic}`,
    `Time zone: ${fitCall.timezone}`,
    `Preferred window 1: ${fitCall.preferredStarts[0]} (20 minutes)`,
    `Preferred window 2: ${fitCall.preferredStarts[1]} (20 minutes)`,
    "Time requested, not booked. An operator must send a confirmed invite.",
  ].join("\n");
}

function withoutBlankName(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const body = { ...(raw as Record<string, unknown>) };
  if (
    body.name == null ||
    (typeof body.name === "string" && body.name.trim() === "")
  ) {
    delete body.name;
  }
  return body;
}

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
    fitCall: "Fit call preferences",
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

    const raw = withoutBlankName(
      await readBoundedRequestJson(
        request,
        PUBLIC_JSON_BODY_LIMIT_BYTES,
      ),
    );
    const parsed = (
      options.validation === "review"
        ? reviewRequestSchema
        : engageRequestSchema
    ).safeParse(raw);
    if (!parsed.success) {
      return invalidRequestResponse(parsed.error);
    }

    const intakeDecision = evaluateNewSalesIntakeBody(raw);
    if (!intakeDecision.accepted) {
      return NextResponse.json(
        {
          ok: false,
          error: "Selected request is not available for a new review.",
          field: "intent",
          reason: intakeDecision.reason,
        },
        { status: 400 },
      );
    }

    const { email, name, org, locale, scope } = parsed.data;
    const intent = intakeDecision.intent;
    // The engage schema strips unknown fields; only the review schema admits fitCall.
    const fitCall = options.validation === "review"
      ? (parsed.data as { fitCall?: FitCallRequest }).fitCall
      : undefined;
    if (fitCall) {
      if (
        intakeDecision.role !== "offer" ||
        intent !== NEW_SALES_AGENT_ACTION_OFFER_ID
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "A fit call is available only for the current review.",
            field: "intent",
          },
          { status: 400 },
        );
      }
      if (!fitCallPreferencesAreValid(fitCall, Date.now())) {
        return NextResponse.json(
          {
            ok: false,
            error: "Choose two distinct future 20-minute preferences within 90 days in a valid time zone.",
            field: "fitCall",
          },
          { status: 400 },
        );
      }
    }
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

    // Issuance captures the server-owned offer revision from this validated
    // intent. Raw client snapshot/revision fields are never forwarded.
    const issuance = await createVerificationIssuance({
      channel: "engage",
      email,
      source: options.source,
      submission: {
        name,
        org,
        intent,
        locale: locale ?? "en",
        scope: fitCall ? fitCallRequestSummary(fitCall) : scope,
        ...(fitCall ? { requestMode: "fit-call" as const, fitCall } : {}),
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
