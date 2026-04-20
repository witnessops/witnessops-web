import {
  type IntakeRecord,
  type QueueClarificationRecord,
  type QueueProjectionRecord,
  type QueueRecordBundle,
  type QueueResponseRecord,
  type QueueWorkflowState,
  type ScopeContractRecord,
} from "./token-store";
import type { IntakeEventRecord } from "./intake-event-ledger";
import { isQueueEventType, readQueueEvents } from "./queue-event-ledger";

const DEFAULT_QUEUE_STATE: QueueWorkflowState = "pending_operator_review";

function nowIso(): string {
  return new Date().toISOString();
}

export function buildQueueBundle(intake: IntakeRecord): QueueRecordBundle {
  const existing = intake.queue ?? null;
  if (existing) {
    return {
      projection: {
        ...existing.projection,
        queueWorkflowState: existing.projection.queueWorkflowState ?? DEFAULT_QUEUE_STATE,
        priority: existing.projection.priority ?? "normal",
        assignedOperator: existing.projection.assignedOperator ?? null,
        currentScopeContractId: existing.projection.currentScopeContractId ?? null,
        scopeContractStatus: existing.projection.scopeContractStatus ?? null,
        currentClarificationRecordId:
          existing.projection.currentClarificationRecordId ?? null,
        clarificationOutstanding:
          existing.projection.clarificationOutstanding ?? false,
        respondedAt: existing.projection.respondedAt ?? null,
        lastOperatorActionAt: existing.projection.lastOperatorActionAt ?? null,
        projectionVersion: existing.projection.projectionVersion ?? 0,
        eventSequence: existing.projection.eventSequence ?? 0,
        responseRecordId: existing.projection.responseRecordId ?? null,
      },
      scopeContracts: existing.scopeContracts ?? [],
      clarifications: existing.clarifications ?? [],
      responses: existing.responses ?? [],
    };
  }

  return {
    projection: {
      queueWorkflowState: DEFAULT_QUEUE_STATE,
      assignedOperator: null,
      priority: "normal",
      currentScopeContractId: null,
      scopeContractStatus: null,
      currentClarificationRecordId: null,
      clarificationOutstanding: false,
      respondedAt: null,
      lastOperatorActionAt: null,
      projectionVersion: 0,
      eventSequence: 0,
      responseRecordId: null,
    },
    scopeContracts: [],
    clarifications: [],
    responses: [],
  };
}

