import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { z } from "zod";

import {
  providerResponseOutcomeRequestSchema,
  type ProviderResponseOutcomeRequest,
} from "@/lib/token-contract";

import {
  IntakeResponseProviderOutcomeError,
  validateProviderEventSecret,
} from "./intake-response-provider-outcome";

const resendWebhookHeaders = [
  "svix-id",
  "svix-timestamp",
  "svix-signature",
] as const;

const resendWebhookEventSchema = z.object({
  type: z.string().trim().min(1),
  created_at: z.string().trim().min(1),
  data: z.object({
    email_id: z.string().trim().min(1).optional(),
    created_at: z.string().trim().min(1).optional(),
    tags: z.record(z.string()).optional(),
    bounce: z
      .object({
        message: z.string().trim().optional(),
        type: z.string().trim().optional(),
        subType: z.string().trim().optional(),
        diagnosticCode: z.array(z.string().trim()).optional(),
      })
      .optional(),
    failed: z
      .object({
        reason: z.string().trim().optional(),
      })
      .optional(),
  }),
});

export interface IgnoredProviderOutcomeEvent {
  kind: "ignored";
  provider: string;
  providerEventId: string | null;
  rawEventType: string;
  reason: string;
}

export interface RecordedProviderOutcomeEvent {
  kind: "record";
  request: ProviderResponseOutcomeRequest;
}

export type ParsedProviderOutcomeEvent =
  | IgnoredProviderOutcomeEvent
  | RecordedProviderOutcomeEvent;

function readResendWebhookSecret(): string {
  const secret = process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new IntakeResponseProviderOutcomeError(
      "WITNESSOPS_RESEND_WEBHOOK_SECRET is required for Resend webhook verification.",
      500,
    );
  }

  return secret;
}

function hasResendWebhookHeaders(request: NextRequest): boolean {
  return resendWebhookHeaders.every((header) =>
    Boolean(request.headers.get(header)),
  );
}

function parseTrustedNormalizedProviderOutcome(
  rawBody: string,
  request: NextRequest,
): RecordedProviderOutcomeEvent {
  if (
    !validateProviderEventSecret(
      request.headers.get("x-witnessops-provider-secret"),
    )
  ) {
    throw new IntakeResponseProviderOutcomeError(
      "Unauthorized provider event source.",
      401,
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new IntakeResponseProviderOutcomeError("Invalid request body.", 400);
  }

  const parsed = providerResponseOutcomeRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new IntakeResponseProviderOutcomeError(
      "provider, providerEventId, outcome, observedAt, source, rawEventType, and providerMessageId or deliveryAttemptId are required.",
      400,
    );
  }

  return {
    kind: "record",
    request: parsed.data,
  };
}

function buildResendEventDetail(
  event: z.infer<typeof resendWebhookEventSchema>,
): string | undefined {
  if (event.type === "email.bounced" && event.data.bounce) {
    return [
      event.data.bounce.message,
      event.data.bounce.type,
      event.data.bounce.subType,
      event.data.bounce.diagnosticCode?.join(" | "),
    ]
      .filter(Boolean)
      .join(" | ");
  }

  if (event.type === "email.failed" && event.data.failed?.reason) {
    return event.data.failed.reason;
  }

  return undefined;
}

function mapResendWebhookOutcome(
  eventType: string,
): ProviderResponseOutcomeRequest["outcome"] | null {
  switch (eventType) {
    case "email.sent":
      return "accepted";
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.failed":
    case "email.suppressed":
      return "failed";
    default:
      return null;
  }
}

