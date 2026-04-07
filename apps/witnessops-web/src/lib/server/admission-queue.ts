import type { ChannelName } from "@/lib/channel-policy";
import type {
  AdmissionState,
  AdminActorAuthSource,
} from "@/lib/token-contract";
import type {
  IntakeResponseProviderOutcomeSource,
  IntakeResponseProviderOutcomeStatus,
} from "@/lib/provider-outcomes";
import {
  parseProviderOutcomeSource,
  parseProviderOutcomeStatus,
} from "@/lib/provider-outcomes";

import { resolveAmbiguity } from "./evidence-resolution";

import {
  readIntakeEvents,
  type IntakeEventRecord,
} from "./intake-event-ledger";
import {
  classifyDeliveryEvidenceSubcase,
  deriveReconciliationReportSubcase,
  type DeliveryEvidenceSubcase,
  type ReconciliationReportSubcase,
} from "./reconciliation-subcases";
import {
  getAllIntakes,
  getAllIssuances,
  type AssessmentStatus,
  type IntakeRecord,
  type IntakeSubmissionRecord,
  type TokenIssuanceRecord,
} from "./token-store";

export const adminAdmissionStateOrder: AdmissionState[] = [
  "admitted",
  "verified",
  "verification_sent",
  "submitted",
  "responded",
  "expired",
  "rejected",
  "replayed",
];

const stateLabels: Record<AdmissionState, string> = {
  submitted: "submitted",
  verification_sent: "verification sent",
  verified: "verified",
  expired: "expired",
  replayed: "replayed",
  rejected: "rejected",
  admitted: "admitted",
  responded: "responded",
};

interface DerivedLedgerRow {
  intakeId: string;
  channel: ChannelName;
  email: string | null;
  state: AdmissionState;
  createdAt: string;
  updatedAt: string;
  latestIssuanceId: string | null;
  threadId: string | null;
  ledgerEventCount: number;
  responseProviderOutcomeStatus: IntakeResponseProviderOutcomeStatus | null;
  responseProviderOutcomeObservedAt: string | null;
  responseProviderOutcomeEventId: string | null;
  responseProviderOutcomeSource: IntakeResponseProviderOutcomeSource | null;
  responseProviderOutcomeRawEventType: string | null;
  responseProviderOutcomeDetail: string | null;
  responseProviderOutcomeProviderMessageId: string | null;
  responseProviderOutcomeDeliveryAttemptId: string | null;
  policyClosureSource: string | null;
  policyClosedAt: string | null;
  policyVersion: string | null;
  divergenceReasons: string[];
}

export interface AdmissionQueueRow {
  intakeId: string;
  channel: ChannelName;
  email: string | null;
  state: AdmissionState;
  createdAt: string;
  updatedAt: string;
  latestIssuanceId: string | null;
  threadId: string | null;
  queueEligible: boolean;
  ledgerEventCount: number;
  assessmentStatus: AssessmentStatus | null;
  assessmentRunId: string | null;
  /**
   * Local cache of the control-plane run id returned by the scope-approved
   * handoff. Display only — not the source of truth for downstream lifecycle
   * state. The authoritative facts live in control-plane (CP-001/CP-002).
   */
  controlPlaneRunId: string | null;
  /**
   * Operator-side action recorded against the intake (WEB-004). Surfaces
   * explicit reject and clarification-request outcomes to the admin queue.
   */
  operatorActionKind:
    | import("./token-store").OperatorActionRecord["kind"]
    | null;
  snapshotState: AdmissionState | null;
  submission: IntakeSubmissionRecord;
  firstResponseSubject: string | null;
  respondedAt: string | null;
  responseActor: string | null;
  responseActorAuthSource: AdminActorAuthSource | null;
  responseActorSessionHash: string | null;
  responseMailbox: string | null;
  responseProvider: string | null;
  responseProviderMessageId: string | null;
  responseDeliveryAttemptId: string | null;
  responseProviderOutcomeStatus: IntakeResponseProviderOutcomeStatus | null;
  responseProviderOutcomeObservedAt: string | null;
  responseProviderOutcomeEventId: string | null;
  responseProviderOutcomeSource: IntakeResponseProviderOutcomeSource | null;
  responseProviderOutcomeRawEventType: string | null;
  responseProviderOutcomeDetail: string | null;
  responseEvidenceSubcase: DeliveryEvidenceSubcase | null;
  mailboxReceiptStatus: IntakeResponseProviderOutcomeStatus | null;
  mailboxReceiptObservedAt: string | null;
  mailboxReceiptId: string | null;
  policyClosureSource: string | null;
  policyClosedAt: string | null;
  policyVersion: string | null;
  ambiguityResolutionKind:
    | "manual_reconciliation"
    | "provider_outcome"
    | "mailbox_receipt"
    | null;
  ambiguityResolvedAt: string | null;
  reconciliationRecordedAt: string | null;
  reconciliationActor: string | null;
  reconciliationActorAuthSource: AdminActorAuthSource | null;
  reconciliationActorSessionHash: string | null;
  reconciliationNote: string | null;
  reconciliationEvidenceSubcase: DeliveryEvidenceSubcase | null;
  reconciliationNotePolicyVersion: string | null;
  reconciliationSubcase: ReconciliationReportSubcase | null;
  source: "ledger" | "snapshot-only";
  reconciliationPending: boolean;
  reconciliationResolved: boolean;
  hasDivergence: boolean;
  divergenceReasons: string[];
}

