import { NextRequest, NextResponse } from "next/server";

import { providerResponseOutcomeResponseSchema } from "@/lib/token-contract";
import { parseProviderOutcomeEvent } from "@/lib/server/provider-outcome-ingest";
import {
  IntakeResponseProviderOutcomeError,
  recordIntakeResponseProviderOutcome,
} from "@/lib/server/intake-response-provider-outcome";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function ignored(args: {
  provider: string;
  providerEventId: string | null;
  rawEventType: string;
  reason: string;
}) {
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
    const parsed = await parseProviderOutcomeEvent(request);
    if (parsed.kind === "ignored") {
      return ignored(parsed);
    }

    const response = await recordIntakeResponseProviderOutcome(parsed.request);
    return NextResponse.json(
      providerResponseOutcomeResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof IntakeResponseProviderOutcomeError) {
      return invalid(error.message, error.status);
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to record provider outcome.";
    return invalid(message, 500);
  }
}