function verifyAndAdaptResendWebhook(
  rawBody: string,
  request: NextRequest,
): ParsedProviderOutcomeEvent {
  const webhook = new Webhook(readResendWebhookSecret());

  try {
    webhook.verify(rawBody, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    });
  } catch {
    throw new IntakeResponseProviderOutcomeError(
      "Invalid Resend webhook signature.",
      401,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new IntakeResponseProviderOutcomeError("Invalid request body.", 400);
  }

  const parsed = resendWebhookEventSchema.safeParse(payload);
  if (!parsed.success) {
    throw new IntakeResponseProviderOutcomeError(
      "Invalid Resend webhook payload.",
      400,
    );
  }

  const providerEventId = request.headers.get("svix-id");
  const outcome = mapResendWebhookOutcome(parsed.data.type);

  if (!outcome) {
    return {
      kind: "ignored",
      provider: "resend",
      providerEventId,
      rawEventType: parsed.data.type,
      reason: "Resend event does not map to a response outcome.",
    };
  }

  const providerMessageId = parsed.data.data.email_id?.trim() || null;
  const deliveryAttemptId =
    parsed.data.data.tags?.witnessops_delivery_attempt_id?.trim() ||
    parsed.data.data.tags?.deliveryAttemptId?.trim() ||
    null;

  const normalized = providerResponseOutcomeRequestSchema.safeParse({
    provider: "resend",
    providerEventId,
    providerMessageId,
    deliveryAttemptId,
    outcome,
    observedAt: parsed.data.created_at,
    source: "provider_webhook",
    rawEventType: parsed.data.type,
    detail: buildResendEventDetail(parsed.data),
  });

  if (!normalized.success) {
    throw new IntakeResponseProviderOutcomeError(
      "Resend webhook is missing the provider identifiers required to match a response attempt.",
      400,
    );
  }

  return {
    kind: "record",
    request: normalized.data,
  };
}

// ---------------------------------------------------------------------------
// M365 delivery event adapter
// ---------------------------------------------------------------------------

const m365DeliveryEventSchema = z.object({
  messageId: z.string().trim().min(1),
  deliveryAttemptId: z.string().trim().min(1).optional(),
  status: z.enum(["delivered", "bounced", "failed", "accepted"]),
  observedAt: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
  rawEventType: z.string().trim().min(1),
  detail: z.string().trim().max(2_000).optional(),
});

function readM365WebhookSecret(): string {
  const secret = process.env.WITNESSOPS_M365_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new IntakeResponseProviderOutcomeError(
      "WITNESSOPS_M365_WEBHOOK_SECRET is required for M365 webhook verification.",
      500,
    );
  }

  return secret;
}

function verifyM365Hmac(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signatureHeader, "hex"),
    );
  } catch {
    return false;
  }
}

function hasM365WebhookHeaders(request: NextRequest): boolean {
  return Boolean(request.headers.get("x-witnessops-m365-hmac"));
}

function verifyAndAdaptM365Webhook(
  rawBody: string,
  request: NextRequest,
): ParsedProviderOutcomeEvent {
  const signatureHeader = request.headers.get("x-witnessops-m365-hmac") ?? "";
  const secret = readM365WebhookSecret();

  if (!verifyM365Hmac(rawBody, signatureHeader, secret)) {
    throw new IntakeResponseProviderOutcomeError(
      "Invalid M365 webhook HMAC signature.",
      401,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new IntakeResponseProviderOutcomeError("Invalid request body.", 400);
  }

  const parsed = m365DeliveryEventSchema.safeParse(payload);
  if (!parsed.success) {
    throw new IntakeResponseProviderOutcomeError(
      "Invalid M365 delivery event payload.",
      400,
    );
  }

  const normalized = providerResponseOutcomeRequestSchema.safeParse({
    provider: "m365",
    providerEventId: parsed.data.eventId,
    providerMessageId: parsed.data.messageId,
    deliveryAttemptId: parsed.data.deliveryAttemptId ?? null,
    outcome: parsed.data.status,
    observedAt: parsed.data.observedAt,
    source: "provider_webhook",
    rawEventType: parsed.data.rawEventType,
    detail: parsed.data.detail,
  });

  if (!normalized.success) {
    throw new IntakeResponseProviderOutcomeError(
      "M365 webhook is missing the provider identifiers required to match a response attempt.",
      400,
    );
  }

  return {
    kind: "record",
    request: normalized.data,
  };
}

export async function parseProviderOutcomeEvent(
  request: NextRequest,
): Promise<ParsedProviderOutcomeEvent> {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    throw new IntakeResponseProviderOutcomeError("Invalid request body.", 400);
  }

  if (hasResendWebhookHeaders(request)) {
    return verifyAndAdaptResendWebhook(rawBody, request);
  }

  if (hasM365WebhookHeaders(request)) {
    return verifyAndAdaptM365Webhook(rawBody, request);
  }

  return parseTrustedNormalizedProviderOutcome(rawBody, request);
}
