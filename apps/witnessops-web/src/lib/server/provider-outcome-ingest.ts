import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { z } from "zod";

import {
  providerResponseOutcomeRequestSchema,
  type ProviderResponseOutcomeRequest,
} from "@/lib/token-contract";

import {
  IntakeResponseProviderOutcomeError,
  validateProviderEventSecret,
} from "./intake-response-provider-outcome";
import type { VerificationDeliveryStatus } from "./verification-delivery-status";

const resendWebhookHeaders = [
  "svix-id",
  "svix-timestamp",
  "svix-signature",
] as const;

const PROVIDER_OUTCOME_BODY_LIMIT_BYTES = 64 * 1024;

async function readProviderOutcomeBody(request: NextRequest): Promise<string> {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > PROVIDER_OUTCOME_BODY_LIMIT_BYTES
  ) {
    throw new IntakeResponseProviderOutcomeError(
      "Provider outcome body exceeds the 64 KiB limit.",
      413,
    );
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > PROVIDER_OUTCOME_BODY_LIMIT_BYTES) {
      await reader.cancel();
      throw new IntakeResponseProviderOutcomeError(
        "Provider outcome body exceeds the 64 KiB limit.",
        413,
      );
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
    "utf8",
  );
}

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
    suppressed: z
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

export interface RecordedVerificationDeliveryEvent {
  kind: "record";
  provider: "resend";
  providerEventId: string;
  providerMessageId: string;
  status: VerificationDeliveryStatus;
  observedAt: string;
  rawEventType: string;
  detail?: string;
}

export type ParsedVerificationDeliveryEvent =
  | IgnoredProviderOutcomeEvent
  | RecordedVerificationDeliveryEvent;

function readResendWebhookSecret(): string {
  const secret = process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("Provider webhook verification is unavailable", {
      provider: "resend",
      errorType: "configuration",
    });
    throw new IntakeResponseProviderOutcomeError(
      "Unauthorized provider event source.",
      401,
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

  if (event.type === "email.suppressed" && event.data.suppressed?.reason) {
    return event.data.suppressed.reason;
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

function mapResendVerificationDeliveryStatus(
  eventType: string,
): VerificationDeliveryStatus | null {
  switch (eventType) {
    case "email.sent":
      return "provider_accepted";
    case "email.delivery_delayed":
      return "delivery_delayed";
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.failed":
      return "failed";
    case "email.suppressed":
      return "suppressed";
    default:
      return null;
  }
}

function verifyAndParseResendWebhookPayload(
  rawBody: string,
  request: NextRequest,
): z.infer<typeof resendWebhookEventSchema> {
  const webhook = new Webhook(readResendWebhookSecret());

  try {
    webhook.verify(rawBody, {
      "webhook-id": request.headers.get("svix-id") ?? "",
      "webhook-timestamp": request.headers.get("svix-timestamp") ?? "",
      "webhook-signature": request.headers.get("svix-signature") ?? "",
    });
  } catch {
    throw new IntakeResponseProviderOutcomeError(
      "Unauthorized provider event source.",
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

  return parsed.data;
}

function verifyAndAdaptResendWebhook(
  rawBody: string,
  request: NextRequest,
): ParsedProviderOutcomeEvent {
  const event = verifyAndParseResendWebhookPayload(rawBody, request);

  const providerEventId = request.headers.get("svix-id");
  const outcome = mapResendWebhookOutcome(event.type);

  if (!outcome) {
    return {
      kind: "ignored",
      provider: "resend",
      providerEventId,
      rawEventType: event.type,
      reason: "Resend event does not map to a response outcome.",
    };
  }

  const providerMessageId = event.data.email_id?.trim() || null;
  const deliveryAttemptId =
    event.data.tags?.witnessops_delivery_attempt_id?.trim() ||
    event.data.tags?.deliveryAttemptId?.trim() ||
    null;

  const normalized = providerResponseOutcomeRequestSchema.safeParse({
    provider: "resend",
    providerEventId,
    providerMessageId,
    deliveryAttemptId,
    outcome,
    observedAt: event.created_at,
    source: "provider_webhook",
    rawEventType: event.type,
    detail: buildResendEventDetail(event),
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

export async function parseResendVerificationDeliveryEvent(
  request: NextRequest,
): Promise<ParsedVerificationDeliveryEvent> {
  const rawBody = await readProviderOutcomeBody(request);
  if (!rawBody.trim()) {
    throw new IntakeResponseProviderOutcomeError("Invalid request body.", 400);
  }
  if (!hasResendWebhookHeaders(request)) {
    throw new IntakeResponseProviderOutcomeError(
      "Unauthorized provider event source.",
      401,
    );
  }

  const event = verifyAndParseResendWebhookPayload(rawBody, request);
  const providerEventId = request.headers.get("svix-id");
  if (!providerEventId) {
    throw new IntakeResponseProviderOutcomeError(
      "Unauthorized provider event source.",
      401,
    );
  }

  const status = mapResendVerificationDeliveryStatus(event.type);
  if (!status) {
    return {
      kind: "ignored",
      provider: "resend",
      providerEventId,
      rawEventType: event.type,
      reason: "Resend event does not map to verification delivery status.",
    };
  }

  const providerMessageId = event.data.email_id?.trim();
  if (!providerMessageId) {
    throw new IntakeResponseProviderOutcomeError(
      "Resend webhook is missing the email identifier required to match a verification issuance.",
      400,
    );
  }

  return {
    kind: "record",
    provider: "resend",
    providerEventId,
    providerMessageId,
    status,
    observedAt: event.created_at,
    rawEventType: event.type,
    detail: buildResendEventDetail(event),
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
    console.error("Provider webhook verification is unavailable", {
      provider: "m365",
      errorType: "configuration",
    });
    throw new IntakeResponseProviderOutcomeError(
      "Unauthorized provider event source.",
      401,
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
      "Unauthorized provider event source.",
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
  const rawBody = await readProviderOutcomeBody(request);
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
