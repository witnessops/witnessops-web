import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Inbox,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  adminAdmissionStateOrder,
  formatAdmissionStateLabel,
  type AdmissionQueueView,
  type AdmissionQueueRow,
} from "@/lib/server/admission-queue";
import { formatProviderOutcomeStatusLabel } from "@/lib/provider-outcomes";
import { formatReconciliationSubcaseLabel } from "@/lib/server/reconciliation-subcases";
import type { ReconciliationReport } from "@/lib/server/reconciliation-report";
import { QUEUE_FILTER_KEYS } from "@/lib/admin/queue-filter-keys";
import { StatCard } from "./stat-card";
import { Sparkline } from "./sparkline";
import styles from "./admin.module.css";

// ---------------------------------------------------------------------------
// Stale-pending detection — reused from admin-admission-queue.tsx
// Do not duplicate: this is the same logic, same thresholds.
// ---------------------------------------------------------------------------

const STALE_ACCEPTED_HOURS = 24;
const AWAITING_RESPONSE_HOURS = 48;

function hoursAgo(iso: string): number {
  const diff = Date.now() - Date.parse(iso);
  return diff > 0 ? Math.floor(diff / (60 * 60 * 1000)) : 0;
}

function countStaleAccepted(rows: AdmissionQueueRow[]): number {
  return rows.filter(
    (row) =>
      row.responseProviderOutcomeStatus === "accepted" &&
      row.responseProviderOutcomeObservedAt !== null &&
      hoursAgo(row.responseProviderOutcomeObservedAt) >= STALE_ACCEPTED_HOURS &&
      !row.reconciliationResolved,
  ).length;
}

function countAwaitingResponse(rows: AdmissionQueueRow[]): number {
  return rows.filter(
    (row) =>
      row.state === "admitted" &&
      !row.respondedAt &&
      hoursAgo(row.createdAt) >= AWAITING_RESPONSE_HOURS,
  ).length;
}

