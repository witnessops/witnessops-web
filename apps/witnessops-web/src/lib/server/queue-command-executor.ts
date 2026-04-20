import { randomUUID } from "node:crypto";

import type { AdminActorAuthSource } from "@/lib/token-contract";

import {
  type QueueClarificationRecord,
  type QueuePriority,
  type QueueProjectionRecord,
  type QueueRecordBundle,
  type QueueResponseRecord,
  type QueueWorkflowState,
  type ScopeContractRecord,
  getIntakeById,
  updateIntake,
} from "./token-store";
import { appendQueueEvent, readQueueEvents, type QueueEventType } from "./queue-event-ledger";
import {
  buildQueueBundle,
  recordClarification,
  recordResponse,
  recordScopeContract,
} from "./queue-projection";

export type QueueCommandName =
  | "queue.claim"
  | "queue.assign"
  | "queue.reassign"
  | "queue.unassign"
  | "queue.override_assign"
  | "queue.set_priority"
  | "queue.request_clarification"
  | "queue.clear_clarification"
  | "queue.start_scope_draft"
  | "queue.approve_scope_contract"
  | "queue.supersede_scope_contract"
  | "queue.withdraw_scope_contract"
  | "queue.record_response";

export type QueueReasonCode =
  | "QUEUE_STATE_PRECONDITION_FAILED"
  | "OWNER_CONFLICT"
  | "ASSIGNMENT_NOT_ALLOWED"
  | "AUTHORIZATION_REQUIRED"
  | "PROJECTION_VERSION_MISMATCH"
  | "IDEMPOTENCY_REPLAY"
  | "NO_CURRENT_SCOPE_CONTRACT"
  | "SCOPE_CONTRACT_NOT_CURRENT"
  | "SCOPE_CONTRACT_STATUS_INVALID"
  | "SCOPE_CONTRACT_DRAFT_ALREADY_EXISTS"
  | "CLARIFICATION_REQUIRED";

interface QueueCommandContext {
  intakeId: string;
  actor: string;
  actorAuthSource: AdminActorAuthSource;
  actorSessionHash: string | null;
  isAdmin: boolean;
  expectedProjectionVersion?: number;
  expectedEventSequence?: number;
  idempotencyKey: string;
  source: string;
}

export type QueueCommandPayload =
  | { command: "queue.claim" }
  | { command: "queue.assign"; targetOperator: string }
  | { command: "queue.reassign"; targetOperator: string }
  | { command: "queue.unassign" }
  | { command: "queue.override_assign"; targetOperator: string; reason: string }
  | { command: "queue.set_priority"; priority: QueuePriority }
  | { command: "queue.request_clarification"; question: string; reason: string }
  | { command: "queue.clear_clarification"; reason: string }
  | {
      command: "queue.start_scope_draft";
      scopeStatement: string;
      systemsInScope?: string[];
      actorsInScope?: string[];
      explicitOutOfScope?: string[];
    }
  | {
      command: "queue.approve_scope_contract";
      approvalNote?: string;
    }
  | { command: "queue.supersede_scope_contract"; reason: string }
  | { command: "queue.withdraw_scope_contract"; reason: string }
  | {
      command: "queue.record_response";
      responseSummary: string;
      clarificationResolutionNote?: string;
    };

export interface QueueCommandSuccess {
  ok: true;
  command: QueueCommandName;
  intakeId: string;
  emittedEvents: QueueEventType[];
  projection: QueueProjectionRecord;
  replayed?: boolean;
  reasonCodes?: QueueReasonCode[];
}

export interface QueueCommandFailure {
  ok: false;
  command: QueueCommandName;
  intakeId: string;
  reasonCodes: QueueReasonCode[];
}

export type QueueCommandResult = QueueCommandSuccess | QueueCommandFailure;

function nowIso(): string {
  return new Date().toISOString();
}

function failure(
  command: QueueCommandName,
  intakeId: string,
  codes: QueueReasonCode[],
): QueueCommandFailure {
  return { ok: false, command, intakeId, reasonCodes: codes };
}

function normalizeList(values?: string[]): string[] {
  if (!values) return [];
  return values.map((value) => value.trim()).filter(Boolean);
}

function ensureActor(actor: string): string {
  const normalized = actor.trim();
  if (!normalized) {
    throw new Error("actor is required");
  }
  return normalized;
}

