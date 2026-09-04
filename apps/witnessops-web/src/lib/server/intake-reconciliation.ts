import { parseProviderOutcomeStatus } from "@/lib/provider-outcomes";
import type {
  AdminActorAuthSource,
  AdminIntakeReconcileRequest,
  AdminIntakeReconcileResponse,
} from "@/lib/token-contract";

import { appendIntakeEvent, readIntakeEvents } from "./intake-event-ledger";
import { isManualReconciliationBlocked } from "./evidence-resolution";
import { requireIntakeBusinessAuthority } from "./admin-business-authorization";
import type { AdminRole } from "./admin-authorization";
import {
  validateReconciliationNote,
  reconciliationNotePolicyVersion,
} from "./reconciliation-note-policy";
import {
  classifyDeliveryEvidenceSubcase,
} from "./reconciliation-subcases";
import {
  getIntakeById,
  updateIntakeWithinLock,
  withIntakeLock,
  type IntakeReconciliationRecord,
} from "./token-store";

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function readIntakeEventsById(intakeId: string) {
  const events = await readIntakeEvents();
  return events.filter((event) => event.intake_id === intakeId);
}

function latestLedgerProviderOutcomeStatus(
  events: Awaited<ReturnType<typeof readIntakeEventsById>>,
) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.event_type !== "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED") {
      continue;
    }

    return parseProviderOutcomeStatus(
      typeof event.payload?.outcome === "string" ? event.payload.outcome : null,
    );
  }

  return null;
}

export class IntakeReconciliationError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "IntakeReconciliationError";
    this.status = status;
  }
}

interface ReconcileIntakeInput extends AdminIntakeReconcileRequest {
  actor: string;
  role: AdminRole;
  actorAuthSource: AdminActorAuthSource;
  actorSessionHash: string | null;
  source: string;
}

/**
 * Reconciliation records a new fact: an operator reviewed outbound delivery
 * evidence that exists without matching durable confirmation and explicitly
 * reconciled that ambiguity. It does not invent or backfill INTAKE_RESPONDED.
 */
