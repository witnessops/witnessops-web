import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getMailboxConfig } from "@/lib/mailboxes";
import { supportRequestSchema } from "@/lib/token-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { sendMail } from "@/lib/server/send-verification-email";

function formatSupportBody(input: {
  email: string;
  subject?: string;
  category: string;
  severity: string;
  message: string;
}): string {
  return [
    "WitnessOps support request",
    "",
    `Email: ${input.email}`,
    `Subject: ${input.subject || "-"}`,
    `Category: ${input.category}`,
    `Severity: ${input.severity}`,
    "",
    "Message:",
    input.message.trim(),
  ].join("\n");
}

export async function POST(request: Request) {
  const rateLimitResponse = enforcePublicIntakeRateLimit(request, "support-message");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = supportRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "email, category, severity, and message are required." },
      { status: 400 },
    );
  }

  const mailboxes = getMailboxConfig();
  const deliveryAttemptId = `sup_${randomUUID().replace(/-/g, "")}`;

  try {
    const delivery = await sendMail({
      to: mailboxes.support,
      from: mailboxes.support,
      subject: parsed.data.subject || `WitnessOps support request - ${parsed.data.category}`,
      text: formatSupportBody(parsed.data),
      deliveryAttemptId,
      messageClass: "internal_notification",
    });

    return NextResponse.json(
      {
        ok: true,
        deliveredAt: delivery.deliveredAt,
        provider: delivery.provider,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("[api/support/message] direct email failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to send message." },
      { status: 500 },
    );
  }
}