function countEvidenceConflict(rows: AdmissionQueueRow[]): number {
  return rows.filter(
    (row) =>
      row.mailboxReceiptStatus !== null &&
      row.responseProviderOutcomeStatus !== null &&
      row.mailboxReceiptStatus !== row.responseProviderOutcomeStatus &&
      row.mailboxReceiptStatus !== "accepted" &&
      row.responseProviderOutcomeStatus !== "accepted",
  ).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminOverviewGridProps {
  view: AdmissionQueueView;
  report: ReconciliationReport;
  customerAccepted: number;
  customerRejected: number;
}

export function AdminOverviewGrid({ view, report, customerAccepted, customerRejected }: AdminOverviewGridProps) {
  const staleAccepted = countStaleAccepted(view.rows);
  const awaitingResponse = countAwaitingResponse(view.rows);
  const evidenceConflict = countEvidenceConflict(view.rows);

  const hasAlerts =
    view.summary.reconciliationPending > 0 ||
    view.summary.divergent > 0 ||
    staleAccepted > 0 ||
    awaitingResponse > 0 ||
    evidenceConflict > 0;

  return (
    <>
      {/* ── Alert strip ── */}
      {hasAlerts ? (
        <div className={styles.alertStrip}>
          <AlertTriangle size={12} aria-hidden />
          <span>
            {[
              view.summary.reconciliationPending > 0
                ? `${view.summary.reconciliationPending} reconciliation pending`
                : null,
              view.summary.divergent > 0
                ? `${view.summary.divergent} divergent`
                : null,
              staleAccepted > 0
                ? `${staleAccepted} stale accepted`
                : null,
              awaitingResponse > 0
                ? `${awaitingResponse} awaiting response`
                : null,
              evidenceConflict > 0
                ? `${evidenceConflict} evidence conflict`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      ) : null}

      {/* ── KPI stat cards ── */}
      <div className={styles.sectionHeader}>Queue Overview</div>
      <div className={styles.overviewStatGrid}>
        <StatCard
          label="Total"
          value={view.summary.total}
          icon={Inbox}
          sub={`${view.eventCount} ledger events`}
        />
        <StatCard
          label="Ready"
          value={view.summary.ready}
          icon={CheckCircle}
          signal={view.summary.ready > 0 ? "green" : "muted"}
          href={`/admin/queue?filter=${QUEUE_FILTER_KEYS.ready}`}
        />
        <StatCard
          label="Pending"
          value={view.summary.reconciliationPending}
          icon={Clock}
          signal={view.summary.reconciliationPending > 0 ? "red" : "muted"}
          href={`/admin/queue?filter=${QUEUE_FILTER_KEYS.pending}`}
        />
        <StatCard
          label="Divergent"
          value={view.summary.divergent}
          icon={AlertTriangle}
          signal={view.summary.divergent > 0 ? "red" : "muted"}
          href={`/admin/queue?filter=${QUEUE_FILTER_KEYS.divergent}`}
        />
        <StatCard
          label="Resolved"
          value={view.summary.reconciliationResolved}
          icon={TrendingUp}
          signal="muted"
        />
        <StatCard
          label="Stale Accepted"
          value={staleAccepted}
          icon={XCircle}
          signal={staleAccepted > 0 ? "red" : "muted"}
          href={`/admin/queue?filter=${QUEUE_FILTER_KEYS.staleAccepted}`}
        />
        <StatCard
          label="Cust. Accepted"
          value={customerAccepted}
          icon={CheckCircle}
          signal={customerAccepted > 0 ? "green" : "muted"}
          href={`/admin/queue?filter=${QUEUE_FILTER_KEYS.customerAccepted}`}
        />
        <StatCard
          label="Cust. Rejected"
          value={customerRejected}
          icon={XCircle}
          signal={customerRejected > 0 ? "accent" : "muted"}
          href={`/admin/queue?filter=${QUEUE_FILTER_KEYS.customerRejected}`}
        />
      </div>

      {/* ── By-state grid ── */}
      <div className={styles.sectionHeader}>By State</div>
      <div className={styles.summaryGrid}>
        {adminAdmissionStateOrder.map((state) => (
          <div key={state} className={styles.summaryCard}>
            <div className={styles.summaryLabel}>
              {formatAdmissionStateLabel(state)}
            </div>
            <div className={styles.summaryValue}>
              {view.summary.byState[state]}
            </div>
          </div>
        ))}
      </div>

      {/* ── Reconciliation summary ── */}
      <div className={styles.sectionHeader}>Reconciliation</div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Pending ambiguity</span>
        <span
          className={
            report.pendingTotal > 0
              ? styles.rowValueAlert
              : styles.rowValueGreen
          }
        >
          {report.pendingTotal}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Resolved ambiguity</span>
        <span className={styles.rowValue}>{report.resolvedTotal}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Oldest unresolved</span>
        <span className={styles.rowValue}>
          {report.oldestPendingAt
            ? report.oldestPendingAt.replace("T", " ").replace("Z", " UTC")
            : "none"}
        </span>
      </div>

      {/* ── By-channel grid ── */}
      {report.byChannel.length > 0 ? (
        <div className={styles.summaryGrid}>
          {report.byChannel.map((ch) => (
            <div key={ch.channel} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{ch.channel}</div>
              <div className={styles.summaryValue}>
                {ch.pending} / {ch.resolved}
              </div>
              <div className={styles.summarySubvalue}>pending / resolved</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── By-subcase grid ── */}
      {report.bySubcase.length > 0 ? (
        <div className={styles.summaryGrid}>
          {report.bySubcase.map((entry) => (
            <div key={entry.subcase} className={styles.summaryCard}>
              <div className={styles.caseSummaryLabel}>
                {formatReconciliationSubcaseLabel(entry.subcase)}
              </div>
              <div className={styles.summaryValue}>{entry.total}</div>
              <div className={styles.summarySubvalue}>
                {entry.pending} pending / {entry.resolved} resolved
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── By-provider-outcome grid ── */}
      {report.byProviderOutcome.length > 0 ? (
        <div className={styles.summaryGrid}>
          {report.byProviderOutcome.map((entry) => (
            <div key={entry.outcome} className={styles.summaryCard}>
              <div className={styles.caseSummaryLabel}>
                {formatProviderOutcomeStatusLabel(entry.outcome)}
              </div>
              <div className={styles.summaryValue}>{entry.total}</div>
              <div className={styles.summarySubvalue}>
                {entry.pending} pending / {entry.resolved} resolved
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Timeline sparkline ── */}
      {report.timeline.length >= 2 ? (
        <>
          <div className={styles.sectionHeader}>Ambiguity Trend</div>
          <div className={styles.sparklineRow}>
            <div className={styles.sparklineItem}>
              <span className={styles.sparklineLabel}>Started</span>
              <Sparkline
                values={report.timeline.map((t) => t.ambiguityStarted)}
                color="#ff6b35"
              />
            </div>
            <div className={styles.sparklineItem}>
              <span className={styles.sparklineLabel}>Resolved</span>
              <Sparkline
                values={report.timeline.map((t) => t.ambiguityResolved)}
                color="#00d47e"
              />
            </div>
            <div className={styles.sparklineItem}>
              <span className={styles.sparklineLabel}>Open</span>
              <Sparkline
                values={report.timeline.map((t) => t.openAtClose)}
                color="#ef4444"
              />
            </div>
          </div>
        </>
      ) : null}

      {/* ── Evidence health ── */}
      {report.byClosureSource.length > 0 ? (
        <>
          <div className={styles.sectionHeader}>Evidence Health</div>
          {report.byClosureSource.map((entry) => (
            <div key={entry.source} className={styles.row}>
              <span className={styles.rowLabel}>
                {entry.source === "provider_outcome"
                  ? "provider evidence"
                  : entry.source === "mailbox_receipt"
                    ? "mailbox receipt"
                    : "manual reconciliation"}
              </span>
              <span className={styles.rowValue}>{entry.total}</span>
            </div>
          ))}
          <div className={styles.row}>
            <span className={styles.rowLabel}>Stale accepted</span>
            <span
              className={
                staleAccepted > 0
                  ? styles.rowValueAlert
                  : styles.rowValueGreen
              }
            >
              {staleAccepted}
            </span>
          </div>
        </>
      ) : null}

      {/* ── By-provider grid ── */}
      {report.byProvider.length > 0 ? (
        <div className={styles.summaryGrid}>
          {report.byProvider.map((entry) => (
            <div key={entry.provider} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{entry.provider}</div>
              <div className={styles.summaryValue}>{entry.total}</div>
              <div className={styles.summarySubvalue}>
                {entry.pending} pending / {entry.resolved} resolved
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.summaryNote}>
        Derived from events.ndjson. Snapshot mismatches are surfaced, not healed.
      </div>
    </>
  );
}
