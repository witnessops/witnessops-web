import { formatProviderOutcomeStatusLabel } from "@/lib/provider-outcomes";
import { formatReconciliationSubcaseLabel } from "@/lib/server/reconciliation-subcases";
import type { ReconciliationReport } from "@/lib/server/reconciliation-report";
import { AdminCopyReport } from "./admin-copy-report";
import styles from "./admin.module.css";

function formatTimestamp(value: string): string {
  return value.replace("T", " ").replace("Z", " UTC");
}

function formatDate(value: string): string {
  return `${value} UTC`;
}

function formatAgeHours(value: number): string {
  return value <= 0 ? "<1h" : `${value}h`;
}

function formatClosureSourceLabel(
  kind: "provider_outcome" | "mailbox_receipt" | "manual_reconciliation",
): string {
  switch (kind) {
    case "provider_outcome":
      return "provider evidence";
    case "mailbox_receipt":
      return "mailbox receipt";
    case "manual_reconciliation":
      return "manual reconciliation";
  }
}

interface ReconciliationReportViewProps {
  report: ReconciliationReport;
  staleAcceptedCount: number;
}

export function ReconciliationReportView({
  report,
  staleAcceptedCount,
}: ReconciliationReportViewProps) {
  return (
    <>
      <div className={styles.sectionHeader}>Reconciliation Report</div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Export</span>
        <span style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href="/api/admin/intake/reconciliation-report"
            className={styles.inlineLink}
            download="reconciliation-report.json"
          >
            Download JSON
          </a>
          <AdminCopyReport reportUrl="/api/admin/intake/reconciliation-report" />
        </span>
      </div>
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
        <span className={styles.rowLabel}>Oldest unresolved evidence</span>
        <span className={styles.rowValue}>
          {report.oldestPendingAt
            ? formatTimestamp(report.oldestPendingAt)
            : "none"}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Latest resolution</span>
        <span className={styles.rowValue}>
          {report.latestResolvedAt
            ? formatTimestamp(report.latestResolvedAt)
            : "none"}
        </span>
      </div>

      {report.byChannel.length > 0 ? (
        <div className={styles.summaryGrid}>
          {report.byChannel.map((channel) => (
            <div key={channel.channel} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{channel.channel}</div>
              <div className={styles.summaryValue}>
                {channel.pending} / {channel.resolved}
              </div>
              <div className={styles.summarySubvalue}>pending / resolved</div>
            </div>
          ))}
        </div>
      ) : null}

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

      <div className={styles.sectionHeader}>Evidence Health</div>
      {report.byClosureSource.map((entry) => (
        <div key={entry.source} className={styles.row}>
          <span className={styles.rowLabel}>
            {formatClosureSourceLabel(entry.source)}
          </span>
          <span className={styles.rowValue}>{entry.total}</span>
        </div>
      ))}
      <div className={styles.row}>
        <span className={styles.rowLabel}>Stale accepted</span>
        <span
          className={
            staleAcceptedCount > 0
              ? styles.rowValueAlert
              : styles.rowValueGreen
          }
        >
          {staleAcceptedCount}
        </span>
      </div>

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

      {report.timeline.length > 0 ? (
        <div className={styles.reportTimeline}>
          <div className={styles.reportTimelineHeader}>
            <span>Date</span>
            <span>Started</span>
            <span>Resolved</span>
            <span>Open</span>
          </div>
          {report.timeline.map((entry) => (
            <div key={entry.date} className={styles.reportTimelineRow}>
              <span>{formatDate(entry.date)}</span>
              <span className={styles.rowValue}>{entry.ambiguityStarted}</span>
              <span className={styles.rowValueGreen}>{entry.ambiguityResolved}</span>
              <span
                className={
                  entry.openAtClose > 0
                    ? styles.rowValueAlert
                    : styles.rowValueGreen
                }
              >
                {entry.openAtClose}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          No reconciliation history yet.
        </div>
      )}

      {report.pendingRows.length > 0 ? (
        <div className={styles.reportHighlightList}>
          {report.pendingRows.slice(0, 3).map((row) => (
            <div key={row.intakeId} className={styles.reportHighlightItem}>
              <div className={styles.reconciliationHeadline}>
                {row.email ?? row.intakeId}
              </div>
              <div className={styles.caseLabel}>
                {formatReconciliationSubcaseLabel(row.subcase)}
              </div>
              <div className={styles.reconciliationMeta}>
                <span>{row.intakeId}</span>
                <span>{row.channel}</span>
                <span>{row.deliveryAttemptId ?? "attempt missing"}</span>
                <span>
                  {row.providerOutcomeStatus
                    ? formatProviderOutcomeStatusLabel(row.providerOutcomeStatus)
                    : "no downstream outcome"}
                </span>
                <span>{formatAgeHours(row.ageHours)} open</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.summaryNote}>{report.disclaimer}</div>
    </>
  );
}
