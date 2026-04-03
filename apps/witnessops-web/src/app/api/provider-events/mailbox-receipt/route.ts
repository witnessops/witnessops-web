import { NextRequest, NextResponse } from "next/server";

import {
  mailboxReceiptRequestSchema,
  mailboxReceiptResponseSchema,
} from "@/lib/token-contract";
import { validateProviderEventSecret } from "@/lib/server/intake-response-provider-outcome";
import {
  IntakeMailboxReceiptError,
  recordIntakeMailboxReceipt,
} from "@/lib/server/intake-mailbox-receipt";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    if (
      !validateProviderEventSecret(
        request.headers.get("x-witnessops-provider-secret"),
      )
    ) {
      return invalid("Unauthorized.", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalid("Invalid request body.", 400);
    }

    const parsed = mailboxReceiptRequestSchema.safeParse(body);
    if (!parsed.success) {
      return invalid(
        "deliveryAttemptId, receiptId, status, and observedAt are required.",
        400,
      );
    }

    const response = await recordIntakeMailboxReceipt(parsed.data);
    return NextResponse.json(mailboxReceiptResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof IntakeMailboxReceiptError) {
      return invalid(error.message, error.status);
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to record mailbox receipt.";
    return invalid(message, 500);
  }
}