function findScopeContract(
  bundle: QueueRecordBundle,
  scopeContractId: string,
): ScopeContractRecord | null {
  return bundle.scopeContracts.find(
    (record) => record.scopeContractId === scopeContractId,
  ) ?? null;
}

function updateScopeContract(
  bundle: QueueRecordBundle,
  scopeContractId: string,
  update: (record: ScopeContractRecord) => ScopeContractRecord,
): ScopeContractRecord[] {
  return bundle.scopeContracts.map((record) =>
    record.scopeContractId === scopeContractId ? update(record) : record,
  );
}

async function isIdempotencyReplay(
  intakeId: string,
  command: QueueCommandName,
  idempotencyKey: string,
): Promise<boolean> {
  if (!idempotencyKey) return false;
  const events = await readQueueEvents();
  return events.some((event) => {
    if (event.intake_id !== intakeId) return false;
    if (!event.payload) return false;
    if (event.payload.command !== command) return false;
    return event.payload.idempotencyKey === idempotencyKey;
  });
}

function applyWorkflowTransition(args: {
  projection: QueueProjectionRecord;
  nextState: QueueWorkflowState;
}): QueueProjectionRecord {
  return {
    ...args.projection,
    queueWorkflowState: args.nextState,
  };
}

export async function applyQueueCommand(
  ctx: QueueCommandContext,
  command: QueueCommandPayload,
): Promise<QueueCommandResult> {
  const intake = await getIntakeById(ctx.intakeId);
  if (!intake) {
    return failure(command.command, ctx.intakeId, [
      "QUEUE_STATE_PRECONDITION_FAILED",
    ]);
  }

  const actor = ensureActor(ctx.actor);
  const bundle = buildQueueBundle(intake);
  const projection = bundle.projection;

  if (
    typeof ctx.expectedProjectionVersion === "number" &&
    ctx.expectedProjectionVersion !== projection.projectionVersion
  ) {
    return failure(command.command, intake.intakeId, [
      "PROJECTION_VERSION_MISMATCH",
    ]);
  }
  if (
    typeof ctx.expectedEventSequence === "number" &&
    ctx.expectedEventSequence !== projection.eventSequence
  ) {
    return failure(command.command, intake.intakeId, [
      "PROJECTION_VERSION_MISMATCH",
    ]);
  }

  if (await isIdempotencyReplay(intake.intakeId, command.command, ctx.idempotencyKey)) {
    return {
      ok: true,
      command: command.command,
      intakeId: intake.intakeId,
      emittedEvents: [],
      projection,
      replayed: true,
      reasonCodes: ["IDEMPOTENCY_REPLAY"],
    };
  }

  const occurredAt = nowIso();
  const nextProjectionVersion = projection.projectionVersion + 1;
  const basePayload = {
    command: command.command,
    idempotencyKey: ctx.idempotencyKey,
    actor,
    actorAuthSource: ctx.actorAuthSource,
    actorSessionHash: ctx.actorSessionHash,
    projectionVersion: nextProjectionVersion,
  };

  let nextProjection: QueueProjectionRecord = {
    ...projection,
    projectionVersion: nextProjectionVersion,
    lastOperatorActionAt: occurredAt,
  };
  let nextBundle: QueueRecordBundle = { ...bundle };
  let nextOperatorAction = intake.operatorAction ?? null;
  const events: Array<{ eventType: QueueEventType; payload: Record<string, unknown> }> = [];

  function pushEvent(eventType: QueueEventType, payload: Record<string, unknown>) {
    events.push({ eventType, payload: { ...basePayload, ...payload } });
  }

  function transition(nextState: QueueWorkflowState) {
    const fromState = nextProjection.queueWorkflowState;
    nextProjection = applyWorkflowTransition({
      projection: nextProjection,
      nextState,
    });
    pushEvent("queue.workflow_transitioned", {
      fromState,
      toState: nextState,
    });
  }

  switch (command.command) {
    case "queue.claim": {
      if (nextProjection.assignedOperator) {
        return failure(command.command, intake.intakeId, ["OWNER_CONFLICT"]);
      }
      nextProjection.assignedOperator = actor;
      pushEvent("queue.operator_claimed", { assignedOperator: actor });
      break;
    }
    case "queue.assign": {
      if (!ctx.isAdmin) {
        return failure(command.command, intake.intakeId, [
          "AUTHORIZATION_REQUIRED",
        ]);
      }
      if (nextProjection.assignedOperator) {
        return failure(command.command, intake.intakeId, ["OWNER_CONFLICT"]);
      }
      const target = command.targetOperator.trim();
      if (!target) {
        return failure(command.command, intake.intakeId, [
          "ASSIGNMENT_NOT_ALLOWED",
        ]);
      }
      nextProjection.assignedOperator = target;
      pushEvent("queue.operator_assigned", { assignedOperator: target });
      break;
    }
    case "queue.reassign": {
      if (!nextProjection.assignedOperator) {
        return failure(command.command, intake.intakeId, [
          "ASSIGNMENT_NOT_ALLOWED",
        ]);
      }
      const target = command.targetOperator.trim();
      if (!target || target === nextProjection.assignedOperator) {
        return failure(command.command, intake.intakeId, [
          "OWNER_CONFLICT",
        ]);
      }
      nextProjection.assignedOperator = target;
      pushEvent("queue.operator_reassigned", { assignedOperator: target });
      break;
    }
    case "queue.unassign": {
      if (!nextProjection.assignedOperator) {
        return failure(command.command, intake.intakeId, [
          "ASSIGNMENT_NOT_ALLOWED",
        ]);
      }
      nextProjection.assignedOperator = null;
      pushEvent("queue.operator_unassigned", {});
      break;
    }
    case "queue.override_assign": {
      if (!ctx.isAdmin) {
        return failure(command.command, intake.intakeId, [
          "AUTHORIZATION_REQUIRED",
        ]);
      }
      const target = command.targetOperator.trim();
      const reason = command.reason.trim();
      if (!target || !reason) {
        return failure(command.command, intake.intakeId, [
          "ASSIGNMENT_NOT_ALLOWED",
        ]);
      }
      nextProjection.assignedOperator = target;
      pushEvent("queue.assignment_overridden", {
        assignedOperator: target,
        reason,
      });
      break;
    }
    case "queue.set_priority": {
      if (nextProjection.queueWorkflowState === "responded") {
        return failure(command.command, intake.intakeId, [
          "QUEUE_STATE_PRECONDITION_FAILED",
        ]);
      }
      nextProjection.priority = command.priority;
      pushEvent("queue.priority_set", { priority: command.priority });
      break;
    }
    case "queue.request_clarification": {
      if (
        nextProjection.queueWorkflowState !== "pending_operator_review" &&
        nextProjection.queueWorkflowState !== "scope_drafting"
      ) {
        return failure(command.command, intake.intakeId, [
          "QUEUE_STATE_PRECONDITION_FAILED",
        ]);
      }
      if (nextProjection.clarificationOutstanding) {
        return failure(command.command, intake.intakeId, [
          "CLARIFICATION_REQUIRED",
        ]);
      }
      const question = command.question.trim();
      const reason = command.reason.trim();
      if (!question || !reason) {
        return failure(command.command, intake.intakeId, [
          "CLARIFICATION_REQUIRED",
        ]);
      }
      const clarification: QueueClarificationRecord = {
        clarificationRecordId: `clar_${randomUUID().replace(/-/g, "")}`,
        intakeId: intake.intakeId,
        question,
        reason,
        actor,
        recordedAt: occurredAt,
      };
      nextOperatorAction = {
        kind: "request_clarification",
        recordedAt: occurredAt,
        actor,
        reason,
        clarificationQuestion: question,
      };
      nextBundle = {
        ...nextBundle,
        clarifications: recordClarification(nextBundle.clarifications, clarification),
      };
      nextProjection.currentClarificationRecordId = clarification.clarificationRecordId;
      nextProjection.clarificationOutstanding = true;
      transition("clarification_pending");
      pushEvent("clarification.requested", {
        clarificationRecordId: clarification.clarificationRecordId,
        question,
        reason,
      });
      break;
    }
    case "queue.clear_clarification": {
      if (!nextProjection.clarificationOutstanding) {
        return failure(command.command, intake.intakeId, [
          "CLARIFICATION_REQUIRED",
        ]);
      }
      const reason = command.reason.trim();
      if (!reason) {
        return failure(command.command, intake.intakeId, [
          "CLARIFICATION_REQUIRED",
        ]);
      }
      const currentId = nextProjection.currentClarificationRecordId;
      if (currentId) {
        nextBundle = {
          ...nextBundle,
          clarifications: nextBundle.clarifications.map((record) =>
            record.clarificationRecordId === currentId
              ? {
                  ...record,
                  clearedAt: occurredAt,
                  clearedBy: actor,
                }
              : record,
          ),
        };
      }
      if (nextOperatorAction?.kind === "request_clarification") {
        nextOperatorAction = null;
      }
      nextProjection.currentClarificationRecordId = null;
      nextProjection.clarificationOutstanding = false;
      transition("pending_operator_review");
      pushEvent("clarification.cleared", {
        clarificationRecordId: currentId,
        reason,
      });
      break;
    }
    case "queue.start_scope_draft": {
      if (
        nextProjection.queueWorkflowState !== "pending_operator_review" &&
        nextProjection.queueWorkflowState !== "clarification_pending"
      ) {
        return failure(command.command, intake.intakeId, [
          "QUEUE_STATE_PRECONDITION_FAILED",
        ]);
      }
      if (nextProjection.clarificationOutstanding) {
        return failure(command.command, intake.intakeId, [
          "CLARIFICATION_REQUIRED",
        ]);
      }
      if (nextProjection.scopeContractStatus === "draft") {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_DRAFT_ALREADY_EXISTS",
        ]);
      }
      const scopeStatement = command.scopeStatement.trim();
      if (!scopeStatement) {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_STATUS_INVALID",
        ]);
      }
      const version =
        Math.max(0, ...nextBundle.scopeContracts.map((c) => c.version)) + 1;
      const scopeContract: ScopeContractRecord = {
        scopeContractId: `sc_${randomUUID().replace(/-/g, "")}`,
        intakeId: intake.intakeId,
        version,
        status: "draft",
        scopeStatement,
        systemsInScope: normalizeList(command.systemsInScope),
        actorsInScope: normalizeList(command.actorsInScope),
        explicitOutOfScope: normalizeList(command.explicitOutOfScope),
        createdAt: occurredAt,
        updatedAt: occurredAt,
      };
      nextBundle = {
        ...nextBundle,
        scopeContracts: recordScopeContract(nextBundle.scopeContracts, scopeContract),
      };
      nextProjection.currentScopeContractId = scopeContract.scopeContractId;
      nextProjection.scopeContractStatus = "draft";
      transition("scope_drafting");
      pushEvent("scope_contract.drafted", {
        scopeContractId: scopeContract.scopeContractId,
        scopeContractStatus: scopeContract.status,
        version: scopeContract.version,
      });
      break;
    }
    case "queue.approve_scope_contract": {
      if (nextProjection.queueWorkflowState !== "scope_drafting") {
        return failure(command.command, intake.intakeId, [
          "QUEUE_STATE_PRECONDITION_FAILED",
        ]);
      }
      const scopeContractId = nextProjection.currentScopeContractId;
      if (!scopeContractId) {
        return failure(command.command, intake.intakeId, [
          "NO_CURRENT_SCOPE_CONTRACT",
        ]);
      }
      const current = findScopeContract(nextBundle, scopeContractId);
      if (!current) {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_NOT_CURRENT",
        ]);
      }
      if (current.status !== "draft") {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_STATUS_INVALID",
        ]);
      }
      nextBundle = {
        ...nextBundle,
        scopeContracts: updateScopeContract(nextBundle, scopeContractId, (record) => ({
          ...record,
          status: "approved",
          approvedBy: actor,
          approvedAt: occurredAt,
          updatedAt: occurredAt,
        })),
      };
      nextProjection.scopeContractStatus = "approved";
      transition("scope_approved");
      pushEvent("scope_contract.approved", {
        scopeContractId,
        scopeContractStatus: "approved",
      });
      break;
    }
    case "queue.supersede_scope_contract": {
      if (nextProjection.queueWorkflowState !== "scope_approved") {
        return failure(command.command, intake.intakeId, [
          "QUEUE_STATE_PRECONDITION_FAILED",
        ]);
      }
      const scopeContractId = nextProjection.currentScopeContractId;
      if (!scopeContractId) {
        return failure(command.command, intake.intakeId, [
          "NO_CURRENT_SCOPE_CONTRACT",
        ]);
      }
      const current = findScopeContract(nextBundle, scopeContractId);
      if (!current) {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_NOT_CURRENT",
        ]);
      }
      if (current.status !== "approved") {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_STATUS_INVALID",
        ]);
      }
      nextBundle = {
        ...nextBundle,
        scopeContracts: updateScopeContract(nextBundle, scopeContractId, (record) => ({
          ...record,
          status: "superseded",
          updatedAt: occurredAt,
        })),
      };
      nextProjection.currentScopeContractId = null;
      nextProjection.scopeContractStatus = null;
      transition("scope_drafting");
      pushEvent("scope_contract.superseded", {
        scopeContractId,
        scopeContractStatus: "superseded",
        reason: command.reason,
      });
      break;
    }
    case "queue.withdraw_scope_contract": {
      if (nextProjection.queueWorkflowState !== "scope_approved") {
        return failure(command.command, intake.intakeId, [
          "QUEUE_STATE_PRECONDITION_FAILED",
        ]);
      }
      const scopeContractId = nextProjection.currentScopeContractId;
      if (!scopeContractId) {
        return failure(command.command, intake.intakeId, [
          "NO_CURRENT_SCOPE_CONTRACT",
        ]);
      }
      const current = findScopeContract(nextBundle, scopeContractId);
      if (!current) {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_NOT_CURRENT",
        ]);
      }
      if (current.status !== "approved") {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_STATUS_INVALID",
        ]);
      }
      nextBundle = {
        ...nextBundle,
        scopeContracts: updateScopeContract(nextBundle, scopeContractId, (record) => ({
          ...record,
          status: "withdrawn",
          updatedAt: occurredAt,
        })),
      };
      nextProjection.currentScopeContractId = null;
      nextProjection.scopeContractStatus = null;
      transition("scope_drafting");
      pushEvent("scope_contract.withdrawn", {
        scopeContractId,
        scopeContractStatus: "withdrawn",
        reason: command.reason,
      });
      break;
    }
    case "queue.record_response": {
      if (nextProjection.queueWorkflowState !== "scope_approved") {
        return failure(command.command, intake.intakeId, [
          "QUEUE_STATE_PRECONDITION_FAILED",
        ]);
      }
      const scopeContractId = nextProjection.currentScopeContractId;
      if (!scopeContractId) {
        return failure(command.command, intake.intakeId, [
          "NO_CURRENT_SCOPE_CONTRACT",
        ]);
      }
      const current = findScopeContract(nextBundle, scopeContractId);
      if (!current || current.status !== "approved") {
        return failure(command.command, intake.intakeId, [
          "SCOPE_CONTRACT_NOT_CURRENT",
        ]);
      }
      const responseSummary = command.responseSummary.trim();
      if (!responseSummary) {
        return failure(command.command, intake.intakeId, [
          "QUEUE_STATE_PRECONDITION_FAILED",
        ]);
      }
      const response: QueueResponseRecord = {
        responseId: `qrs_${randomUUID().replace(/-/g, "")}`,
        intakeId: intake.intakeId,
        scopeContractId,
        respondedBy: actor,
        respondedAt: occurredAt,
        channel: intake.channel,
        responseSummary,
        clarificationResolutionNote:
          command.clarificationResolutionNote?.trim() || null,
      };
      nextBundle = {
        ...nextBundle,
        responses: recordResponse(nextBundle.responses, response),
      };
      nextProjection.responseRecordId = response.responseId;
      nextProjection.respondedAt = occurredAt;
      transition("responded");
      pushEvent("queue.response_recorded", {
        responseRecordId: response.responseId,
        respondedAt: response.respondedAt,
        scopeContractId,
      });
      break;
    }
  }

  const nextEventSequence = projection.eventSequence + events.length;
  nextProjection.eventSequence = nextEventSequence;

  const updatedIntake = await updateIntake(intake.intakeId, (current) => ({
    ...current,
    updatedAt: occurredAt,
    operatorAction: nextOperatorAction,
    queue: {
      projection: nextProjection,
      scopeContracts: nextBundle.scopeContracts,
      clarifications: nextBundle.clarifications,
      responses: nextBundle.responses,
    },
  }));

  try {
    for (const event of events) {
      await appendQueueEvent({
        intake: updatedIntake,
        eventType: event.eventType,
        occurredAt,
        payload: event.payload,
        source: ctx.source,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Queue mutation persisted to snapshot but failed to append queue events. ${message}`,
    );
  }

  return {
    ok: true,
    command: command.command,
    intakeId: intake.intakeId,
    emittedEvents: events.map((event) => event.eventType),
    projection: nextProjection,
  };
}
