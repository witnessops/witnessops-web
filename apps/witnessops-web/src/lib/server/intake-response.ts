import { createHash, randomUUID } from "node:crypto";

import { getChannelMailbox } from "@/lib/channel-policy";
import type {
  AdminActorAuthSource,
  AdminIntakeRespondRequest,
  AdminIntakeRespondResponse,
} from "@/lib/token-contract";

import { appendIntakeEvent, readIntakeEvents } from "./intake-event-ledger";
import {
  isSecurityBuyerAddress,
  type EmailMessageClass,
} from "./email-signature-policy";
import { sendMail } from "./send-verification-email";
import {
  getIntakeById,
  getIssuanceById,
  updateIntake,
  type IntakeResponseRecord,
} from "./token-store";

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function digestResponseBody(body: string): string {
  return `sha256:${createHash("sha256").update(body, "utf8").digest("hex")}`;
}

function generateDeliveryAttemptId(): string {
  return `rsp_${randomUUID().replace(/-/g, "")}`;
}

function messageClassForIntakeResponse(
  channel: string,
  email: string,
): EmailMessageClass {
  if (channel === "support") {
    return "support";
  }

  return isSecurityBuyerAddress(email)
    ? "security_buyer_outreach"
    : "founder_outreach";
}

async function hasRespondedEvent(intakeId: string): Promise<boolean> {
  const events = await readIntakeEvents();
  return events.some(
    (event) =>
      event.intake_id === intakeId && event.event_type === "INTAKE_RESPONDED",
  );
}

export class IntakeResponseError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "IntakeResponseError";
    this.status = status;
  }
}

interface RespondToIntakeInput extends AdminIntakeRespondRequest {
  actor: string;
  actorAuthSource: AdminActorAuthSource;
  actorSessionHash: string | null;
  source: string;
}

/**
 * `responded` means the first external operator reply was delivered for an
 * admitted intake. Opening or viewing an item does not change state.
 */
export async function respondToIntake(
  input: RespondToIntakeInput,
): Promise<AdminIntakeRespondResponse> {
  const intake = await getIntakeById(input.intakeId);
  if (!intake) {
    throw new IntakeResponseError("Unknown intake.", 404);
  }

  if (!intake.threadId) {
    throw new IntakeResponseError(
      "Cannot send an operator reply without a threadId.",
      409,
    );
  }

  const respondedEventExists = await hasRespondedEvent(intake.intakeId);
  const latestIssuance = intake.latestIssuanceId
    ? await getIssuanceById(intake.latestIssuanceId)
    : null;

  if (intake.state === "responded") {
    if (!intake.firstResponse || !respondedEventExists) {
      throw new IntakeResponseError(
        "A response delivery is recorded without matching ledger evidence. Reconcile before retrying.",
        409,
      );
    }

    return {
      status: "already_responded",
      channel: intake.channel,
      intakeId: intake.intakeId,
      issuanceId: intake.latestIssuanceId,
      threadId: intake.threadId,
      email: intake.email,
      respondedAt: intake.firstResponse.deliveredAt,
      admissionState: "responded",
      actor: intake.firstResponse.actor,
      actorAuthSource: intake.firstResponse.actorAuthSource ?? "local_bypass",
      actorSessionHash: intake.firstResponse.actorSessionHash ?? null,
      provider: intake.firstResponse.provider,
      providerMessageId: intake.firstResponse.providerMessageId,
      deliveryAttemptId: intake.firstResponse.deliveryAttemptId,
      mailbox: intake.firstResponse.mailbox,
    };
  }

  if (intake.firstResponse && !respondedEventExists) {
    throw new IntakeResponseError(
      "A previous response delivery is pending ledger reconciliation. Refusing to resend.",
      409,
    );
  }

  if (intake.state !== "admitted") {
    throw new IntakeResponseError(
      "Only admitted items can receive a first operator reply.",
      409,
    );
  }

  const subject = input.subject.trim();
  const body = input.body.trim();
  const mailbox = getChannelMailbox(intake.channel);
  const deliveryAttemptId = generateDeliveryAttemptId();
  const delivery = await sendMail({
    to: intake.email,
    from: mailbox,
    subject,
    text: body,
    deliveryAttemptId,
    messageClass: messageClassForIntakeResponse(intake.channel, intake.email),
  });

  const respondedAt = delivery.deliveredAt || nowIso();
  const responseRecord: IntakeResponseRecord = {
    deliveryAttemptId,
    subject,
    bodyDigest: digestResponseBody(body),
    actor: input.actor,
    actorAuthSource: input.actorAuthSource,
    actorSessionHash: input.actorSessionHash,
    mailbox,
    provider: delivery.provider,
    providerMessageId: delivery.providerMessageId,
    deliveredAt: respondedAt,
  };

  const updatedIntake = await updateIntake(intake.intakeId, (current) => ({
    ...current,
    state: "responded",
    updatedAt: respondedAt,
    respondedAt,
    firstResponse: current.firstResponse ?? responseRecord,
  }));

  try {
    await appendIntakeEvent({
      event_type: "INTAKE_RESPONDED",
      occurred_at: respondedAt,
      channel: updatedIntake.channel,
      intake_id: updatedIntake.intakeId,
      issuance_id: latestIssuance?.issuanceId ?? updatedIntake.latestIssuanceId,
      thread_id: updatedIntake.threadId,
      previous_state: intake.state,
      next_state: "responded",
      source: input.source,
      payload: {
        actor: input.actor,
        actorAuthSource: input.actorAuthSource,
        actorSessionHash: input.actorSessionHash,
        mailbox,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        deliveryAttemptId,
        subject,
        bodyDigest: responseRecord.bodyDigest,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new IntakeResponseError(
      `Operator reply was delivered and the snapshot was updated, but the ledger append failed. Queue divergence is expected until reconciliation. ${message}`,
      500,
    );
  }

  return {
    status: "sent",
    channel: updatedIntake.channel,
    intakeId: updatedIntake.intakeId,
    issuanceId: updatedIntake.latestIssuanceId,
    threadId: updatedIntake.threadId,
    email: updatedIntake.email,
    respondedAt,
    admissionState: "responded",
    actor: input.actor,
    actorAuthSource: input.actorAuthSource,
    actorSessionHash: input.actorSessionHash,
    provider: delivery.provider,
    providerMessageId: delivery.providerMessageId,
    deliveryAttemptId,
    mailbox,
  };
}
