import { appendIntakeEvent, readIntakeEvents } from "./intake-event-ledger";
import {
  getAllIssuances,
  getIntakeById,
  getIssuanceById,
  updateIssuance,
  withIssuanceLock,
} from "./token-store";
import type { VerificationDeliveryStatus } from "./verification-delivery-status";
import {
  inferVerificationDeliveryStatus,
  shouldReplaceVerificationDeliveryStatus,
  verificationDeliveryObservedAt,
} from "./verification-delivery-status";

export interface VerificationDeliveryOutcomeRequest {
  provider: string;
  providerEventId: string;
  providerMessageId: string;
  status: VerificationDeliveryStatus;
  observedAt: string;
  rawEventType: string;
  detail?: string;
}

export interface VerificationDeliveryOutcomeResponse {
  status: "recorded" | "already_recorded";
  issuanceId: string;
  provider: string;
  providerEventId: string;
  providerMessageId: string;
  deliveryStatus: VerificationDeliveryStatus;
  statusObservedAt: string | null;
  observedAt: string;
  rawEventType: string;
}

export class VerificationDeliveryOutcomeError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VerificationDeliveryOutcomeError";
    this.status = status;
  }
}

async function findMatchingIssuance(
  provider: string,
  providerMessageId: string,
) {
  const matches = (await getAllIssuances()).filter(
    (issuance) =>
      issuance.delivery.provider === provider &&
      issuance.delivery.providerMessageId === providerMessageId,
  );

  if (matches.length === 0) {
    throw new VerificationDeliveryOutcomeError(
      "No verification issuance matches the supplied provider message ID.",
      404,
    );
  }

  if (matches.length > 1) {
    throw new VerificationDeliveryOutcomeError(
      "Provider message ID matches multiple verification issuances.",
      409,
    );
  }

  return matches[0];
}

async function findExistingDeliveryEvent(providerEventId: string) {
  const events = await readIntakeEvents();
  return events.find(
    (event) =>
      event.event_type === "INTAKE_VERIFICATION_DELIVERY_UPDATED" &&
      event.payload?.providerEventId === providerEventId,
  );
}

function normalizedDetail(detail: string | undefined): string | null {
  const value = detail?.trim();
  return value ? value.slice(0, 2_000) : null;
}

function compareDeliveryEvents(args: {
  currentStatus: VerificationDeliveryStatus;
  currentObservedAt: string | null;
  nextStatus: VerificationDeliveryStatus;
  nextObservedAt: string;
}): boolean {
  return shouldReplaceVerificationDeliveryStatus(args);
}

export async function recordVerificationDeliveryOutcome(
  input: VerificationDeliveryOutcomeRequest,
): Promise<VerificationDeliveryOutcomeResponse> {
  const matchedIssuance = await findMatchingIssuance(
    input.provider,
    input.providerMessageId,
  );

  return withIssuanceLock(matchedIssuance.issuanceId, async () => {
    const issuance = await getIssuanceById(matchedIssuance.issuanceId);
    if (
      !issuance ||
      issuance.delivery.provider !== input.provider ||
      issuance.delivery.providerMessageId !== input.providerMessageId
    ) {
      throw new VerificationDeliveryOutcomeError(
        "Verification issuance no longer matches the provider message ID.",
        409,
      );
    }

    if (!issuance.intakeId) {
      throw new VerificationDeliveryOutcomeError(
        "Verification issuance has no intake record for delivery evidence.",
        409,
      );
    }
    const intake = await getIntakeById(issuance.intakeId);
    if (!intake) {
      throw new VerificationDeliveryOutcomeError(
        "Verification issuance intake record is unavailable.",
        409,
      );
    }

    const existingEvent = await findExistingDeliveryEvent(input.providerEventId);
    if (existingEvent) {
      if (existingEvent.issuance_id !== issuance.issuanceId) {
        throw new VerificationDeliveryOutcomeError(
          "Provider event ID is already associated with another issuance.",
          409,
        );
      }

      return {
        status: "already_recorded",
        issuanceId: issuance.issuanceId,
        provider: input.provider,
        providerEventId: input.providerEventId,
        providerMessageId: input.providerMessageId,
        deliveryStatus: inferVerificationDeliveryStatus(issuance.delivery),
        statusObservedAt: verificationDeliveryObservedAt(issuance.delivery),
        observedAt: input.observedAt,
        rawEventType: input.rawEventType,
      };
    }

    const currentStatus = inferVerificationDeliveryStatus(issuance.delivery);
    const currentObservedAt = verificationDeliveryObservedAt(issuance.delivery);
    const replaceCurrentStatus = compareDeliveryEvents({
      currentStatus,
      currentObservedAt,
      nextStatus: input.status,
      nextObservedAt: input.observedAt,
    });
    const detail = normalizedDetail(input.detail);
    const providerAcceptedAt =
      issuance.delivery.providerAcceptedAt ??
      (input.status === "provider_accepted" ? input.observedAt : null);

    const updatedIssuance = await updateIssuance(
      issuance.issuanceId,
      (current) => ({
        ...current,
        delivery: {
          ...current.delivery,
          providerAcceptedAt,
          ...(replaceCurrentStatus
            ? {
                status: input.status,
                statusObservedAt: input.observedAt,
                providerEventId: input.providerEventId,
                statusDetail: detail,
              }
            : {}),
        },
      }),
    );

    try {
      await appendIntakeEvent({
        event_type: "INTAKE_VERIFICATION_DELIVERY_UPDATED",
        occurred_at: input.observedAt,
        channel: intake.channel,
        intake_id: intake.intakeId,
        issuance_id: issuance.issuanceId,
        thread_id: intake.threadId,
        previous_state: intake.state,
        next_state: intake.state,
        source: "api/provider-events/verification-delivery:provider_webhook",
        payload: {
          provider: input.provider,
          providerEventId: input.providerEventId,
          providerMessageId: input.providerMessageId,
          status: input.status,
          effectiveStatus: inferVerificationDeliveryStatus(
            updatedIssuance.delivery,
          ),
          observedAt: input.observedAt,
          rawEventType: input.rawEventType,
          detail,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new VerificationDeliveryOutcomeError(
        `Verification delivery status was updated, but the ledger append failed. ${message}`,
        500,
      );
    }

    return {
      status: "recorded",
      issuanceId: updatedIssuance.issuanceId,
      provider: input.provider,
      providerEventId: input.providerEventId,
      providerMessageId: input.providerMessageId,
      deliveryStatus: inferVerificationDeliveryStatus(
        updatedIssuance.delivery,
      ),
      statusObservedAt: verificationDeliveryObservedAt(
        updatedIssuance.delivery,
      ),
      observedAt: input.observedAt,
      rawEventType: input.rawEventType,
    };
  });
}
