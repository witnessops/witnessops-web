import {
  adminAdmissionStateOrder,
  buildAdmissionQueueView,
  formatAdmissionStateLabel,
  type AdmissionQueueRow,
} from "@/lib/server/admission-queue";
import { formatProviderOutcomeStatusLabel } from "@/lib/provider-outcomes";
import { isManualReconciliationBlocked } from "@/lib/server/evidence-resolution";
import { buildReconciliationNoteTemplate } from "@/lib/server/reconciliation-note-policy";
import { formatReconciliationSubcaseLabel } from "@/lib/server/reconciliation-subcases";
import { buildReconciliationReportFromView } from "@/lib/server/reconciliation-report";

import { AdminCopyReport } from "./admin-copy-report";
import { AdminQueueFilter, type FilterGroup } from "./admin-queue-filter";
import { AdminReconcileIntakeForm } from "./admin-reconcile-intake-form";
import { AdminRespondIntakeForm } from "./admin-respond-intake-form";
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

function buildDefaultReconciliationNote(row: AdmissionQueueRow): string {
  return buildReconciliationNoteTemplate({
    evidenceSubcase:
      row.responseEvidenceSubcase ?? "provider_delivery_evidence_incomplete",
    deliveryAttemptId: row.responseDeliveryAttemptId,
    provider: row.responseProvider,
    providerMessageId: row.responseProviderMessageId,
  });
}

// ---------------------------------------------------------------------------
// Stale-pending detection
// ---------------------------------------------------------------------------

const STALE_ACCEPTED_HOURS = 24;
const AWAITING_RESPONSE_HOURS = 48;

interface StalePendingFlags {
  staleAccepted: boolean;
  awaitingResponse: boolean;
  mailboxOnly: boolean;
  evidenceConflict: boolean;
}

function hoursAgo(iso: string): number {
  const diff = Date.now() - Date.parse(iso);
  return diff > 0 ? Math.floor(diff / (60 * 60 * 1000)) : 0;
}

function deriveStalePendingFlags(row: AdmissionQueueRow): StalePendingFlags {
  const staleAccepted =
    row.responseProviderOutcomeStatus === "accepted" &&
    row.responseProviderOutcomeObservedAt !== null &&
    hoursAgo(row.responseProviderOutcomeObservedAt) >= STALE_ACCEPTED_HOURS &&
    !row.reconciliationResolved;

  const awaitingResponse =
    row.state === "admitted" &&
    !row.respondedAt &&
    hoursAgo(row.createdAt) >= AWAITING_RESPONSE_HOURS;

  const mailboxOnly =
    row.mailboxReceiptStatus !== null &&
    row.responseProviderOutcomeStatus === null;

  const evidenceConflict =
    row.mailboxReceiptStatus !== null &&
    row.responseProviderOutcomeStatus !== null &&
    row.mailboxReceiptStatus !== row.responseProviderOutcomeStatus &&
    row.mailboxReceiptStatus !== "accepted" &&
    row.responseProviderOutcomeStatus !== "accepted";

  return { staleAccepted, awaitingResponse, mailboxOnly, evidenceConflict };
}

// ---------------------------------------------------------------------------
// Per-intake evidence timeline
// ---------------------------------------------------------------------------

interface TimelineStep {
  label: string;
  timestamp: string | null;
  active: boolean;
}

