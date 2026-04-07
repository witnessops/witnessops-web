/**
 * Pure alert derivation logic for the admin alert bell (WEB-020).
 *
 * Kept in lib/admin/ (no CSS dependency chain) so it can be unit-tested
 * directly without pulling in CSS modules via the component tree.
 */
import type { AdmissionQueueRow } from "@/lib/server/admission-queue";
import type { PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";
import { QUEUE_FILTER_KEYS, type QueueFilterKey } from "./queue-filter-keys";

const STALE_ACCEPTED_HOURS = 24;
const AWAITING_RESPONSE_HOURS = 48;

function hoursAgo(iso: string): number {
  const diff = Date.now() - Date.parse(iso);
  return diff > 0 ? Math.floor(diff / (60 * 60 * 1000)) : 0;
}

export interface AlertItem {
  id: string;
  category: "reconciliation" | "evidence" | "system";
  message: string;
  intakeId: string | null;
  filterKey: QueueFilterKey;
  timestamp: string;
}

export function deriveAlerts(
  rows: AdmissionQueueRow[],
  lifecycleByRunId: Map<string, PostApprovalLifecycleView> = new Map(),
): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const row of rows) {
    // Reconciliation pending — operator-only action is available
    if (row.reconciliationPending && !row.reconciliationResolved) {
      alerts.push({
        id: `recon-${row.intakeId}`,
        category: "reconciliation",
        message: `Reconciliation pending: ${row.email ?? row.intakeId}`,
        intakeId: row.intakeId,
        filterKey: QUEUE_FILTER_KEYS.pending,
        timestamp: row.updatedAt,
      });
    }

    // Stale accepted — evidence alert
    if (
      row.responseProviderOutcomeStatus === "accepted" &&
      row.responseProviderOutcomeObservedAt !== null &&
      hoursAgo(row.responseProviderOutcomeObservedAt) >= STALE_ACCEPTED_HOURS &&
      !row.reconciliationResolved
    ) {
      alerts.push({
        id: `stale-${row.intakeId}`,
        category: "evidence",
        message: `Stale accepted (${hoursAgo(row.responseProviderOutcomeObservedAt)}h): ${row.email ?? row.intakeId}`,
        intakeId: row.intakeId,
        filterKey: QUEUE_FILTER_KEYS.staleAccepted,
        timestamp: row.responseProviderOutcomeObservedAt,
      });
    }

    // Awaiting response — operator-only action is available
    if (
      row.state === "admitted" &&
      !row.respondedAt &&
      hoursAgo(row.createdAt) >= AWAITING_RESPONSE_HOURS
    ) {
      alerts.push({
        id: `await-${row.intakeId}`,
        category: "reconciliation",
        message: `Awaiting response (${hoursAgo(row.createdAt)}h): ${row.email ?? row.intakeId}`,
        intakeId: row.intakeId,
        filterKey: QUEUE_FILTER_KEYS.awaitingResponse,
        timestamp: row.createdAt,
      });
    }

    // Evidence conflict
    if (
      row.mailboxReceiptStatus !== null &&
      row.responseProviderOutcomeStatus !== null &&
      row.mailboxReceiptStatus !== row.responseProviderOutcomeStatus &&
      row.mailboxReceiptStatus !== "accepted" &&
      row.responseProviderOutcomeStatus !== "accepted"
    ) {
      alerts.push({
        id: `conflict-${row.intakeId}`,
        category: "evidence",
        message: `Evidence conflict: ${row.email ?? row.intakeId}`,
        intakeId: row.intakeId,
        filterKey: QUEUE_FILTER_KEYS.evidenceConflict,
        timestamp: row.updatedAt,
      });
    }

    // Divergence — system-level
    if (row.hasDivergence) {
      alerts.push({
        id: `diverge-${row.intakeId}`,
        category: "system",
        message: `Divergent state: ${row.email ?? row.intakeId}`,
        intakeId: row.intakeId,
        filterKey: QUEUE_FILTER_KEYS.divergent,
        timestamp: row.updatedAt,
      });
    }

    // Customer rejection — operator has visibility into this outcome (WEB-018/WEB-020)
    if (row.controlPlaneRunId) {
      const lifecycle = lifecycleByRunId.get(row.controlPlaneRunId);
      if (lifecycle?.stage === "rejected") {
        const ts =
          lifecycle.authoritative?.customerAcceptanceAt ?? row.updatedAt;
        alerts.push({
          id: `customer-rejected-${row.intakeId}`,
          category: "system",
          message: `Customer rejected package: ${row.email ?? row.intakeId}`,
          intakeId: row.intakeId,
          filterKey: QUEUE_FILTER_KEYS.customerRejected,
          timestamp: ts,
        });
      }
    }
  }

  return alerts;
}
