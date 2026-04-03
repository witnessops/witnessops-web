import { buildAdmissionQueueView } from "@/lib/server/admission-queue";
import type { AdmissionQueueRow } from "@/lib/server/admission-queue";
import { QUEUE_FILTER_KEYS, type QueueFilterKey } from "@/lib/admin/queue-filter-keys";
import { AdminAlertPanel } from "./admin-alert-panel";

const STALE_ACCEPTED_HOURS = 24;
const AWAITING_RESPONSE_HOURS = 48;

function hoursAgo(iso: string): number {
  const diff = Date.now() - Date.parse(iso);
  return diff > 0 ? Math.floor(diff / (60 * 60 * 1000)) : 0;
}

interface AlertItem {
  id: string;
  category: "reconciliation" | "evidence" | "system";
  message: string;
  intakeId: string | null;
  filterKey: QueueFilterKey;
  timestamp: string;
}

function deriveAlerts(rows: AdmissionQueueRow[]): AlertItem[] {
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
  }

  return alerts;
}

export async function AdminAlertBell() {
  let alerts: AlertItem[] = [];

  try {
    const view = await buildAdmissionQueueView();
    alerts = deriveAlerts(view.rows);
  } catch {
    // If data is unavailable, show no alerts.
    // The overview/queue pages handle their own error states.
  }

  return <AdminAlertPanel alerts={alerts} />;
}

export type { AlertItem };