function deriveEvidenceTimeline(row: AdmissionQueueRow): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const stateOrder = [
    "submitted",
    "verification_sent",
    "verified",
    "admitted",
    "responded",
  ] as const;
  const stateLabels: Record<string, string> = {
    submitted: "submitted",
    verification_sent: "verification sent",
    verified: "verified",
    admitted: "admitted",
    responded: "responded",
  };
  const currentIndex = stateOrder.indexOf(
    row.state as (typeof stateOrder)[number],
  );

  for (let i = 0; i < stateOrder.length; i++) {
    const s = stateOrder[i];
    if (i > currentIndex && currentIndex >= 0 && s !== "responded") break;
    if (s === "responded" && !row.respondedAt) continue;

    steps.push({
      label: stateLabels[s],
      timestamp:
        s === "submitted"
          ? row.createdAt
          : s === "responded"
            ? row.respondedAt
            : null,
      active: i === currentIndex,
    });
  }

  if (row.responseProviderOutcomeStatus && row.responseProviderOutcomeObservedAt) {
    steps.push({
      label: `provider: ${row.responseProviderOutcomeStatus}`,
      timestamp: row.responseProviderOutcomeObservedAt,
      active: row.ambiguityResolutionKind === "provider_outcome",
    });
  }

  if (row.mailboxReceiptStatus && row.mailboxReceiptObservedAt) {
    steps.push({
      label: `mailbox: ${row.mailboxReceiptStatus}`,
      timestamp: row.mailboxReceiptObservedAt,
      active: row.ambiguityResolutionKind === "mailbox_receipt",
    });
  }

  if (row.reconciliationRecordedAt) {
    steps.push({
      label: "reconciled",
      timestamp: row.reconciliationRecordedAt,
      active: row.ambiguityResolutionKind === "manual_reconciliation",
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatClosureSourceLabel(
  kind: AdmissionQueueRow["ambiguityResolutionKind"],
): string | null {
  switch (kind) {
    case "provider_outcome":
      return "provider evidence";
    case "mailbox_receipt":
      return "mailbox receipt";
    case "manual_reconciliation":
      return "manual reconciliation";
    default:
      return null;
  }
}

function blockedReasonForRow(row: AdmissionQueueRow): string | null {
  if (row.state === "responded") {
    return "First external response already recorded.";
  }

  const block = isManualReconciliationBlocked({
    providerOutcomeStatus: row.responseProviderOutcomeStatus,
    mailboxReceiptStatus: row.mailboxReceiptStatus,
  });

  return block.blocked ? block.reason : null;
}

function trimText(value: string | null | undefined, maxLength = 120): string | null {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function rowHeadline(row: AdmissionQueueRow): string {
  if (row.state === "responded" && row.firstResponseSubject) {
    return row.firstResponseSubject;
  }

  if (row.submission.subject) {
    return row.submission.subject;
  }

  if (row.submission.category || row.submission.severity) {
    return [row.submission.category, row.submission.severity]
      .filter(Boolean)
      .join(" / ");
  }

  if (row.submission.intent) {
    return row.submission.intent;
  }

  if (row.submission.org) {
    return row.submission.org;
  }

  return row.email ?? row.intakeId;
}

function rowDetail(row: AdmissionQueueRow): string | null {
  if (row.ambiguityResolutionKind === "mailbox_receipt" && row.mailboxReceiptStatus && row.mailboxReceiptObservedAt) {
    return `Mailbox receipt ${formatProviderOutcomeStatusLabel(row.mailboxReceiptStatus)} at ${formatTimestamp(
      row.mailboxReceiptObservedAt,
    )} closed the missing-response ambiguity. Admission state remains ${formatAdmissionStateLabel(row.state)} because mailbox evidence does not write responded.`;
  }

  if (row.responseProviderOutcomeStatus && row.responseProviderOutcomeObservedAt) {
    if (row.ambiguityResolutionKind === "provider_outcome") {
      return `${formatProviderOutcomeStatusLabel(row.responseProviderOutcomeStatus)} at ${formatTimestamp(
        row.responseProviderOutcomeObservedAt,
      )} closed the missing-response ambiguity from downstream evidence. Admission state remains ${formatAdmissionStateLabel(row.state)} because provider evidence does not write responded or manual reconciliation.`;
    }

    return `${formatProviderOutcomeStatusLabel(row.responseProviderOutcomeStatus)} at ${formatTimestamp(
      row.responseProviderOutcomeObservedAt,
    )}. Admission state remains ${formatAdmissionStateLabel(row.state)} until separate operator facts are recorded.`;
  }

  if (row.mailboxReceiptStatus && row.mailboxReceiptObservedAt) {
    return `Mailbox receipt ${formatProviderOutcomeStatusLabel(row.mailboxReceiptStatus)} observed at ${formatTimestamp(
      row.mailboxReceiptObservedAt,
    )}, but provider outcome has not confirmed delivery.`;
  }

  if (row.state === "responded" && row.respondedAt) {
    return `First external reply delivered at ${formatTimestamp(row.respondedAt)}.`;
  }

  if (
    row.reconciliationPending &&
    row.responseDeliveryAttemptId &&
    row.reconciliationSubcase
  ) {
    return `${formatReconciliationSubcaseLabel(row.reconciliationSubcase)} under attempt ${row.responseDeliveryAttemptId}, but the ledger has not yet confirmed responded.`;
  }

  if (
    row.reconciliationResolved &&
    row.ambiguityResolvedAt &&
    row.reconciliationSubcase
  ) {
    const resolvedAt = formatTimestamp(row.ambiguityResolvedAt);
    if (row.ambiguityResolutionKind === "provider_outcome") {
      return `${formatReconciliationSubcaseLabel(row.reconciliationSubcase)} at ${resolvedAt} from downstream provider evidence without backfilling responded.`;
    }

    return `${formatReconciliationSubcaseLabel(row.reconciliationSubcase)} at ${resolvedAt} without backfilling responded.`;
  }

  return (
    trimText(row.submission.message) ??
    trimText(row.submission.scope) ??
    trimText(
      [row.submission.name, row.submission.org].filter(Boolean).join(" / "),
    )
  );
}

function defaultResponseSubject(row: AdmissionQueueRow): string {
  if (row.channel === "support") {
    return `Re: ${row.submission.subject ?? row.submission.category ?? "WitnessOps support request"}`;
  }

  return `WitnessOps follow-up for ${row.submission.org ?? row.email ?? row.intakeId}`;
}

function defaultResponseBody(row: AdmissionQueueRow): string {
  const lines = [
    "Thanks for verifying control of this mailbox.",
    "",
    row.channel === "support"
      ? "We reviewed your support request and will continue from this thread."
      : "We reviewed your request and will continue from this thread.",
    "",
    row.threadId ? `Thread: ${row.threadId}` : null,
    row.submission.message ? `Context: ${row.submission.message}` : null,
    "",
    row.channel === "support"
      ? "Reply to this email with any additional detail that will help us verify or resolve the issue."
      : "Reply to this email with any additional context you want included in the next step.",
    "",
    row.channel === "support" ? "WitnessOps Support" : "WitnessOps",
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

function renderRow(row: AdmissionQueueRow) {
  const stale = deriveStalePendingFlags(row);

  return (
    <div
      key={row.intakeId}
      data-intake-id={row.intakeId}
      className={`${styles.queueItem}${row.hasDivergence ? ` ${styles.queueItemWarning}` : ""}`}
    >
      <div className={styles.queueHeader}>
        <div className={styles.queueHeadline}>{rowHeadline(row)}</div>
        <div className={styles.queueBadges}>
          {row.queueEligible ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeReady}`}>
              READY
            </span>
          ) : null}
          <span className={`${styles.queueBadge} ${styles.queueBadgeAccent}`}>
            {row.channel.toUpperCase()}
          </span>
          <span className={styles.queueBadge}>
            {formatAdmissionStateLabel(row.state).toUpperCase()}
          </span>
          {row.source === "snapshot-only" ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
              SNAPSHOT ONLY
            </span>
          ) : null}
          {row.hasDivergence ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
              MISMATCH
            </span>
          ) : null}
          {row.reconciliationPending ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
              RECONCILE PENDING
            </span>
          ) : null}
          {row.reconciliationResolved ? (
            row.ambiguityResolutionKind === "provider_outcome" ? (
              <span className={`${styles.queueBadge} ${styles.queueBadgeAccent}`}>
                AUTO RESOLVED
              </span>
            ) : row.ambiguityResolutionKind === "mailbox_receipt" ? (
              <span className={`${styles.queueBadge} ${styles.queueBadgeAccent}`}>
                MAILBOX CLOSED
              </span>
            ) : (
              <span className={`${styles.queueBadge} ${styles.queueBadgeReady}`}>
                RECONCILED
              </span>
            )
          ) : null}
          {stale.staleAccepted ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
              STALE ACCEPTED
            </span>
          ) : null}
          {stale.awaitingResponse ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
              AWAITING RESPONSE
            </span>
          ) : null}
          {stale.mailboxOnly ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeAccent}`}>
              MAILBOX ONLY
            </span>
          ) : null}
          {stale.evidenceConflict ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
              EVIDENCE CONFLICT
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.queueMeta}>
        <span>
          <span className={styles.queueMetaLabel}>Email</span>
          {row.email ?? "not captured"}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Intake</span>
          {row.intakeId}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Issuance</span>
          {row.latestIssuanceId ?? "none"}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Thread</span>
          {row.threadId ?? "none"}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Updated</span>
          {formatTimestamp(row.updatedAt)}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Events</span>
          {row.ledgerEventCount}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Assessment</span>
          {row.assessmentStatus ?? "not attached"}
        </span>
        {row.responseActor ? (
          <span>
            <span className={styles.queueMetaLabel}>Actor</span>
            {row.responseActor}
          </span>
        ) : null}
        {row.responseMailbox ? (
          <span>
            <span className={styles.queueMetaLabel}>Mailbox</span>
            {row.responseMailbox}
          </span>
        ) : null}
        {row.responseProvider ? (
          <span>
            <span className={styles.queueMetaLabel}>Provider</span>
            {row.responseProvider}
          </span>
        ) : null}
        {row.responseProviderMessageId ? (
          <span>
            <span className={styles.queueMetaLabel}>Provider Message</span>
            {row.responseProviderMessageId}
          </span>
        ) : null}
        {row.responseDeliveryAttemptId ? (
          <span>
            <span className={styles.queueMetaLabel}>Delivery Attempt</span>
            {row.responseDeliveryAttemptId}
          </span>
        ) : null}
        {row.responseProviderOutcomeStatus ? (
          <span>
            <span className={styles.queueMetaLabel}>Provider Outcome</span>
            {formatProviderOutcomeStatusLabel(row.responseProviderOutcomeStatus)}
          </span>
        ) : null}
        {row.responseProviderOutcomeEventId ? (
          <span>
            <span className={styles.queueMetaLabel}>Outcome Event</span>
            {row.responseProviderOutcomeEventId}
          </span>
        ) : null}
        {row.responseProviderOutcomeSource ? (
          <span>
            <span className={styles.queueMetaLabel}>Outcome Source</span>
            {row.responseProviderOutcomeSource}
          </span>
        ) : null}
        {row.mailboxReceiptStatus ? (
          <span>
            <span className={styles.queueMetaLabel}>Mailbox Receipt</span>
            {formatProviderOutcomeStatusLabel(row.mailboxReceiptStatus)}
          </span>
        ) : null}
        {row.mailboxReceiptObservedAt ? (
          <span>
            <span className={styles.queueMetaLabel}>Receipt Observed</span>
            {formatTimestamp(row.mailboxReceiptObservedAt)}
          </span>
        ) : null}
        {row.mailboxReceiptId ? (
          <span>
            <span className={styles.queueMetaLabel}>Receipt ID</span>
            {row.mailboxReceiptId}
          </span>
        ) : null}
        {row.reconciliationActor ? (
          <span>
            <span className={styles.queueMetaLabel}>Reconciled By</span>
            {row.reconciliationActor}
          </span>
        ) : null}
        {row.reconciliationRecordedAt ? (
          <span>
            <span className={styles.queueMetaLabel}>Reconciled At</span>
            {formatTimestamp(row.reconciliationRecordedAt)}
          </span>
        ) : null}
        {row.ambiguityResolvedAt ? (
          <span>
            <span className={styles.queueMetaLabel}>Resolved At</span>
            {formatTimestamp(row.ambiguityResolvedAt)}
          </span>
        ) : null}
      </div>

      {(() => {
        const timeline = deriveEvidenceTimeline(row);
        return timeline.length > 1 ? (
          <div className={styles.evidenceTimeline}>
            {timeline.map((step, i) => (
              <span key={`${step.label}-${i}`} className={styles.evidenceStep}>
                {i > 0 ? (
                  <span className={styles.evidenceStepConnector}> → </span>
                ) : null}
                <span
                  className={
                    step.active
                      ? styles.evidenceStepActive
                      : styles.evidenceStepLabel
                  }
                >
                  {step.label}
                </span>
              </span>
            ))}
          </div>
        ) : null;
      })()}

      {rowDetail(row) ? (
        <div className={styles.queueDetail}>{rowDetail(row)}</div>
      ) : null}

      {row.responseEvidenceSubcase ? (
        <div className={styles.caseLabel}>
          Evidence case: {formatReconciliationSubcaseLabel(row.responseEvidenceSubcase)}
        </div>
      ) : null}

      {row.responseProviderOutcomeRawEventType ? (
        <div className={styles.caseLabel}>
          Downstream evidence: {row.responseProviderOutcomeRawEventType}
        </div>
      ) : null}

      {row.ambiguityResolutionKind ? (
        <div className={styles.caseLabel}>
          Closed by: {formatClosureSourceLabel(row.ambiguityResolutionKind)}
        </div>
      ) : null}

      {row.reconciliationResolved && row.reconciliationSubcase ? (
        <div className={styles.caseLabel}>
          Current case: {formatReconciliationSubcaseLabel(row.reconciliationSubcase)}
        </div>
      ) : null}

      {row.hasDivergence ? (
        <div className={styles.queueWarning}>
          {row.divergenceReasons.join(" | ")}
        </div>
      ) : null}

      {row.reconciliationResolved && row.reconciliationNote ? (
        <div className={styles.reconciliationReason}>{row.reconciliationNote}</div>
      ) : null}

      {row.queueEligible && !row.hasDivergence ? (
        <AdminRespondIntakeForm
          intakeId={row.intakeId}
          defaultSubject={defaultResponseSubject(row)}
          defaultBody={defaultResponseBody(row)}
        />
      ) : null}

      {row.reconciliationPending && !row.reconciliationResolved ? (
        <AdminReconcileIntakeForm
          intakeId={row.intakeId}
          defaultNote={buildDefaultReconciliationNote(row)}
          evidenceSubcase={row.responseEvidenceSubcase}
          evidenceCaseLabel={
            row.responseEvidenceSubcase
              ? formatReconciliationSubcaseLabel(row.responseEvidenceSubcase)
              : null
          }
        />
      ) : blockedReasonForRow(row) ? (
        <div className={styles.queueBlockedReason}>
          Blocked: {blockedReasonForRow(row)}
        </div>
      ) : row.reconciliationPending ? (
        <div className={styles.queueWarning}>
          Cannot reconcile until the current evidence case is classifiable from stored facts.
        </div>
      ) : null}
    </div>
  );
}

export async function AdminAdmissionQueue() {
  try {
    const view = await buildAdmissionQueueView();
    const report = buildReconciliationReportFromView(view);
    const reconciliationRows = view.rows.filter(
      (row) => row.reconciliationPending,
    );
    const staleAcceptedCount = view.rows.filter(
      (row) => deriveStalePendingFlags(row).staleAccepted,
    ).length;

    const filterGroups: FilterGroup[] = [
      {
        key: "pending",
        label: "Pending",
        intakeIds: view.rows
          .filter((r) => r.reconciliationPending)
          .map((r) => r.intakeId),
      },
      {
        key: "stale_accepted",
        label: "Stale Accepted",
        intakeIds: view.rows
          .filter((r) => deriveStalePendingFlags(r).staleAccepted)
          .map((r) => r.intakeId),
      },
      {
        key: "awaiting_response",
        label: "Awaiting Response",
        intakeIds: view.rows
          .filter((r) => deriveStalePendingFlags(r).awaitingResponse)
          .map((r) => r.intakeId),
      },
      {
        key: "evidence_conflict",
        label: "Evidence Conflict",
        intakeIds: view.rows
          .filter((r) => deriveStalePendingFlags(r).evidenceConflict)
          .map((r) => r.intakeId),
      },
      {
        key: "resolved_provider",
        label: "Closed: Provider",
        intakeIds: view.rows
          .filter((r) => r.ambiguityResolutionKind === "provider_outcome")
          .map((r) => r.intakeId),
      },
      {
        key: "resolved_mailbox",
        label: "Closed: Mailbox",
        intakeIds: view.rows
          .filter((r) => r.ambiguityResolutionKind === "mailbox_receipt")
          .map((r) => r.intakeId),
      },
      {
        key: "resolved_manual",
        label: "Reconciled",
        intakeIds: view.rows
          .filter((r) => r.ambiguityResolutionKind === "manual_reconciliation")
          .map((r) => r.intakeId),
      },
      ...report.byProvider.map((p) => ({
        key: `provider_${p.provider}`,
        label: `Provider: ${p.provider}`,
        intakeIds: view.rows
          .filter((r) => r.responseProvider === p.provider)
          .map((r) => r.intakeId),
      })),
    ];

    return (
      <>
        <div className={styles.sectionHeader}>Admission Queue</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Projection mode</span>
          <span className={styles.rowValueAccent}>LEDGER FIRST</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Ledger events</span>
          <span className={styles.rowValue}>{view.eventCount}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Projected rows</span>
          <span className={styles.rowValue}>{view.summary.total}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Ready for response</span>
          <span className={styles.rowValueGreen}>{view.summary.ready}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Divergence</span>
          <span
            className={
              view.summary.divergent > 0
                ? styles.rowValueAlert
                : styles.rowValueGreen
            }
          >
            {view.summary.divergent}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Reconciliation pending</span>
          <span
            className={
              view.summary.reconciliationPending > 0
                ? styles.rowValueAlert
                : styles.rowValueGreen
            }
          >
            {view.summary.reconciliationPending}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Resolved ambiguity</span>
          <span className={styles.rowValue}>{view.summary.reconciliationResolved}</span>
        </div>

        <div className={styles.summaryGrid}>
          {adminAdmissionStateOrder.map((state) => (
            <div key={state} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>
                {formatAdmissionStateLabel(state)}
              </div>
              <div className={styles.summaryValue}>{view.summary.byState[state]}</div>
            </div>
          ))}
        </div>

        <div className={styles.summaryNote}>
          Derived from events.ndjson. Snapshot mismatches are surfaced, not healed.
        </div>

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

        {reconciliationRows.length > 0 ? (
          <>
            <div className={styles.sectionHeader}>Reconciliation</div>
            <div className={styles.reconciliationNote}>
              These rows contain outbound delivery metadata without matching ledger confirmation of responded. Reconcile before retrying.
            </div>
            <div className={styles.reconciliationList}>
              {reconciliationRows.map((row) => (
                <div key={row.intakeId} className={styles.reconciliationItem}>
                  <div className={styles.reconciliationHeadline}>
                    {row.firstResponseSubject ?? row.email ?? row.intakeId}
                  </div>
                  {row.responseEvidenceSubcase ? (
                    <div className={styles.caseLabel}>
                      {formatReconciliationSubcaseLabel(
                        row.responseEvidenceSubcase,
                      )}
                    </div>
                  ) : null}
                  <div className={styles.reconciliationMeta}>
                    <span>{row.intakeId}</span>
                    <span>{row.email ?? "not captured"}</span>
                    <span>{row.responseActor ?? "actor missing"}</span>
                    <span>{row.responseMailbox ?? "mailbox missing"}</span>
                    <span>{row.responseProvider ?? "provider missing"}</span>
                    <span>{row.responseProviderMessageId ?? "provider message missing"}</span>
                    <span>{row.responseDeliveryAttemptId ?? "attempt missing"}</span>
                    <span>
                      {row.responseProviderOutcomeStatus
                        ? formatProviderOutcomeStatusLabel(
                            row.responseProviderOutcomeStatus,
                          )
                        : "no downstream outcome"}
                    </span>
                  </div>
                  <div className={styles.reconciliationReason}>
                    {row.divergenceReasons.join(" | ")}
                  </div>
                  <AdminReconcileIntakeForm
                    intakeId={row.intakeId}
                    defaultNote={buildDefaultReconciliationNote(row)}
                    evidenceSubcase={row.responseEvidenceSubcase}
                    evidenceCaseLabel={
                      row.responseEvidenceSubcase
                        ? formatReconciliationSubcaseLabel(
                            row.responseEvidenceSubcase,
                          )
                        : null
                    }
                  />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {view.rows.length === 0 ? (
          <div className={styles.emptyState}>No admission history yet.</div>
        ) : (
          <>
            <AdminQueueFilter groups={filterGroups} />
            <div className={styles.queueList}>{view.rows.map(renderRow)}</div>
          </>
        )}
      </>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return (
      <>
        <div className={styles.sectionHeader}>Admission Queue</div>
        <div className={styles.emptyState}>
          Unable to rebuild the queue from the ledger: {message}
        </div>
      </>
    );
  }
}
