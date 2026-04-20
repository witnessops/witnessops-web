import type { AdmissionState } from "@/lib/token-contract";

import {
  appendIntakeEvent,
  readIntakeEvents,
  type IntakeEventRecord,
} from "./intake-event-ledger";
import type { IntakeRecord } from "./token-store";

export type QueueEventType =
  | "queue.operator_claimed"
  | "queue.operator_assigned"
  | "queue.operator_reassigned"
  | "queue.operator_unassigned"
  | "queue.assignment_overridden"
  | "queue.priority_set"
  | "queue.workflow_transitioned"
  | "queue.response_recorded"
  | "clarification.requested"
  | "clarification.cleared"
  | "scope_contract.drafted"
  | "scope_contract.approved"
  | "scope_contract.superseded"
  | "scope_contract.withdrawn";

const QUEUE_EVENT_PREFIXES = [
  "queue.",
  "clarification.",
  "scope_contract.",
] as const;

export function isQueueEventType(eventType: string): boolean {
  return QUEUE_EVENT_PREFIXES.some((prefix) => eventType.startsWith(prefix));
}

export async function readQueueEvents(): Promise<IntakeEventRecord[]> {
  const events = await readIntakeEvents();
  return events.filter((event) => isQueueEventType(event.event_type));
}

export async function appendQueueEvent(args: {
  intake: IntakeRecord;
  eventType: QueueEventType;
  occurredAt: string;
  payload: Record<string, unknown>;
  source: string;
}): Promise<IntakeEventRecord> {
  const previousState: AdmissionState = args.intake.state;
  const nextState: AdmissionState = args.intake.state;

  return appendIntakeEvent({
    event_type: args.eventType,
    occurred_at: args.occurredAt,
    channel: args.intake.channel,
    intake_id: args.intake.intakeId,
    issuance_id: args.intake.latestIssuanceId,
    thread_id: args.intake.threadId,
    previous_state: previousState,
    next_state: nextState,
    source: args.source,
    payload: args.payload,
  });
}
