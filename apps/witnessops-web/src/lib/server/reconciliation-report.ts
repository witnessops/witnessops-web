import { channelNames, type ChannelName } from "@/lib/channel-policy";
import type { AdminActorAuthSource } from "@/lib/token-contract";
import {
  intakeResponseProviderOutcomeStatuses,
  type IntakeResponseProviderOutcomeSource,
  type IntakeResponseProviderOutcomeStatus,
} from "@/lib/provider-outcomes";

import {
  buildAdmissionQueueView,
  type AdmissionQueueRow,
  type AdmissionQueueView,
} from "./admission-queue";
import {
  deliveryEvidenceSubcases,
  reconciliationReportSubcases,
  type DeliveryEvidenceSubcase,
  type ReconciliationReportSubcase,
} from "./reconciliation-subcases";

export const reconciliationReportDisclaimer =
  "Reconciliation records an operator judgment about ambiguous evidence; it does not prove that the missing durable confirmation ever existed. Resolved ambiguity may come from either manual reconciliation or later strong downstream provider evidence, but only reconciliation fields record human judgment.";

export interface ReconciliationChannelSummary {
  channel: ChannelName;
  pending: number;
  resolved: number;
}

export interface ReconciliationTimelineEntry {
  date: string;
  ambiguityStarted: number;
  ambiguityResolved: number;
  openAtClose: number;
}

export interface ReconciliationSubcaseSummary {
  subcase: ReconciliationReportSubcase;
  total: number;
  pending: number;
  resolved: number;
}

export interface ReconciliationEvidenceSummary {
  subcase: DeliveryEvidenceSubcase;
  total: number;
  pending: number;
  resolved: number;
}

export interface ReconciliationProviderOutcomeSummary {
  outcome: IntakeResponseProviderOutcomeStatus;
  total: number;
  pending: number;
  resolved: number;
}

export interface ReconciliationReportRow {
  intakeId: string;
  channel: ChannelName;
  email: string | null;
  ambiguityStartedAt: string;
  ageHours: number;
  subcase: ReconciliationReportSubcase;
  evidenceSubcase: DeliveryEvidenceSubcase;
  actor: string | null;
  actorAuthSource: AdminActorAuthSource | null;
  actorSessionHash: string | null;
  mailbox: string | null;
  provider: string | null;
  providerMessageId: string | null;
  deliveryAttemptId: string | null;
  providerOutcomeStatus: IntakeResponseProviderOutcomeStatus | null;
  providerOutcomeObservedAt: string | null;
  providerOutcomeEventId: string | null;
  providerOutcomeSource: IntakeResponseProviderOutcomeSource | null;
  providerOutcomeRawEventType: string | null;
  mailboxReceiptStatus: IntakeResponseProviderOutcomeStatus | null;
  mailboxReceiptObservedAt: string | null;
  mailboxReceiptId: string | null;
  resolutionKind:
    | "manual_reconciliation"
    | "provider_outcome"
    | "mailbox_receipt"
    | null;
  resolvedAt: string | null;
  reconciledAt: string | null;
  reconciliationActor: string | null;
  reconciliationActorAuthSource: AdminActorAuthSource | null;
  reconciliationActorSessionHash: string | null;
  reconciliationEvidenceSubcase: DeliveryEvidenceSubcase | null;
  reconciliationNotePolicyVersion: string | null;
  note: string | null;
}

export interface ReconciliationProviderSummary {
  provider: string;
  total: number;
  pending: number;
  resolved: number;
}

export interface ReconciliationClosureSourceSummary {
  source: "provider_outcome" | "mailbox_receipt" | "manual_reconciliation";
  total: number;
}

export interface ReconciliationReport {
  generatedAt: string;
  disclaimer: string;
  pendingTotal: number;
  resolvedTotal: number;
  oldestPendingAt: string | null;
  latestResolvedAt: string | null;
  byChannel: ReconciliationChannelSummary[];
  bySubcase: ReconciliationSubcaseSummary[];
  byEvidenceSubcase: ReconciliationEvidenceSummary[];
  byProviderOutcome: ReconciliationProviderOutcomeSummary[];
  byProvider: ReconciliationProviderSummary[];
  byClosureSource: ReconciliationClosureSourceSummary[];
  timeline: ReconciliationTimelineEntry[];
  pendingRows: ReconciliationReportRow[];
  resolvedRows: ReconciliationReportRow[];
}

