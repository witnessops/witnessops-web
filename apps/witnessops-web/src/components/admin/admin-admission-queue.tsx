import {
  buildAdmissionQueueView,
  formatAdmissionStateLabel,
  type AdmissionQueueRow,
} from "@/lib/server/admission-queue";
import { buildPostApprovalLifecycle, type PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";
import type { TokenIssuanceRecord } from "@/lib/server/token-store";
import { PostApprovalLifecycle } from "../post-approval-lifecycle";
import { formatProviderOutcomeStatusLabel } from "@/lib/provider-outcomes";
import { isManualReconciliationBlocked } from "@/lib/server/evidence-resolution";
import { buildReconciliationNoteTemplate } from "@/lib/server/reconciliation-note-policy";
import { formatReconciliationSubcaseLabel } from "@/lib/server/reconciliation-subcases";
import { buildReconciliationReportFromView } from "@/lib/server/reconciliation-report";
import { QUEUE_FILTER_KEYS } from "@/lib/admin/queue-filter-keys";

import type { FilterGroup } from "@/lib/admin/queue-filter-types";
import { AdminQueueFilteredList } from "./admin-queue-filtered-list";
import { AdminOperatorActionsForm } from "./admin-operator-actions-form";
import { AdminReconcileIntakeForm } from "./admin-reconcile-intake-form";
import { AdminRespondIntakeForm } from "./admin-respond-intake-form";
import styles from "./admin.module.css";

function formatTimestamp(value: string): string {
  return value.replace("T", " ").replace("Z", " UTC");
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

const POST_APPROVAL_STAGE_LABEL: Record<string, string> = {
  awaiting_approval: "awaiting approval",
  handoff_pending: "handoff pending",
  handoff_accepted: "handoff accepted",
  delivery_pending: "delivery pending",
  delivered: "delivered",
  acknowledged: "acknowledged",
  completed: "completed",
  retry_pending: "retry pending",
  failed: "failed",
};

function renderRow(row: AdmissionQueueRow, lifecycle?: PostApprovalLifecycleView) {
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
        {row.controlPlaneRunId ? (
          <span>
            <span className={styles.queueMetaLabel}>CP Run</span>
            {row.controlPlaneRunId}
          </span>
        ) : null}
        {lifecycle ? (
          <span data-testid="post-approval-stage" data-stage={lifecycle.stage}>
            <span className={styles.queueMetaLabel}>Lifecycle</span>
            {POST_APPROVAL_STAGE_LABEL[lifecycle.stage] ?? lifecycle.stage}
            {lifecycle.authoritative
              ? ` · cp:${lifecycle.authoritative.controlPlaneState}`
              : ""}
          </span>
        ) : null}
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

      {lifecycle && (lifecycle.stage === "failed" || lifecycle.stage === "retry_pending") ? (
        <details data-testid="post-approval-retry-panel" className="mt-2">
          <summary className="cursor-pointer text-xs font-mono text-amber-300">
            Delivery {lifecycle.stage === "retry_pending" ? "retry pending" : "failed"} — open retry surface
          </summary>
          <div className="mt-2">
            <PostApprovalLifecycle view={lifecycle} retryActionEnabled />
          </div>
        </details>
      ) : null}

      <AdminOperatorActionsForm
        intakeId={row.intakeId}
        alreadyRejected={row.state === "rejected"}
        applicable={
          row.state === "submitted" ||
          row.state === "verification_sent" ||
          row.state === "verified" ||
          row.state === "admitted"
        }
        pendingClarification={row.operatorActionKind === "request_clarification"}
      />

      {row.operatorActionKind === "request_clarification" && row.state !== "rejected" ? (
        <div className={styles.queueWarning} data-testid="operator-action-state" data-kind="request_clarification">
          Operator clarification request recorded. <strong>No operator action required</strong> — waiting on the claimant to amend, proceed, retract, or disagree.
        </div>
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

interface AdminAdmissionQueueProps {
  initialFilter?: string | null;
}

async function buildLifecycleByRunId(
  rows: AdmissionQueueRow[],
): Promise<Map<string, PostApprovalLifecycleView>> {
  const result = new Map<string, PostApprovalLifecycleView>();
  const targets = rows.filter((r) => r.controlPlaneRunId);
  if (targets.length === 0) return result;
  const fetched = await Promise.all(
    targets.map(async (row) => {
      // Synthesize a minimal TokenIssuanceRecord-shaped object — only the
      // fields buildPostApprovalLifecycle reads. Avoids re-fetching the
      // issuance from disk for each row.
      const minimal = {
        approvalStatus: "approved" as const,
        approvalAt: row.respondedAt ?? row.updatedAt,
        controlPlaneRunId: row.controlPlaneRunId!,
      } as TokenIssuanceRecord;
      return [row.controlPlaneRunId!, await buildPostApprovalLifecycle(minimal)] as const;
    }),
  );
  for (const [runId, view] of fetched) result.set(runId, view);
  return result;
}

export async function AdminAdmissionQueue({ initialFilter }: AdminAdmissionQueueProps = {}) {
  try {
    const view = await buildAdmissionQueueView();
    const lifecycleByRunId = await buildLifecycleByRunId(view.rows);
    const report = buildReconciliationReportFromView(view);
    const reconciliationRows = view.rows.filter(
      (row) => row.reconciliationPending,
    );
    const filterGroups: FilterGroup[] = [
      {
        key: QUEUE_FILTER_KEYS.ready,
        label: "Ready",
        intakeIds: view.rows
          .filter((r) => r.queueEligible)
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.pending,
        label: "Pending",
        intakeIds: view.rows
          .filter((r) => r.reconciliationPending)
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.divergent,
        label: "Divergent",
        intakeIds: view.rows
          .filter((r) => r.hasDivergence)
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.staleAccepted,
        label: "Stale Accepted",
        intakeIds: view.rows
          .filter((r) => deriveStalePendingFlags(r).staleAccepted)
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.awaitingResponse,
        label: "Awaiting Response",
        intakeIds: view.rows
          .filter((r) => deriveStalePendingFlags(r).awaitingResponse)
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.evidenceConflict,
        label: "Evidence Conflict",
        intakeIds: view.rows
          .filter((r) => deriveStalePendingFlags(r).evidenceConflict)
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.resolvedProvider,
        label: "Closed: Provider",
        intakeIds: view.rows
          .filter((r) => r.ambiguityResolutionKind === "provider_outcome")
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.resolvedMailbox,
        label: "Closed: Mailbox",
        intakeIds: view.rows
          .filter((r) => r.ambiguityResolutionKind === "mailbox_receipt")
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.resolvedManual,
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
          <AdminQueueFilteredList
            groups={filterGroups}
            initialFilter={initialFilter ?? null}
          >
            {view.rows.map((row) =>
              renderRow(
                row,
                row.controlPlaneRunId
                  ? lifecycleByRunId.get(row.controlPlaneRunId)
                  : undefined,
              ),
            )}
          </AdminQueueFilteredList>
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
