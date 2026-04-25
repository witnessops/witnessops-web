import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getMailboxConfig } from "@/lib/mailboxes";
import { engageRequestSchema } from "@/lib/token-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { sendMail } from "@/lib/server/send-verification-email";

function formatContactBody(input: {
  name?: string;
  email: string;
  org?: string;
  intent?: string;
  scope?: string;
}): string {
  return [
    "WitnessOps review request",
    "",
    `Name: ${input.name || "-"}`,
    `Email: ${input.email}`,
    `Organization: ${input.org || "-"}`,
    `Intent: ${input.intent || "review"}`,
    "",
    "Workflow:",
    input.scope?.trim() ? input.scope.trim() : "-",
  ].join("\n");
}

export async function POST(request: Request) {
  const rateLimitResponse = enforcePublicIntakeRateLimit(request, "contact");
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

  const parsed = engageRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "email is required." },
      { status: 400 },
    );
  }

  const mailboxes = getMailboxConfig();
  const deliveryAttemptId = `ctc_${randomUUID().replace(/-/g, "")}`;

  try {
    const delivery = await sendMail({
      to: mailboxes.engage,
      from: mailboxes.engage,
      subject: `WitnessOps review request - ${parsed.data.email}`,
      text: formatContactBody(parsed.data),
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
    console.error("[api/contact] direct email failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to send message." },
      { status: 500 },
    );
  }
}