function ambiguityStartedAt(row: AdmissionQueueRow): string {
  return row.respondedAt ?? row.updatedAt;
}

function elapsedHours(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);

  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
    return 0;
  }

  return Math.floor((to - from) / (60 * 60 * 1000));
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function increment(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function buildReportRow(
  row: AdmissionQueueRow,
  generatedAt: string,
): ReconciliationReportRow {
  const startedAt = ambiguityStartedAt(row);
  const evidenceSubcase =
    row.responseEvidenceSubcase ?? "provider_delivery_evidence_incomplete";
  const subcase = row.reconciliationSubcase ?? evidenceSubcase;

  return {
    intakeId: row.intakeId,
    channel: row.channel,
    email: row.email,
    ambiguityStartedAt: startedAt,
    ageHours: elapsedHours(startedAt, generatedAt),
    subcase,
    evidenceSubcase,
    actor: row.responseActor,
    actorAuthSource: row.responseActorAuthSource,
    actorSessionHash: row.responseActorSessionHash,
    mailbox: row.responseMailbox,
    provider: row.responseProvider,
    providerMessageId: row.responseProviderMessageId,
    deliveryAttemptId: row.responseDeliveryAttemptId,
    providerOutcomeStatus: row.responseProviderOutcomeStatus,
    providerOutcomeObservedAt: row.responseProviderOutcomeObservedAt,
    providerOutcomeEventId: row.responseProviderOutcomeEventId,
    providerOutcomeSource: row.responseProviderOutcomeSource,
    providerOutcomeRawEventType: row.responseProviderOutcomeRawEventType,
    mailboxReceiptStatus: row.mailboxReceiptStatus,
    mailboxReceiptObservedAt: row.mailboxReceiptObservedAt,
    mailboxReceiptId: row.mailboxReceiptId,
    resolutionKind: row.ambiguityResolutionKind,
    resolvedAt: row.ambiguityResolvedAt,
    reconciledAt: row.reconciliationRecordedAt,
    reconciliationActor: row.reconciliationActor,
    reconciliationActorAuthSource: row.reconciliationActorAuthSource,
    reconciliationActorSessionHash: row.reconciliationActorSessionHash,
    reconciliationEvidenceSubcase: row.reconciliationEvidenceSubcase,
    reconciliationNotePolicyVersion: row.reconciliationNotePolicyVersion,
    note: row.reconciliationNote,
  };
}

function comparePendingRows(
  left: ReconciliationReportRow,
  right: ReconciliationReportRow,
): number {
  return (
    left.ambiguityStartedAt.localeCompare(right.ambiguityStartedAt) ||
    left.intakeId.localeCompare(right.intakeId)
  );
}

function compareResolvedRows(
  left: ReconciliationReportRow,
  right: ReconciliationReportRow,
): number {
  return (
    (right.resolvedAt ?? "").localeCompare(left.resolvedAt ?? "") ||
    left.intakeId.localeCompare(right.intakeId)
  );
}

function buildTimeline(args: {
  pendingRows: ReconciliationReportRow[];
  resolvedRows: ReconciliationReportRow[];
}): ReconciliationTimelineEntry[] {
  const startedByDay = new Map<string, number>();
  const resolvedByDay = new Map<string, number>();

  for (const row of [...args.pendingRows, ...args.resolvedRows]) {
    increment(startedByDay, dayKey(row.ambiguityStartedAt));
  }

  for (const row of args.resolvedRows) {
    if (!row.resolvedAt) {
      continue;
    }

    increment(resolvedByDay, dayKey(row.resolvedAt));
  }

  const dates = [
    ...new Set([...startedByDay.keys(), ...resolvedByDay.keys()]),
  ].sort((left, right) => left.localeCompare(right));

  let openAtClose = 0;

  return dates.map((date) => {
    const ambiguityStarted = startedByDay.get(date) ?? 0;
    const ambiguityResolved = resolvedByDay.get(date) ?? 0;

    openAtClose += ambiguityStarted - ambiguityResolved;

    return {
      date,
      ambiguityStarted,
      ambiguityResolved,
      openAtClose,
    };
  });
}

function buildProviderSummary(
  allRows: ReconciliationReportRow[],
): ReconciliationProviderSummary[] {
  const providerMap = new Map<
    string,
    { total: number; pending: number; resolved: number }
  >();

  for (const row of allRows) {
    const provider = row.provider ?? "unknown";
    const entry = providerMap.get(provider) ?? {
      total: 0,
      pending: 0,
      resolved: 0,
    };
    entry.total += 1;
    if (row.resolutionKind) {
      entry.resolved += 1;
    } else {
      entry.pending += 1;
    }
    providerMap.set(provider, entry);
  }

  return [...providerMap.entries()]
    .map(([provider, counts]) => ({ provider, ...counts }))
    .sort((a, b) => a.provider.localeCompare(b.provider));
}

const closureSources = [
  "provider_outcome",
  "mailbox_receipt",
  "manual_reconciliation",
] as const;

function buildClosureSourceSummary(
  resolvedRows: ReconciliationReportRow[],
): ReconciliationClosureSourceSummary[] {
  return closureSources.map((source) => ({
    source,
    total: resolvedRows.filter((row) => row.resolutionKind === source).length,
  }));
}

export function buildReconciliationReportFromView(
  view: AdmissionQueueView,
): ReconciliationReport {
  const pendingRows = view.rows
    .filter((row) => row.reconciliationPending)
    .map((row) => buildReportRow(row, view.generatedAt))
    .sort(comparePendingRows);
  const resolvedRows = view.rows
    .filter((row) => row.reconciliationResolved)
    .map((row) => buildReportRow(row, view.generatedAt))
    .sort(compareResolvedRows);

  return {
    generatedAt: view.generatedAt,
    disclaimer: reconciliationReportDisclaimer,
    pendingTotal: pendingRows.length,
    resolvedTotal: resolvedRows.length,
    oldestPendingAt: pendingRows[0]?.ambiguityStartedAt ?? null,
    latestResolvedAt: resolvedRows[0]?.resolvedAt ?? null,
    byChannel: channelNames.map((channel) => ({
      channel,
      pending: pendingRows.filter((row) => row.channel === channel).length,
      resolved: resolvedRows.filter((row) => row.channel === channel).length,
    })),
    bySubcase: reconciliationReportSubcases.map((subcase) => {
      const pending = pendingRows.filter(
        (row) => row.subcase === subcase,
      ).length;
      const resolved = resolvedRows.filter(
        (row) => row.subcase === subcase,
      ).length;

      return {
        subcase,
        total: pending + resolved,
        pending,
        resolved,
      };
    }),
    byEvidenceSubcase: deliveryEvidenceSubcases.map((subcase) => {
      const pending = pendingRows.filter(
        (row) => row.evidenceSubcase === subcase,
      ).length;
      const resolved = resolvedRows.filter(
        (row) => row.evidenceSubcase === subcase,
      ).length;

      return {
        subcase,
        total: pending + resolved,
        pending,
        resolved,
      };
    }),
    byProviderOutcome: intakeResponseProviderOutcomeStatuses.map((outcome) => {
      const pending = pendingRows.filter(
        (row) => row.providerOutcomeStatus === outcome,
      ).length;
      const resolved = resolvedRows.filter(
        (row) => row.providerOutcomeStatus === outcome,
      ).length;

      return {
        outcome,
        total: pending + resolved,
        pending,
        resolved,
      };
    }),
    byProvider: buildProviderSummary([...pendingRows, ...resolvedRows]),
    byClosureSource: buildClosureSourceSummary(resolvedRows),
    timeline: buildTimeline({ pendingRows, resolvedRows }),
    pendingRows,
    resolvedRows,
  };
}

export async function buildReconciliationReport(): Promise<ReconciliationReport> {
  const view = await buildAdmissionQueueView();
  return buildReconciliationReportFromView(view);
}