export async function reconcileIntakeResponse(
  input: ReconcileIntakeInput,
): Promise<AdminIntakeReconcileResponse> {
  return withIntakeLock(input.intakeId, async (handle) => {
    const intake = await getIntakeById(input.intakeId);
    if (!intake) {
      throw new IntakeReconciliationError("Unknown intake.", 404);
    }
    requireIntakeBusinessAuthority(input, intake);

    if (!intake.firstResponse && !intake.responseAttempt) {
      throw new IntakeReconciliationError(
        "No outbound response evidence exists for this intake.",
        409,
      );
    }
    const events = await readIntakeEventsById(intake.intakeId);
    const hasRespondedEvent = events.some(
      (event) => event.event_type === "INTAKE_RESPONDED",
    );
    const existingReconciliationEvent = events.find(
      (event) => event.event_type === "INTAKE_RESPONSE_RECONCILED",
    );

    if (hasRespondedEvent) {
      throw new IntakeReconciliationError(
        "INTAKE_RESPONDED already exists for this intake. Reconciliation is only for missing durable confirmation.",
        409,
      );
    }

    if (intake.reconciliation && existingReconciliationEvent) {
      return {
        status: "already_reconciled",
        intakeId: intake.intakeId,
        channel: intake.channel,
        email: intake.email,
        threadId: intake.threadId,
        reconciledAt: intake.reconciliation.reconciledAt,
        actor: intake.reconciliation.actor,
        actorAuthSource: intake.reconciliation.actorAuthSource ?? "local_bypass",
        actorSessionHash: intake.reconciliation.actorSessionHash ?? null,
        deliveryAttemptId: intake.reconciliation.deliveryAttemptId,
        evidenceSubcase:
          intake.reconciliation.evidenceSubcase ?? input.evidenceSubcase,
        notePolicyVersion:
          intake.reconciliation.notePolicyVersion ??
          reconciliationNotePolicyVersion,
        provider: intake.reconciliation.provider,
        providerMessageId: intake.reconciliation.providerMessageId,
        mailbox: intake.reconciliation.mailbox,
        note: intake.reconciliation.note,
      };
    }

    if (intake.reconciliation && !existingReconciliationEvent) {
      throw new IntakeReconciliationError(
        "Snapshot reconciliation metadata exists without a matching ledger event. Reconcile the ledger before proceeding.",
        409,
      );
    }
    if (!intake.reconciliation && existingReconciliationEvent) {
      throw new IntakeReconciliationError(
        "Ledger reconciliation exists without matching snapshot metadata. Rebuild the snapshot before proceeding.",
        409,
      );
    }

    const providerOutcomeStatus = latestLedgerProviderOutcomeStatus(events);

    const reconciliationBlock = isManualReconciliationBlocked({
      providerOutcomeStatus,
      mailboxReceiptStatus: intake.responseMailboxReceipt?.status ?? null,
    });
    if (reconciliationBlock.blocked) {
      throw new IntakeReconciliationError(reconciliationBlock.reason!, 409);
    }

    const reconciledAt = nowIso();
    const evidence = intake.firstResponse
      ? {
          deliveryAttemptId: intake.firstResponse.deliveryAttemptId,
          provider: intake.firstResponse.provider,
          providerMessageId: intake.firstResponse.providerMessageId,
          mailbox: intake.firstResponse.mailbox,
          observedAt:
            intake.respondedAt ??
            intake.firstResponse.providerAcceptedAt ??
            intake.firstResponse.deliveredAt ??
            intake.updatedAt,
        }
      : {
          deliveryAttemptId: intake.responseAttempt!.deliveryAttemptId,
          provider: "unknown",
          providerMessageId: null,
          mailbox: intake.responseAttempt!.mailbox,
          observedAt: intake.responseAttempt!.updatedAt,
        };
    const evidenceSubcase = classifyDeliveryEvidenceSubcase({
      responseProvider: evidence.provider,
      responseProviderMessageId: evidence.providerMessageId,
      responseDeliveryAttemptId: evidence.deliveryAttemptId,
      responseMailbox: evidence.mailbox,
      respondedAt: evidence.observedAt,
    });

    if (!evidenceSubcase) {
      throw new IntakeReconciliationError(
        "Unable to determine the current evidence case for this ambiguity. Rebuild the queue before reconciling.",
        409,
      );
    }

    if (input.evidenceSubcase !== evidenceSubcase) {
      throw new IntakeReconciliationError(
        `Evidence case mismatch. Expected ${evidenceSubcase}, received ${input.evidenceSubcase}. Reload the queue and review the current ambiguity before reconciling.`,
        409,
      );
    }

    let note: string;
    try {
      note = validateReconciliationNote({
        evidenceSubcase,
        note: input.note,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new IntakeReconciliationError(message, 400);
    }

    const record: IntakeReconciliationRecord = {
      reconciledAt,
      actor: input.actor,
      actorAuthSource: input.actorAuthSource,
      actorSessionHash: input.actorSessionHash,
      note,
      evidenceSubcase,
      notePolicyVersion: reconciliationNotePolicyVersion,
      deliveryAttemptId: evidence.deliveryAttemptId,
      provider: evidence.provider,
      providerMessageId: evidence.providerMessageId,
      mailbox: evidence.mailbox,
    };
    if (
      intake.responseAttempt &&
      (intake.responseAttempt.deliveryAttemptId !== evidence.deliveryAttemptId ||
        intake.responseAttempt.status !== "needs_reconciliation")
    ) {
      throw new IntakeReconciliationError(
        "The response delivery attempt is still active or no longer matches this evidence. Reload the queue before reconciling.",
        409,
      );
    }

    await updateIntakeWithinLock(handle, intake.intakeId, (recordToUpdate) => ({
      ...recordToUpdate,
      reconciliation: record,
      responseAttempt: recordToUpdate.responseAttempt
        ? {
            ...recordToUpdate.responseAttempt,
            status: "reconciled",
            updatedAt: reconciledAt,
          }
        : undefined,
      updatedAt: reconciledAt,
    }));
    try {
      await appendIntakeEvent({
        event_type: "INTAKE_RESPONSE_RECONCILED",
        occurred_at: reconciledAt,
        channel: intake.channel,
        intake_id: intake.intakeId,
        issuance_id: intake.latestIssuanceId,
        thread_id: intake.threadId,
        previous_state: intake.state,
        next_state: intake.state,
        source: input.source,
        payload: {
          actor: input.actor,
          actorAuthSource: input.actorAuthSource,
          actorSessionHash: input.actorSessionHash,
          note,
          evidenceSubcase,
          notePolicyVersion: reconciliationNotePolicyVersion,
          deliveryAttemptId: record.deliveryAttemptId,
          provider: record.provider,
          providerMessageId: record.providerMessageId,
          mailbox: record.mailbox,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new IntakeReconciliationError(
        `Reconciliation metadata was written to the snapshot, but the ledger append failed. ${message}`,
        500,
      );
    }

    return {
      status: "reconciled",
      intakeId: intake.intakeId,
      channel: intake.channel,
      email: intake.email,
      threadId: intake.threadId,
      reconciledAt,
      actor: input.actor,
      actorAuthSource: input.actorAuthSource,
      actorSessionHash: input.actorSessionHash,
      deliveryAttemptId: record.deliveryAttemptId,
      evidenceSubcase,
      notePolicyVersion: reconciliationNotePolicyVersion,
      provider: record.provider,
      providerMessageId: record.providerMessageId,
      mailbox: record.mailbox,
      note,
    };
  });
}