export interface AdmissionQueueSummary {
  total: number;
  ready: number;
  divergent: number;
  reconciliationPending: number;
  reconciliationResolved: number;
  byState: Record<AdmissionState, number>;
}

export interface AdmissionQueueView {
  generatedAt: string;
  eventCount: number;
  summary: AdmissionQueueSummary;
  rows: AdmissionQueueRow[];
}

function emptyStateCounts(): Record<AdmissionState, number> {
  return {
    submitted: 0,
    verification_sent: 0,
    verified: 0,
    expired: 0,
    replayed: 0,
    rejected: 0,
    admitted: 0,
    responded: 0,
  };
}

function stateRank(state: AdmissionState): number {
  return adminAdmissionStateOrder.indexOf(state);
}

function compareIsoDescending(left: string, right: string): number {
  return right.localeCompare(left);
}

function payloadText(
  payload: IntakeEventRecord["payload"],
  key: string,
): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function uniqueReasons(reasons: string[]): string[] {
  return [...new Set(reasons)];
}

function providerOutcomeRank(
  status: IntakeResponseProviderOutcomeStatus | null,
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

function shouldProjectProviderOutcome(args: {
  currentObservedAt: string | null;
  currentStatus: IntakeResponseProviderOutcomeStatus | null;
  nextObservedAt: string;
  nextStatus: IntakeResponseProviderOutcomeStatus | null;
}): boolean {
  if (!args.currentObservedAt) {
    return true;
  }

  if (args.nextObservedAt > args.currentObservedAt) {
    return true;
  }

  if (args.nextObservedAt < args.currentObservedAt) {
    return false;
  }

  return (
    providerOutcomeRank(args.nextStatus) >=
    providerOutcomeRank(args.currentStatus)
  );
}

function buildDerivedLedgerRows(
  events: IntakeEventRecord[],
): Map<string, DerivedLedgerRow> {
  const rows = new Map<string, DerivedLedgerRow>();

  // The ledger is append-only. Replay in file order rather than re-sorting on
  // timestamps so closely spaced or skewed clocks cannot rewrite causality.
  for (const event of events) {
    const existing = rows.get(event.intake_id);
    const divergenceReasons = [...(existing?.divergenceReasons ?? [])];

    if (
      existing &&
      event.previous_state &&
      existing.state !== event.previous_state
    ) {
      divergenceReasons.push(
        `ledger transition mismatch before ${event.event_type}: expected ${event.previous_state}, saw ${existing.state}`,
      );
    }

    if (existing && existing.channel !== event.channel) {
      divergenceReasons.push(
        `ledger channel changed from ${existing.channel} to ${event.channel}`,
      );
    }

    const next: DerivedLedgerRow = {
      intakeId: event.intake_id,
      channel: existing?.channel ?? event.channel,
      email: existing?.email ?? payloadText(event.payload, "email"),
      state: event.next_state,
      createdAt: existing?.createdAt ?? event.occurred_at,
      updatedAt: event.occurred_at,
      latestIssuanceId: event.issuance_id ?? existing?.latestIssuanceId ?? null,
      threadId: event.thread_id ?? existing?.threadId ?? null,
      ledgerEventCount: (existing?.ledgerEventCount ?? 0) + 1,
      responseProviderOutcomeStatus:
        existing?.responseProviderOutcomeStatus ?? null,
      responseProviderOutcomeObservedAt:
        existing?.responseProviderOutcomeObservedAt ?? null,
      responseProviderOutcomeEventId:
        existing?.responseProviderOutcomeEventId ?? null,
      responseProviderOutcomeSource:
        existing?.responseProviderOutcomeSource ?? null,
      responseProviderOutcomeRawEventType:
        existing?.responseProviderOutcomeRawEventType ?? null,
      responseProviderOutcomeDetail:
        existing?.responseProviderOutcomeDetail ?? null,
      responseProviderOutcomeProviderMessageId:
        existing?.responseProviderOutcomeProviderMessageId ?? null,
      responseProviderOutcomeDeliveryAttemptId:
        existing?.responseProviderOutcomeDeliveryAttemptId ?? null,
      policyClosureSource: existing?.policyClosureSource ?? null,
      policyClosedAt: existing?.policyClosedAt ?? null,
      policyVersion: existing?.policyVersion ?? null,
      divergenceReasons,
    };

    if (
      event.event_type === "INTAKE_ADMITTED" &&
      existing?.state === "admitted"
    ) {
      next.divergenceReasons.push("multiple INTAKE_ADMITTED events recorded");
    }

    if (event.event_type === "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED") {
      const nextStatus = parseProviderOutcomeStatus(
        payloadText(event.payload, "outcome"),
      );

      if (
        shouldProjectProviderOutcome({
          currentObservedAt: next.responseProviderOutcomeObservedAt,
          currentStatus: next.responseProviderOutcomeStatus,
          nextObservedAt: event.occurred_at,
          nextStatus,
        })
      ) {
        next.responseProviderOutcomeStatus =
          nextStatus ?? next.responseProviderOutcomeStatus;
        next.responseProviderOutcomeObservedAt = event.occurred_at;
        next.responseProviderOutcomeEventId =
          payloadText(event.payload, "providerEventId") ??
          next.responseProviderOutcomeEventId;
        next.responseProviderOutcomeSource =
          parseProviderOutcomeSource(payloadText(event.payload, "source")) ??
          next.responseProviderOutcomeSource;
        next.responseProviderOutcomeRawEventType =
          payloadText(event.payload, "rawEventType") ??
          next.responseProviderOutcomeRawEventType;
        next.responseProviderOutcomeDetail =
          payloadText(event.payload, "detail") ??
          next.responseProviderOutcomeDetail;
        next.responseProviderOutcomeProviderMessageId =
          payloadText(event.payload, "providerMessageId") ??
          next.responseProviderOutcomeProviderMessageId;
        next.responseProviderOutcomeDeliveryAttemptId =
          payloadText(event.payload, "deliveryAttemptId") ??
          next.responseProviderOutcomeDeliveryAttemptId;
      }
    }

    if (
      event.event_type === "INTAKE_AMBIGUITY_CLOSED_BY_POLICY" &&
      !next.policyClosedAt
    ) {
      next.policyClosureSource =
        payloadText(event.payload, "closureSource") ?? null;
      next.policyClosedAt = event.occurred_at;
      next.policyVersion =
        payloadText(event.payload, "policyVersion") ?? null;
    }

    rows.set(event.intake_id, {
      ...next,
      divergenceReasons: uniqueReasons(next.divergenceReasons),
    });
  }

  return rows;
}

function buildLedgerRowDivergence(args: {
  derived: DerivedLedgerRow;
  snapshot: IntakeRecord | null;
  issuance: TokenIssuanceRecord | null;
}): string[] {
  const reasons = [...args.derived.divergenceReasons];

  if (!args.snapshot) {
    reasons.push("missing intake snapshot");
  } else {
    if (args.snapshot.state !== args.derived.state) {
      reasons.push(
        `snapshot state ${args.snapshot.state} does not match ledger state ${args.derived.state}`,
      );
    }
    if (args.snapshot.channel !== args.derived.channel) {
      reasons.push(
        `snapshot channel ${args.snapshot.channel} does not match ledger channel ${args.derived.channel}`,
      );
    }
    if (args.derived.email && args.snapshot.email !== args.derived.email) {
      reasons.push("snapshot email does not match ledger submission email");
    }
    if (
      (args.snapshot.latestIssuanceId ?? null) !==
      (args.derived.latestIssuanceId ?? null)
    ) {
      reasons.push("snapshot latest issuance does not match ledger");
    }
    if ((args.snapshot.threadId ?? null) !== (args.derived.threadId ?? null)) {
      reasons.push("snapshot threadId does not match ledger");
    }
    if (args.snapshot.state === "responded" && !args.snapshot.firstResponse) {
      reasons.push(
        "snapshot responded state is missing first response metadata",
      );
    }
    if (args.snapshot.state !== "responded" && args.snapshot.firstResponse) {
      reasons.push(
        "snapshot stores first response metadata without responded state",
      );
    }
    if (
      args.snapshot.responseProviderOutcome &&
      !args.derived.responseProviderOutcomeStatus
    ) {
      reasons.push(
        "snapshot stores provider outcome evidence without matching ledger event",
      );
    }
    if (
      !args.snapshot.responseProviderOutcome &&
      args.derived.responseProviderOutcomeStatus
    ) {
      reasons.push(
        "ledger stores provider outcome evidence without matching snapshot record",
      );
    }
    if (args.snapshot.firstResponse && args.derived.state !== "responded") {
      reasons.push(
        "response delivery metadata exists without matching INTAKE_RESPONDED ledger state",
      );
    }
    if (
      args.snapshot.responseProviderOutcome &&
      args.derived.responseProviderOutcomeStatus &&
      args.snapshot.responseProviderOutcome.status !==
        args.derived.responseProviderOutcomeStatus
    ) {
      reasons.push("snapshot provider outcome status does not match ledger");
    }
    if (
      args.snapshot.responseProviderOutcome &&
      args.derived.responseProviderOutcomeEventId &&
      args.snapshot.responseProviderOutcome.providerEventId !==
        args.derived.responseProviderOutcomeEventId
    ) {
      reasons.push("snapshot provider outcome event id does not match ledger");
    }
  }

  if (args.derived.latestIssuanceId && !args.issuance) {
    reasons.push("missing latest issuance snapshot");
  }

  if (args.issuance) {
    if (
      args.issuance.intakeId &&
      args.issuance.intakeId !== args.derived.intakeId
    ) {
      reasons.push("issuance intakeId does not match ledger");
    }
    if (
      args.issuance.channel &&
      args.issuance.channel !== args.derived.channel
    ) {
      reasons.push("issuance channel does not match ledger");
    }
    if ((args.issuance.threadId ?? null) !== (args.derived.threadId ?? null)) {
      reasons.push("issuance threadId does not match ledger");
    }
    if (
      args.derived.state === "admitted" &&
      args.issuance.status !== "verified"
    ) {
      reasons.push(
        `issuance status ${args.issuance.status} does not satisfy admitted ledger state`,
      );
    }
  }

  return uniqueReasons(reasons);
}

function sortRows(left: AdmissionQueueRow, right: AdmissionQueueRow): number {
  return (
    Number(right.queueEligible) - Number(left.queueEligible) ||
    Number(right.reconciliationPending) - Number(left.reconciliationPending) ||
    Number(right.reconciliationResolved) -
      Number(left.reconciliationResolved) ||
    Number(right.hasDivergence) - Number(left.hasDivergence) ||
    stateRank(left.state) - stateRank(right.state) ||
    compareIsoDescending(left.updatedAt, right.updatedAt) ||
    compareIsoDescending(left.createdAt, right.createdAt) ||
    left.intakeId.localeCompare(right.intakeId)
  );
}

export function formatAdmissionStateLabel(state: AdmissionState): string {
  return stateLabels[state];
}

export async function buildAdmissionQueueView(): Promise<AdmissionQueueView> {
  const [events, intakeSnapshots, issuanceSnapshots] = await Promise.all([
    readIntakeEvents(),
    getAllIntakes(),
    getAllIssuances(),
  ]);

  const intakeById = new Map(
    intakeSnapshots.map((snapshot) => [snapshot.intakeId, snapshot]),
  );
  const issuanceById = new Map(
    issuanceSnapshots.map((snapshot) => [snapshot.issuanceId, snapshot]),
  );
  const derivedRows = buildDerivedLedgerRows(events);
  const rows: AdmissionQueueRow[] = [];

  for (const derived of derivedRows.values()) {
    const snapshot = intakeById.get(derived.intakeId) ?? null;
    const issuance = derived.latestIssuanceId
      ? (issuanceById.get(derived.latestIssuanceId) ?? null)
      : null;
    const divergenceReasons = buildLedgerRowDivergence({
      derived,
      snapshot,
      issuance,
    });
    const firstResponse = snapshot?.firstResponse;
    const reconciliationRecorded = snapshot?.reconciliation ?? null;
    const authoritativeProviderOutcomeStatus =
      derived.responseProviderOutcomeStatus;
    const authoritativeProviderOutcomeObservedAt =
      derived.responseProviderOutcomeObservedAt;
    const providerOutcomeStatus =
      authoritativeProviderOutcomeStatus ??
      snapshot?.responseProviderOutcome?.status ??
      null;
    const providerOutcomeObservedAt =
      authoritativeProviderOutcomeObservedAt ??
      snapshot?.responseProviderOutcome?.observedAt ??
      null;
    const responseEvidenceSubcase = classifyDeliveryEvidenceSubcase({
      responseProvider: firstResponse?.provider ?? null,
      responseProviderMessageId: firstResponse?.providerMessageId ?? null,
      responseDeliveryAttemptId: firstResponse?.deliveryAttemptId ?? null,
      responseMailbox: firstResponse?.mailbox ?? null,
      respondedAt: snapshot?.respondedAt ?? null,
    });
    const mailboxReceipt = snapshot?.responseMailboxReceipt ?? null;
    const ambiguity = resolveAmbiguity({
      hasFirstResponse: Boolean(firstResponse),
      derivedState: derived.state,
      hasManualReconciliation: Boolean(reconciliationRecorded),
      providerOutcomeStatus: authoritativeProviderOutcomeStatus,
      providerOutcomeObservedAt: authoritativeProviderOutcomeObservedAt,
      mailboxReceiptStatus: mailboxReceipt?.status ?? null,
      mailboxReceiptObservedAt: mailboxReceipt?.observedAt ?? null,
      reconciliationReconciledAt:
        reconciliationRecorded?.reconciledAt ?? null,
      hasEvidenceSubcase: Boolean(responseEvidenceSubcase),
    });
    const ambiguityResolutionKind = ambiguity.kind;
    const ambiguityResolvedAt = ambiguity.resolvedAt;
    const reconciliationPending = ambiguity.pending;
    const reconciliationResolved = ambiguity.resolved;
    const reconciliationSubcase = deriveReconciliationReportSubcase({
      responseProvider: firstResponse?.provider ?? null,
      responseProviderMessageId: firstResponse?.providerMessageId ?? null,
      responseDeliveryAttemptId: firstResponse?.deliveryAttemptId ?? null,
      responseMailbox: firstResponse?.mailbox ?? null,
      respondedAt: snapshot?.respondedAt ?? null,
      responseProviderOutcomeStatus: authoritativeProviderOutcomeStatus,
      reconciliationRecordedAt: reconciliationRecorded?.reconciledAt ?? null,
      mailboxReceiptStatus: mailboxReceipt?.status ?? null,
    });

    rows.push({
      intakeId: derived.intakeId,
      channel: derived.channel,
      email: derived.email ?? snapshot?.email ?? issuance?.email ?? null,
      state: derived.state,
      createdAt: snapshot?.createdAt ?? derived.createdAt,
      updatedAt: snapshot?.updatedAt ?? derived.updatedAt,
      latestIssuanceId: derived.latestIssuanceId,
      threadId: derived.threadId,
      queueEligible: derived.state === "admitted",
      ledgerEventCount: derived.ledgerEventCount,
      assessmentStatus: issuance?.assessmentStatus ?? null,
      assessmentRunId: issuance?.assessmentRunId ?? null,
      controlPlaneRunId: issuance?.controlPlaneRunId ?? null,
      operatorActionKind: snapshot?.operatorAction?.kind ?? null,
      snapshotState: snapshot?.state ?? null,
      submission: snapshot?.submission ?? {},
      firstResponseSubject: firstResponse?.subject ?? null,
      respondedAt: snapshot?.respondedAt ?? null,
      responseActor: firstResponse?.actor ?? null,
      responseActorAuthSource: firstResponse?.actorAuthSource ?? null,
      responseActorSessionHash: firstResponse?.actorSessionHash ?? null,
      responseMailbox: firstResponse?.mailbox ?? null,
      responseProvider: firstResponse?.provider ?? null,
      responseProviderMessageId: firstResponse?.providerMessageId ?? null,
      responseDeliveryAttemptId: firstResponse?.deliveryAttemptId ?? null,
      responseProviderOutcomeStatus: providerOutcomeStatus,
      responseProviderOutcomeObservedAt: providerOutcomeObservedAt,
      responseProviderOutcomeEventId:
        derived.responseProviderOutcomeEventId ??
        snapshot?.responseProviderOutcome?.providerEventId ??
        null,
      responseProviderOutcomeSource:
        derived.responseProviderOutcomeSource ??
        snapshot?.responseProviderOutcome?.source ??
        null,
      responseProviderOutcomeRawEventType:
        derived.responseProviderOutcomeRawEventType ??
        snapshot?.responseProviderOutcome?.rawEventType ??
        null,
      responseProviderOutcomeDetail:
        derived.responseProviderOutcomeDetail ??
        snapshot?.responseProviderOutcome?.detail ??
        null,
      responseEvidenceSubcase,
      mailboxReceiptStatus: mailboxReceipt?.status ?? null,
      mailboxReceiptObservedAt: mailboxReceipt?.observedAt ?? null,
      mailboxReceiptId: mailboxReceipt?.receiptId ?? null,
      policyClosureSource: derived.policyClosureSource,
      policyClosedAt: derived.policyClosedAt,
      policyVersion: derived.policyVersion,
      ambiguityResolutionKind,
      ambiguityResolvedAt,
      reconciliationRecordedAt: reconciliationRecorded?.reconciledAt ?? null,
      reconciliationActor: reconciliationRecorded?.actor ?? null,
      reconciliationActorAuthSource:
        reconciliationRecorded?.actorAuthSource ?? null,
      reconciliationActorSessionHash:
        reconciliationRecorded?.actorSessionHash ?? null,
      reconciliationNote: reconciliationRecorded?.note ?? null,
      reconciliationEvidenceSubcase:
        reconciliationRecorded?.evidenceSubcase ?? null,
      reconciliationNotePolicyVersion:
        reconciliationRecorded?.notePolicyVersion ?? null,
      reconciliationSubcase,
      source: "ledger",
      reconciliationPending,
      reconciliationResolved,
      hasDivergence: divergenceReasons.length > 0,
      divergenceReasons,
    });
  }

  for (const snapshot of intakeSnapshots) {
    if (derivedRows.has(snapshot.intakeId)) {
      continue;
    }

    const issuance = snapshot.latestIssuanceId
      ? (issuanceById.get(snapshot.latestIssuanceId) ?? null)
      : null;
    const firstResponse = snapshot.firstResponse;
    const reconciliationRecorded = snapshot.reconciliation;
    const providerOutcomeStatus =
      snapshot.responseProviderOutcome?.status ?? null;
    const providerOutcomeObservedAt =
      snapshot.responseProviderOutcome?.observedAt ?? null;
    const responseEvidenceSubcase = classifyDeliveryEvidenceSubcase({
      responseProvider: firstResponse?.provider ?? null,
      responseProviderMessageId: firstResponse?.providerMessageId ?? null,
      responseDeliveryAttemptId: firstResponse?.deliveryAttemptId ?? null,
      responseMailbox: firstResponse?.mailbox ?? null,
      respondedAt: snapshot.respondedAt ?? null,
    });
    const snapshotAmbiguity = resolveAmbiguity({
      hasFirstResponse: Boolean(firstResponse),
      derivedState: snapshot.state,
      hasManualReconciliation: Boolean(reconciliationRecorded),
      providerOutcomeStatus: null,
      providerOutcomeObservedAt: providerOutcomeObservedAt,
      mailboxReceiptStatus: snapshot.responseMailboxReceipt?.status ?? null,
      mailboxReceiptObservedAt:
        snapshot.responseMailboxReceipt?.observedAt ?? null,
      reconciliationReconciledAt:
        reconciliationRecorded?.reconciledAt ?? null,
      hasEvidenceSubcase: Boolean(responseEvidenceSubcase),
    });
    const ambiguityResolutionKind = snapshotAmbiguity.kind;
    const ambiguityResolvedAt = snapshotAmbiguity.resolvedAt;
    const reconciliationSubcase = deriveReconciliationReportSubcase({
      responseProvider: firstResponse?.provider ?? null,
      responseProviderMessageId: firstResponse?.providerMessageId ?? null,
      responseDeliveryAttemptId: firstResponse?.deliveryAttemptId ?? null,
      responseMailbox: firstResponse?.mailbox ?? null,
      respondedAt: snapshot.respondedAt ?? null,
      responseProviderOutcomeStatus: null,
      reconciliationRecordedAt: reconciliationRecorded?.reconciledAt ?? null,
      mailboxReceiptStatus: snapshot.responseMailboxReceipt?.status ?? null,
    });

    rows.push({
      intakeId: snapshot.intakeId,
      channel: snapshot.channel,
      email: snapshot.email,
      state: snapshot.state,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      latestIssuanceId: snapshot.latestIssuanceId,
      threadId: snapshot.threadId,
      queueEligible: false,
      ledgerEventCount: 0,
      assessmentStatus: issuance?.assessmentStatus ?? null,
      assessmentRunId: issuance?.assessmentRunId ?? null,
      controlPlaneRunId: issuance?.controlPlaneRunId ?? null,
      operatorActionKind: snapshot?.operatorAction?.kind ?? null,
      snapshotState: snapshot.state,
      submission: snapshot.submission,
      firstResponseSubject: firstResponse?.subject ?? null,
      respondedAt: snapshot.respondedAt ?? null,
      responseActor: firstResponse?.actor ?? null,
      responseActorAuthSource: firstResponse?.actorAuthSource ?? null,
      responseActorSessionHash: firstResponse?.actorSessionHash ?? null,
      responseMailbox: firstResponse?.mailbox ?? null,
      responseProvider: firstResponse?.provider ?? null,
      responseProviderMessageId: firstResponse?.providerMessageId ?? null,
      responseDeliveryAttemptId: firstResponse?.deliveryAttemptId ?? null,
      responseProviderOutcomeStatus: providerOutcomeStatus,
      responseProviderOutcomeObservedAt: providerOutcomeObservedAt,
      responseProviderOutcomeEventId:
        snapshot.responseProviderOutcome?.providerEventId ?? null,
      responseProviderOutcomeSource:
        snapshot.responseProviderOutcome?.source ?? null,
      responseProviderOutcomeRawEventType:
        snapshot.responseProviderOutcome?.rawEventType ?? null,
      responseProviderOutcomeDetail:
        snapshot.responseProviderOutcome?.detail ?? null,
      responseEvidenceSubcase,
      mailboxReceiptStatus: snapshot.responseMailboxReceipt?.status ?? null,
      mailboxReceiptObservedAt:
        snapshot.responseMailboxReceipt?.observedAt ?? null,
      mailboxReceiptId: snapshot.responseMailboxReceipt?.receiptId ?? null,
      policyClosureSource: null,
      policyClosedAt: null,
      policyVersion: null,
      ambiguityResolutionKind,
      ambiguityResolvedAt,
      reconciliationRecordedAt: reconciliationRecorded?.reconciledAt ?? null,
      reconciliationActor: reconciliationRecorded?.actor ?? null,
      reconciliationActorAuthSource:
        reconciliationRecorded?.actorAuthSource ?? null,
      reconciliationActorSessionHash:
        reconciliationRecorded?.actorSessionHash ?? null,
      reconciliationNote: reconciliationRecorded?.note ?? null,
      reconciliationEvidenceSubcase:
        reconciliationRecorded?.evidenceSubcase ?? null,
      reconciliationNotePolicyVersion:
        reconciliationRecorded?.notePolicyVersion ?? null,
      reconciliationSubcase,
      source: "snapshot-only",
      reconciliationPending: snapshotAmbiguity.pending,
      reconciliationResolved: snapshotAmbiguity.resolved,
      hasDivergence: true,
      divergenceReasons: ["snapshot has no ledger history"],
    });
  }

  rows.sort(sortRows);

  const summary = rows.reduce<AdmissionQueueSummary>(
    (current, row) => {
      current.total += 1;
      current.byState[row.state] += 1;
      if (row.queueEligible) {
        current.ready += 1;
      }
      if (row.reconciliationPending) {
        current.reconciliationPending += 1;
      }
      if (row.reconciliationResolved) {
        current.reconciliationResolved += 1;
      }
      if (row.hasDivergence) {
        current.divergent += 1;
      }
      return current;
    },
    {
      total: 0,
      ready: 0,
      divergent: 0,
      reconciliationPending: 0,
      reconciliationResolved: 0,
      byState: emptyStateCounts(),
    },
  );

  return {
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    eventCount: events.length,
    summary,
    rows,
  };
}
