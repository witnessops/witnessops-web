import type {
  ProviderResponseOutcomeRequest,
  ProviderResponseOutcomeResponse,
} from "@/lib/token-contract";
import type { IntakeResponseProviderOutcomeRecord } from "./token-store";

import { appendIntakeEvent, readIntakeEvents } from "./intake-event-ledger";
import { evaluatePolicyClosure } from "./policy-closure";
import { getAllIntakes, updateIntake, getIntakeById, type IntakeRecord } from "./token-store";

function outcomeRank(
  status: IntakeResponseProviderOutcomeRecord["status"],
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

function shouldReplaceOutcome(
  current: IntakeResponseProviderOutcomeRecord | undefined,
  next: IntakeResponseProviderOutcomeRecord,
): boolean {
  if (!current) {
    return true;
  }

  if (next.observedAt > current.observedAt) {
    return true;
  }

  if (next.observedAt < current.observedAt) {
    return false;
  }

  return outcomeRank(next.status) >= outcomeRank(current.status);
}

function readProviderEventSecret(): string {
  const secret = process.env.WITNESSOPS_PROVIDER_EVENT_SECRET?.trim();
  if (!secret) {
    throw new Error("WITNESSOPS_PROVIDER_EVENT_SECRET is required");
  }

  return secret;
}

export function validateProviderEventSecret(candidate: string | null): boolean {
  if (!candidate) {
    return false;
  }

  try {
    return candidate === readProviderEventSecret();
  } catch {
    return false;
  }
}

async function findMatchingIntake(
  input: ProviderResponseOutcomeRequest,
): Promise<IntakeRecord> {
  const intakes = await getAllIntakes();
  const matches = intakes.filter((intake) => {
    if (!intake.firstResponse) {
      return false;
    }

    if (intake.firstResponse.provider !== input.provider) {
      return false;
    }

    const providerMessageMatch =
      Boolean(input.providerMessageId) &&
      intake.firstResponse.providerMessageId === input.providerMessageId;
    const attemptMatch =
      Boolean(input.deliveryAttemptId) &&
      intake.firstResponse.deliveryAttemptId === input.deliveryAttemptId;

    return providerMessageMatch || attemptMatch;
  });

  if (matches.length === 0) {
    throw new IntakeResponseProviderOutcomeError(
      "No intake matches the supplied provider response evidence.",
      404,
    );
  }

  if (matches.length > 1) {
    throw new IntakeResponseProviderOutcomeError(
      "Provider response evidence matches multiple intakes. Supply a more specific identifier.",
      409,
    );
  }

  return matches[0];
}

async function findExistingProviderOutcomeEvent(args: {
  intakeId: string;
  providerEventId: string;
}) {
  const events = await readIntakeEvents();
  return events.find(
    (event) =>
      event.intake_id === args.intakeId &&
      event.event_type === "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED" &&
      event.payload?.providerEventId === args.providerEventId,
  );
}

export class IntakeResponseProviderOutcomeError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "IntakeResponseProviderOutcomeError";
    this.status = status;
  }
}

export async function recordIntakeResponseProviderOutcome(
  input: ProviderResponseOutcomeRequest,
): Promise<ProviderResponseOutcomeResponse> {
  const intake = await findMatchingIntake(input);
  if (!intake.firstResponse) {
    throw new IntakeResponseProviderOutcomeError(
      "No response delivery metadata exists for this intake.",
      409,
    );
  }

  const existingEvent = await findExistingProviderOutcomeEvent({
    intakeId: intake.intakeId,
    providerEventId: input.providerEventId,
  });
  const detail = input.detail?.trim() || null;
  const providerMessageId =
    input.providerMessageId ?? intake.firstResponse.providerMessageId ?? null;
  const deliveryAttemptId =
    input.deliveryAttemptId ?? intake.firstResponse.deliveryAttemptId;

  if (existingEvent) {
    return {
      status: "already_recorded",
      intakeId: intake.intakeId,
      channel: intake.channel,
      threadId: intake.threadId,
      provider: input.provider,
      providerEventId: input.providerEventId,
      providerMessageId,
      deliveryAttemptId,
      outcome: input.outcome,
      observedAt: input.observedAt,
      source: input.source,
      rawEventType: input.rawEventType,
      detail,
    };
  }

  const record: IntakeResponseProviderOutcomeRecord = {
    status: input.outcome,
    observedAt: input.observedAt,
    provider: input.provider,
    providerEventId: input.providerEventId,
    providerMessageId,
    deliveryAttemptId,
    source: input.source,
    rawEventType: input.rawEventType,
    detail,
  };

  await updateIntake(intake.intakeId, (current) => ({
    ...current,
    responseProviderOutcome: shouldReplaceOutcome(
      current.responseProviderOutcome,
      record,
    )
      ? record
      : current.responseProviderOutcome,
    updatedAt:
      input.observedAt > current.updatedAt
        ? input.observedAt
        : current.updatedAt,
  }));

  try {
    await appendIntakeEvent({
      event_type: "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED",
      occurred_at: input.observedAt,
      channel: intake.channel,
      intake_id: intake.intakeId,
      issuance_id: intake.latestIssuanceId,
      thread_id: intake.threadId,
      previous_state: intake.state,
      next_state: intake.state,
      source: `api/provider-events/response-outcome:${input.source}`,
      payload: {
        provider: input.provider,
        providerEventId: input.providerEventId,
        providerMessageId,
        deliveryAttemptId,
        outcome: input.outcome,
        source: input.source,
        rawEventType: input.rawEventType,
        detail,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new IntakeResponseProviderOutcomeError(
      `Provider outcome was written to the snapshot, but the ledger append failed. ${message}`,
      500,
    );
  }

  // Evaluate auto-resolution policy after recording the outcome
  try {
    const updatedIntake = await getIntakeById(intake.intakeId);
    if (updatedIntake) {
      await evaluatePolicyClosure(
        updatedIntake,
        `api/provider-events/response-outcome:policy_closure`,
      );
    }
  } catch {
    // Policy closure is best-effort; the outcome fact is already durable.
  }

  return {
    status: "recorded",
    intakeId: intake.intakeId,
    channel: intake.channel,
    threadId: intake.threadId,
    provider: input.provider,
    providerEventId: input.providerEventId,
    providerMessageId,
    deliveryAttemptId,
    outcome: input.outcome,
    observedAt: input.observedAt,
    source: input.source,
    rawEventType: input.rawEventType,
    detail,
  };
}