function readPayloadString(
  payload: IntakeEventRecord["payload"],
  key: string,
): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readPayloadNumber(
  payload: IntakeEventRecord["payload"],
  key: string,
): number | null {
  const value = payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function applyQueueEvent(
  projection: QueueProjectionRecord,
  event: IntakeEventRecord,
): QueueProjectionRecord {
  const payload = event.payload ?? {};
  const next = { ...projection };
  next.eventSequence += 1;
  next.lastOperatorActionAt = event.occurred_at;

  const projectionVersion = readPayloadNumber(payload, "projectionVersion");
  if (projectionVersion !== null) {
    next.projectionVersion = Math.max(next.projectionVersion, projectionVersion);
  }

  switch (event.event_type) {
    case "queue.operator_claimed":
    case "queue.operator_assigned":
    case "queue.operator_reassigned":
    case "queue.assignment_overridden":
      next.assignedOperator = readPayloadString(payload, "assignedOperator");
      break;
    case "queue.operator_unassigned":
      next.assignedOperator = null;
      break;
    case "queue.priority_set":
      next.priority = (readPayloadString(payload, "priority") ??
        next.priority) as QueueProjectionRecord["priority"];
      break;
    case "clarification.requested":
      next.currentClarificationRecordId =
        readPayloadString(payload, "clarificationRecordId");
      next.clarificationOutstanding = true;
      break;
    case "clarification.cleared":
      next.currentClarificationRecordId = null;
      next.clarificationOutstanding = false;
      break;
    case "scope_contract.drafted":
    case "scope_contract.approved":
    case "scope_contract.superseded":
    case "scope_contract.withdrawn":
      next.currentScopeContractId =
        readPayloadString(payload, "scopeContractId") ??
        next.currentScopeContractId;
      next.scopeContractStatus = (readPayloadString(payload, "scopeContractStatus") ??
        next.scopeContractStatus) as QueueProjectionRecord["scopeContractStatus"];
      if (
        event.event_type === "scope_contract.superseded" ||
        event.event_type === "scope_contract.withdrawn"
      ) {
        next.currentScopeContractId = null;
        next.scopeContractStatus = null;
      }
      break;
    case "queue.response_recorded":
      next.responseRecordId = readPayloadString(payload, "responseRecordId");
      next.respondedAt =
        readPayloadString(payload, "respondedAt") ?? next.respondedAt;
      break;
    case "queue.workflow_transitioned":
      next.queueWorkflowState =
        (readPayloadString(payload, "toState") ??
          next.queueWorkflowState) as QueueProjectionRecord["queueWorkflowState"];
      break;
    default:
      break;
  }

  return next;
}

export function rebuildQueueProjection(
  intake: IntakeRecord,
  events: IntakeEventRecord[],
): QueueProjectionRecord {
  const base = buildQueueBundle(intake).projection;
  const queueEvents = events.filter(
    (event) =>
      event.intake_id === intake.intakeId && isQueueEventType(event.event_type),
  );
  let projection = { ...base, eventSequence: 0 };
  for (const event of queueEvents) {
    projection = applyQueueEvent(projection, event);
  }
  return projection;
}

export interface QueueProjectionVerification {
  intakeId: string;
  liveProjectionVersion: number;
  rebuiltEventSequence: number;
  match: boolean;
  invariantPass: boolean;
  mismatchFields: string[];
  reasonCodes: string[];
  checkedAt: string;
}

export function verifyQueueProjection(
  intake: IntakeRecord,
  rebuilt: QueueProjectionRecord,
): QueueProjectionVerification {
  const live = buildQueueBundle(intake).projection;
  const mismatchFields: string[] = [];
  const fieldsToCompare: Array<keyof QueueProjectionRecord> = [
    "assignedOperator",
    "priority",
    "queueWorkflowState",
    "currentScopeContractId",
    "scopeContractStatus",
  ];

  for (const field of fieldsToCompare) {
    if (live[field] !== rebuilt[field]) {
      mismatchFields.push(field);
    }
  }

  const invariantPass =
    !(live.queueWorkflowState === "scope_approved") ||
    live.scopeContractStatus === "approved";

  const reasonCodes: string[] = [];
  if (mismatchFields.length > 0) {
    reasonCodes.push("PROJECTION_REBUILD_MISMATCH");
  }
  if (!invariantPass) {
    reasonCodes.push("INVARIANT_VIOLATION");
  }

  return {
    intakeId: intake.intakeId,
    liveProjectionVersion: live.projectionVersion,
    rebuiltEventSequence: rebuilt.eventSequence,
    match: mismatchFields.length === 0,
    invariantPass,
    mismatchFields,
    reasonCodes,
    checkedAt: nowIso(),
  };
}

export async function verifyQueueProjectionForIntake(
  intake: IntakeRecord,
): Promise<QueueProjectionVerification> {
  const events = await readQueueEvents();
  const rebuilt = rebuildQueueProjection(intake, events);
  return verifyQueueProjection(intake, rebuilt);
}

export function recordScopeContract(
  contracts: ScopeContractRecord[],
  record: ScopeContractRecord,
): ScopeContractRecord[] {
  return [...contracts, record];
}

export function recordClarification(
  clarifications: QueueClarificationRecord[],
  record: QueueClarificationRecord,
): QueueClarificationRecord[] {
  return [...clarifications, record];
}

export function recordResponse(
  responses: QueueResponseRecord[],
  record: QueueResponseRecord,
): QueueResponseRecord[] {
  return [...responses, record];
}
