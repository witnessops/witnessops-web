import { timingSafeEqual } from "node:crypto";

import type {
  ProviderResponseOutcomeRequest,
  ProviderResponseOutcomeResponse,
} from "@/lib/token-contract";
import type { IntakeResponseProviderOutcomeRecord } from "./token-store";

import { appendIntakeEvent, readIntakeEvents } from "./intake-event-ledger";
import { evaluatePolicyClosureWithinLock } from "./policy-closure";
import { compareRfc3339Instants, laterRfc3339 } from "./rfc3339-instant";
import {
  getAllIntakes,
  getIntakeById,
  updateIntakeWithinLock,
  withIntakeLock,
  type IntakeRecord,
} from "./token-store";

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

  const instantOrder = compareRfc3339Instants(
    next.observedAt,
    current.observedAt,
  );
  if (instantOrder > 0) {
    return true;
  }

  if (instantOrder < 0) {
    return false;
  }

  return outcomeRank(next.status) >= outcomeRank(current.status);
}

function readConfiguredSecret(envName: string): string {
  const secret = process.env[envName]?.trim();
  if (!secret) {
    throw new Error(`${envName} is required`);
  }

  return secret;
}

function secretsMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function validateConfiguredSecret(
  envName: string,
  candidate: string | null,
): boolean {
  if (!candidate) {
    return false;
  }

  try {
    return secretsMatch(readConfiguredSecret(envName), candidate);
  } catch {
    return false;
  }
}

export function validateResponseOutcomeSecret(candidate: string | null): boolean {
  return validateConfiguredSecret("WITNESSOPS_RESPONSE_OUTCOME_SECRET", candidate);
}

export function validateMailboxReceiptSecret(candidate: string | null): boolean {
  return validateConfiguredSecret("WITNESSOPS_MAILBOX_RECEIPT_SECRET", candidate);
}

interface ResponseEvidenceCandidate {
  provider: string | null;
  providerMessageId: string | null;
  deliveryAttemptId: string;
}

function responseEvidenceCandidates(
  intake: IntakeRecord,
): ResponseEvidenceCandidate[] {
  const candidates: ResponseEvidenceCandidate[] = [];
  if (intake.firstResponse) {
    candidates.push({
      provider: intake.firstResponse.provider,
      providerMessageId: intake.firstResponse.providerMessageId,
      deliveryAttemptId: intake.firstResponse.deliveryAttemptId,
    });
  }
  if (intake.responseAttempt) {
    candidates.push({
      provider: intake.responseAttempt.provider ?? null,
      providerMessageId: intake.responseAttempt.providerMessageId ?? null,
      deliveryAttemptId: intake.responseAttempt.deliveryAttemptId,
    });
  }
  return candidates;
}

function matchingResponseEvidence(
  intake: IntakeRecord,
  input: ProviderResponseOutcomeRequest,
): ResponseEvidenceCandidate[] {
  return responseEvidenceCandidates(intake).filter(
    (candidate) =>
      candidate.provider === input.provider &&
      (!input.providerMessageId ||
        candidate.providerMessageId === input.providerMessageId) &&
      (!input.deliveryAttemptId ||
        candidate.deliveryAttemptId === input.deliveryAttemptId),
  );
}

async function findMatchingIntake(
  input: ProviderResponseOutcomeRequest,
): Promise<IntakeRecord> {
  const intakes = await getAllIntakes();
  const matches = intakes.filter(
    (intake) => matchingResponseEvidence(intake, input).length > 0,
  );

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
  provider: string;
  providerEventId: string;
}) {
  const events = await readIntakeEvents();
  return events.find(
    (event) =>
      event.intake_id === args.intakeId &&
      event.event_type === "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED" &&
      event.payload?.provider === args.provider &&
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
  const matchedIntake = await findMatchingIntake(input);
  return withIntakeLock(matchedIntake.intakeId, async (handle) => {
    const intake = await getIntakeById(matchedIntake.intakeId);
    if (!intake || !intake.firstResponse && !intake.responseAttempt) {
      throw new IntakeResponseProviderOutcomeError(
        "No response delivery metadata exists for this intake.",
        409,
      );
    }
    if (matchingResponseEvidence(intake, input).length === 0) {
      throw new IntakeResponseProviderOutcomeError(
        "Provider response evidence no longer matches this intake.",
        409,
      );
    }

    const detail = input.detail?.trim() || null;
    const providerMessageId =
      input.providerMessageId ?? intake.firstResponse?.providerMessageId ?? null;
    const deliveryAttemptId =
      input.deliveryAttemptId ??
      intake.firstResponse?.deliveryAttemptId ??
      intake.responseAttempt!.deliveryAttemptId;
    const response = (status: ProviderResponseOutcomeResponse["status"]): ProviderResponseOutcomeResponse => ({
      status,
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
    });
    if (await findExistingProviderOutcomeEvent({
      intakeId: intake.intakeId,
      provider: input.provider,
      providerEventId: input.providerEventId,
    })) {
      try {
        await evaluatePolicyClosureWithinLock(
          handle,
          `api/provider-events/response-outcome:policy_closure_replay`,
        );
      } catch {
        // The provider outcome remains durable and a later replay can retry closure.
      }
      return response("already_recorded");
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

    await updateIntakeWithinLock(handle, intake.intakeId, (current) => ({
      ...current,
      responseProviderOutcome: shouldReplaceOutcome(
        current.responseProviderOutcome,
        record,
      )
        ? record
        : current.responseProviderOutcome,
      updatedAt: laterRfc3339(input.observedAt, current.updatedAt),
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

    try {
      await evaluatePolicyClosureWithinLock(
        handle,
        `api/provider-events/response-outcome:policy_closure`,
      );
    } catch {
      // Policy closure is best-effort; the outcome fact is already durable.
    }

    return response("recorded");
  });
}
