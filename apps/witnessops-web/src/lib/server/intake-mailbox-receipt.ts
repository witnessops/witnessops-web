import type {
  MailboxReceiptRequest,
  MailboxReceiptResponse,
} from "@/lib/token-contract";
import type { IntakeMailboxReceiptRecord } from "./token-store";

import { appendIntakeEvent, readIntakeEvents } from "./intake-event-ledger";
import { evaluatePolicyClosure } from "./policy-closure";
import { getAllIntakes, updateIntake, getIntakeById, type IntakeRecord } from "./token-store";

export class IntakeMailboxReceiptError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "IntakeMailboxReceiptError";
    this.status = status;
  }
}

function findMatchingIntakeByDeliveryAttempt(
  intakes: IntakeRecord[],
  deliveryAttemptId: string,
): IntakeRecord {
  const matches = intakes.filter(
    (intake) =>
      intake.firstResponse &&
      intake.firstResponse.deliveryAttemptId === deliveryAttemptId,
  );

  if (matches.length === 0) {
    throw new IntakeMailboxReceiptError(
      "No intake matches the supplied delivery attempt ID.",
      404,
    );
  }

  if (matches.length > 1) {
    throw new IntakeMailboxReceiptError(
      "Delivery attempt ID matches multiple intakes.",
      409,
    );
  }

  return matches[0];
}

async function findExistingMailboxReceiptEvent(args: {
  intakeId: string;
  receiptId: string;
}) {
  const events = await readIntakeEvents();
  return events.find(
    (event) =>
      event.intake_id === args.intakeId &&
      event.event_type === "INTAKE_MAILBOX_RECEIPT_RECORDED" &&
      event.payload?.receiptId === args.receiptId,
  );
}

export async function recordIntakeMailboxReceipt(
  input: MailboxReceiptRequest,
): Promise<MailboxReceiptResponse> {
  const intakes = await getAllIntakes();
  const intake = findMatchingIntakeByDeliveryAttempt(
    intakes,
    input.deliveryAttemptId,
  );

  if (!intake.firstResponse) {
    throw new IntakeMailboxReceiptError(
      "No response delivery metadata exists for this intake.",
      409,
    );
  }

  const existingEvent = await findExistingMailboxReceiptEvent({
    intakeId: intake.intakeId,
    receiptId: input.receiptId,
  });

  const detail = input.detail?.trim() || null;

  if (existingEvent) {
    return {
      status: "already_recorded",
      intakeId: intake.intakeId,
      channel: intake.channel,
      threadId: intake.threadId,
      deliveryAttemptId: input.deliveryAttemptId,
      receiptId: input.receiptId,
      outcome: input.status,
      observedAt: input.observedAt,
      detail,
    };
  }

  const record: IntakeMailboxReceiptRecord = {
    status: input.status,
    observedAt: input.observedAt,
    deliveryAttemptId: input.deliveryAttemptId,
    providerMessageId: input.providerMessageId ?? null,
    receiptId: input.receiptId,
    detail,
  };

  await updateIntake(intake.intakeId, (current) => {
    const existing = current.responseMailboxReceipt;
    const shouldReplace =
      !existing ||
      input.observedAt > existing.observedAt ||
      (input.observedAt === existing.observedAt &&
        mailboxReceiptRank(input.status) >=
          mailboxReceiptRank(existing.status));

    return {
      ...current,
      responseMailboxReceipt: shouldReplace
        ? record
        : current.responseMailboxReceipt,
      updatedAt:
        input.observedAt > current.updatedAt
          ? input.observedAt
          : current.updatedAt,
    };
  });

  try {
    await appendIntakeEvent({
      event_type: "INTAKE_MAILBOX_RECEIPT_RECORDED",
      occurred_at: input.observedAt,
      channel: intake.channel,
      intake_id: intake.intakeId,
      issuance_id: intake.latestIssuanceId,
      thread_id: intake.threadId,
      previous_state: intake.state,
      next_state: intake.state,
      source: "api/provider-events/mailbox-receipt",
      payload: {
        deliveryAttemptId: input.deliveryAttemptId,
        providerMessageId: input.providerMessageId ?? null,
        receiptId: input.receiptId,
        outcome: input.status,
        detail,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new IntakeMailboxReceiptError(
      `Mailbox receipt was written to the snapshot, but the ledger append failed. ${message}`,
      500,
    );
  }

  // Evaluate auto-resolution policy after recording the receipt
  try {
    const updatedIntake = await getIntakeById(intake.intakeId);
    if (updatedIntake) {
      await evaluatePolicyClosure(
        updatedIntake,
        `api/provider-events/mailbox-receipt:policy_closure`,
      );
    }
  } catch {
    // Policy closure is best-effort; the receipt fact is already durable.
  }

  return {
    status: "recorded",
    intakeId: intake.intakeId,
    channel: intake.channel,
    threadId: intake.threadId,
    deliveryAttemptId: input.deliveryAttemptId,
    receiptId: input.receiptId,
    outcome: input.status,
    observedAt: input.observedAt,
    detail,
  };
}

function mailboxReceiptRank(
  status: IntakeMailboxReceiptRecord["status"],
): number {
  switch (status) {
    case "accepted":
      return 1;
    case "delivered":
    case "bounced":
    case "failed":
      return 2;
    default:
      return 0;
  }
}
