import { NextRequest, NextResponse } from "next/server";

import {
  parseResendVerificationDeliveryEvent,
  type IgnoredProviderOutcomeEvent,
} from "@/lib/server/provider-outcome-ingest";
import {
  recordVerificationDeliveryOutcome,
  VerificationDeliveryOutcomeError,
} from "@/lib/server/verification-delivery-outcome";
import { IntakeResponseProviderOutcomeError } from "@/lib/server/intake-response-provider-outcome";
import { logUnexpectedRouteError } from "@/lib/server/route-error-boundary";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function ignored(args: IgnoredProviderOutcomeEvent) {
  return NextResponse.json(
    {
      ok: true,
      status: "ignored",
      provider: args.provider,
      providerEventId: args.providerEventId,
      rawEventType: args.rawEventType,
      reason: args.reason,
    },
    { status: 202 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseResendVerificationDeliveryEvent(request);
    if (parsed.kind === "ignored") {
      return ignored(parsed);
    }

    const response = await recordVerificationDeliveryOutcome({
      provider: parsed.provider,
      providerEventId: parsed.providerEventId,
      providerMessageId: parsed.providerMessageId,
      status: parsed.status,
      observedAt: parsed.observedAt,
      rawEventType: parsed.rawEventType,
      detail: parsed.detail,
    });
    return NextResponse.json(response);
  } catch (error) {
    if (
      error instanceof IntakeResponseProviderOutcomeError ||
      error instanceof VerificationDeliveryOutcomeError
    ) {
      if (error.status >= 500) {
        logUnexpectedRouteError(
          "Verification delivery outcome could not be recorded",
          error,
        );
        return invalid("Unable to record verification delivery outcome.", error.status);
      }
      return invalid(error.message, error.status);
    }

    logUnexpectedRouteError(
      "Verification delivery outcome could not be recorded",
      error,
    );
    return invalid("Unable to record verification delivery outcome.", 500);
  }
}
