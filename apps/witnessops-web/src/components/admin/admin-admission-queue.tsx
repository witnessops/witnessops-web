import Link from "next/link";
import { cookies } from "next/headers";
import {
  buildAdmissionQueueView,
  formatAdmissionStateLabel,
  type AdmissionQueueRow,
} from "@/lib/server/admission-queue";
import { buildPostApprovalLifecycle, type PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";
import type { TokenIssuanceRecord } from "@/lib/server/token-store";
import { verifyAdminSessionCookie } from "@/lib/server/admin-session";
import { PostApprovalLifecycle } from "../post-approval-lifecycle";
import { formatProviderOutcomeStatusLabel } from "@/lib/provider-outcomes";
import { isManualReconciliationBlocked } from "@/lib/server/evidence-resolution";
import { buildReconciliationNoteTemplate } from "@/lib/server/reconciliation-note-policy";
import { formatReconciliationSubcaseLabel } from "@/lib/server/reconciliation-subcases";
import { buildReconciliationReportFromView } from "@/lib/server/reconciliation-report";
import { QUEUE_FILTER_KEYS } from "@/lib/admin/queue-filter-keys";

import type { FilterGroup } from "@/lib/admin/queue-filter-types";
import { AdminOperatorActionsForm } from "./admin-operator-actions-form";
import { AdminReconcileIntakeForm } from "./admin-reconcile-intake-form";
import { AdminRespondIntakeForm } from "./admin-respond-intake-form";
import { AdminQueueActionRail } from "./admin-queue-action-rail";
import { AdminQueueVerifyProjection } from "./admin-queue-verify-projection";
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

async function resolveAdminActor(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("witnessops-admin-session")?.value;
  if (sessionCookie) {
    const payload = await verifyAdminSessionCookie(sessionCookie);
    if (payload) {
      if (
        payload.actorAuthSource === "oidc_session" &&
        typeof payload.actor === "string"
      ) {
        return payload.actor;
      }
      if (typeof payload.hash === "string") {
        return `admin:${payload.hash}`;
      }
    }
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS === "1"
  ) {
    return "local-dev";
  }

  return null;
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

function formatQueueWorkflowLabel(state: AdmissionQueueRow["queueWorkflowState"]): string {
  return state.replace(/_/g, " ");
}

function formatChannelLabel(channel: AdmissionQueueRow["channel"]): string {
  if (channel === "engage") {
    return "review";
  }
  return channel;
}

function formatRequesterLabel(row: AdmissionQueueRow): string {
  const parts = [row.submission.name, row.submission.org].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return row.email ?? row.intakeId;
}

function formatScopeContractLabel(row: AdmissionQueueRow): string {
  if (!row.queueScopeContractStatus) {
    return "none";
  }

  return row.queueCurrentScopeContractId
    ? `${row.queueScopeContractStatus} · ${row.queueCurrentScopeContractId}`
    : row.queueScopeContractStatus;
}

function buildQueueUrl(filter: string | null, selected: string | null): string {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (selected) params.set("selected", selected);
  const query = params.toString();
  return query ? `/admin/queue?${query}` : "/admin/queue";
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
  authorization_pending: "awaiting start",
  authorized: "authorized",
  delivery_pending: "delivery pending",
  delivered: "delivered",
  acknowledged: "acknowledged",
  completed: "completed",
  accepted: "accepted",
  rejected: "rejected",
  retry_pending: "retry pending",
  failed: "failed",
};

function renderQueueListItem(
  row: AdmissionQueueRow,
  activeFilter: string | null,
  selectedIntakeId: string | null,
) {
  const stale = deriveStalePendingFlags(row);
  const queueAge = `${hoursAgo(row.createdAt)}h`;
  const lastActionAge = row.queueLastOperatorActionAt
    ? `${hoursAgo(row.queueLastOperatorActionAt)}h`
    : "n/a";
  const isSelected = row.intakeId === selectedIntakeId;
  return (
    <Link
      key={row.intakeId}
      href={buildQueueUrl(activeFilter, row.intakeId)}
      className={`${styles.queueListItem}${isSelected ? ` ${styles.queueListItemActive}` : ""}`}
    >
      <div className={styles.queueListPrimary}>
        <div className={styles.queueListHeadline}>{rowHeadline(row)}</div>
        <div className={styles.queueListMeta}>
          <span>{row.intakeId}</span>
          <span>{formatChannelLabel(row.channel)}</span>
          <span>{row.queueAssignedOperator ?? "unassigned"}</span>
          <span>{formatQueueWorkflowLabel(row.queueWorkflowState)}</span>
          <span>{row.queuePriority}</span>
          <span>age {queueAge}</span>
          <span>last action {lastActionAge}</span>
        </div>
      </div>
      <div className={styles.queueBadges}>
        {row.queueEligible ? (
          <span className={`${styles.queueBadge} ${styles.queueBadgeReady}`}>
            READY
          </span>
        ) : null}
        <span className={`${styles.queueBadge} ${styles.queueBadgeAccent}`}>
          {formatQueueWorkflowLabel(row.queueWorkflowState).toUpperCase()}
        </span>
        <span className={styles.queueBadge}>{row.queuePriority.toUpperCase()}</span>
        {row.queueClarificationOutstanding ? (
          <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
            CLARIFICATION
          </span>
        ) : null}
        {row.hasDivergence ? (
          <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
            DIVERGENT
          </span>
        ) : null}
        {stale.awaitingResponse ? (
          <span className={`${styles.queueBadge} ${styles.queueBadgeAlert}`}>
            AWAITING RESPONSE
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function renderDetailPanel(
  row: AdmissionQueueRow,
  lifecycle: PostApprovalLifecycleView | undefined,
) {
  const stale = deriveStalePendingFlags(row);
  const queueAge = `${hoursAgo(row.createdAt)}h`;
  const lastActionAge = row.queueLastOperatorActionAt
    ? `${hoursAgo(row.queueLastOperatorActionAt)}h`
    : "n/a";
  return (
    <div className={styles.queueDetailPanel}>
      <div className={styles.queueHeader}>
        <div className={styles.queueHeaderMain}>
          <div className={styles.queueHeaderTitle}>{rowHeadline(row)}</div>
          <div className={styles.queueHeaderSubline}>
            {formatRequesterLabel(row)}
          </div>
          <div className={styles.queueHeaderMeta}>
            <span className={styles.queueHeaderMetaItem}>
              <span className={styles.queueHeaderMetaLabel}>Intake</span>
              {row.intakeId}
            </span>
            <span className={styles.queueHeaderMetaItem}>
              <span className={styles.queueHeaderMetaLabel}>Channel</span>
              {formatChannelLabel(row.channel)}
            </span>
            <span className={styles.queueHeaderMetaItem}>
              <span className={styles.queueHeaderMetaLabel}>Owner</span>
              {row.queueAssignedOperator ?? "unassigned"}
            </span>
            <span className={styles.queueHeaderMetaItem}>
              <span className={styles.queueHeaderMetaLabel}>Priority</span>
              {row.queuePriority}
            </span>
            <span className={styles.queueHeaderMetaItem}>
              <span className={styles.queueHeaderMetaLabel}>Age</span>
              {queueAge}
            </span>
            <span className={styles.queueHeaderMetaItem}>
              <span className={styles.queueHeaderMetaLabel}>Last action</span>
              {lastActionAge}
            </span>
          </div>
        </div>
        <div className={styles.queueBadges}>
          {row.queueEligible ? (
            <span className={`${styles.queueBadge} ${styles.queueBadgeReady}`}>
              READY
            </span>
          ) : null}
          <span className={`${styles.queueBadge} ${styles.queueBadgeAccent}`}>
            {formatChannelLabel(row.channel).toUpperCase()}
          </span>
          <span className={styles.queueBadge}>
            {formatAdmissionStateLabel(row.state).toUpperCase()}
          </span>
          <span className={`${styles.queueBadge} ${styles.queueBadgeAccent}`}>
            {formatQueueWorkflowLabel(row.queueWorkflowState).toUpperCase()}
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
          <span className={styles.queueMetaLabel}>Queue State</span>
          {formatQueueWorkflowLabel(row.queueWorkflowState)}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Queue Owner</span>
          {row.queueAssignedOperator ?? "unassigned"}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Priority</span>
          {row.queuePriority}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Scope Contract</span>
          {formatScopeContractLabel(row)}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Clarification</span>
          {row.queueClarificationOutstanding ? "outstanding" : "clear"}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Queue Response</span>
          {row.queueRespondedAt ? formatTimestamp(row.queueRespondedAt) : "not yet"}
        </span>
        <span>
          <span className={styles.queueMetaLabel}>Projection</span>
          v{row.queueProjectionVersion} · seq {row.queueEventSequence}
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
        {lifecycle &&
        lifecycle.stage !== "awaiting_approval" &&
        lifecycle.stage !== "handoff_pending" &&
        lifecycle.stage !== "retry_pending" &&
        lifecycle.stage !== "failed" &&
        lifecycle.retryRequest?.recovered === true ? (
          <span
            data-testid="post-approval-retry-recovered"
            title={`Retry requested ${lifecycle.retryRequest.requestedAt} by ${lifecycle.retryRequest.requestedBy}; control plane recorded a later delivery`}
          >
            <span className={styles.queueMetaLabel}>Retry</span>
            recovered
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

      <div className={styles.queueActionPanel}>
        <div className={styles.queueActionTitle}>Queue actions</div>
        <AdminQueueActionRail
          key={`queue-action-${row.intakeId}`}
          intakeId={row.intakeId}
          projectionVersion={row.queueProjectionVersion}
          eventSequence={row.queueEventSequence}
          queueWorkflowState={row.queueWorkflowState}
          queueAssignedOperator={row.queueAssignedOperator}
          queuePriority={row.queuePriority}
          queueClarificationOutstanding={row.queueClarificationOutstanding}
          queueScopeContractStatus={row.queueScopeContractStatus}
          queueCurrentScopeContractId={row.queueCurrentScopeContractId}
          queueRespondedAt={row.queueRespondedAt}
        />
      </div>

      <details className={styles.queueDiagnostics}>
        <summary className={styles.queueDiagnosticsSummary}>
          Integrity & verification
        </summary>
        <div className={styles.queueDiagnosticsBody}>
          <AdminQueueVerifyProjection
            key={`queue-verify-${row.intakeId}`}
            intakeId={row.intakeId}
          />
        </div>
      </details>

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

      {lifecycle?.stage === "authorization_pending" ? (
        <div className="mt-2">
          <PostApprovalLifecycle view={lifecycle} authorizeActionEnabled />
        </div>
      ) : null}

      <details className={styles.legacyActions}>
        <summary className={styles.legacyActionsSummary}>
          Legacy intake actions
        </summary>
        <div className={styles.legacyActionsBody}>
          {row.queueEligible && !row.hasDivergence ? (
            <AdminRespondIntakeForm
              intakeId={row.intakeId}
              defaultSubject={defaultResponseSubject(row)}
              defaultBody={defaultResponseBody(row)}
            />
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
            claimantActionBlocking={
              row.claimantActionKind === "retract" ||
              row.claimantActionKind === "disagree"
            }
          />

          {row.operatorActionKind === "request_clarification" && row.state !== "rejected" ? (
            <div
              className={styles.queueWarning}
              data-testid="operator-action-state"
              data-kind="request_clarification"
            >
              Operator clarification request recorded. <strong>No operator action required</strong> — waiting on the claimant to amend, proceed, retract, or disagree.
            </div>
          ) : null}

          {row.claimantActionKind === "retract" ||
          row.claimantActionKind === "disagree" ? (
            <div
              className={styles.queueWarning}
              data-testid="claimant-action-state"
              data-kind={row.claimantActionKind}
            >
              Claimant action recorded: <strong>{row.claimantActionKind}</strong>.
              Approval is blocked until the claimant reopens it. This is
              independent of any operator action; rescinding an operator
              rejection alone will not unblock approval.
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
      </details>
    </div>
  );
}

interface AdminAdmissionQueueProps {
  initialFilter?: string | null;
  selectedIntakeId?: string | null;
}

export async function buildLifecycleByRunId(
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

export async function AdminAdmissionQueue({
  initialFilter,
  selectedIntakeId,
}: AdminAdmissionQueueProps = {}) {
  try {
    const view = await buildAdmissionQueueView();
    const lifecycleByRunId = await buildLifecycleByRunId(view.rows);
    const report = buildReconciliationReportFromView(view);
    const currentActor = await resolveAdminActor();
    const reconciliationRows = view.rows.filter(
      (row) => row.reconciliationPending,
    );

    const workflowTabs: FilterGroup[] = [
      {
        key: QUEUE_FILTER_KEYS.queueMyWork,
        label: "My Work",
        intakeIds: currentActor
          ? view.rows
              .filter((r) => r.queueAssignedOperator === currentActor)
              .map((r) => r.intakeId)
          : [],
      },
      {
        key: QUEUE_FILTER_KEYS.queueUnassigned,
        label: "Unassigned",
        intakeIds: view.rows
          .filter((r) => !r.queueAssignedOperator)
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.queuePendingReview,
        label: "Pending Review",
        intakeIds: view.rows
          .filter((r) => r.queueWorkflowState === "pending_operator_review")
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.queueClarification,
        label: "Clarification",
        intakeIds: view.rows
          .filter((r) => r.queueWorkflowState === "clarification_pending")
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.queueScopeDrafting,
        label: "Scope Drafting",
        intakeIds: view.rows
          .filter((r) => r.queueWorkflowState === "scope_drafting")
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.queueScopeApproved,
        label: "Scope Approved",
        intakeIds: view.rows
          .filter((r) => r.queueWorkflowState === "scope_approved")
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.queueResponded,
        label: "Responded",
        intakeIds: view.rows
          .filter((r) => r.queueWorkflowState === "responded")
          .map((r) => r.intakeId),
      },
    ];

    const filterGroups: FilterGroup[] = [
      ...workflowTabs,
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
      {
        key: QUEUE_FILTER_KEYS.customerAccepted,
        label: "Customer: Accepted",
        intakeIds: view.rows
          .filter(
            (r) =>
              r.controlPlaneRunId &&
              lifecycleByRunId.get(r.controlPlaneRunId)?.stage === "accepted",
          )
          .map((r) => r.intakeId),
      },
      {
        key: QUEUE_FILTER_KEYS.customerRejected,
        label: "Customer: Rejected",
        intakeIds: view.rows
          .filter(
            (r) =>
              r.controlPlaneRunId &&
              lifecycleByRunId.get(r.controlPlaneRunId)?.stage === "rejected",
          )
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

    const activeFilter = initialFilter ?? null;
    const activeGroup = activeFilter
      ? filterGroups.find((g) => g.key === activeFilter) ?? null
      : null;
    const allowedSet = activeGroup ? new Set(activeGroup.intakeIds) : null;
    const filteredRows = allowedSet
      ? view.rows.filter((row) => allowedSet.has(row.intakeId))
      : view.rows;
    const selectedRow =
      (selectedIntakeId
        ? filteredRows.find((row) => row.intakeId === selectedIntakeId)
        : null) ??
      filteredRows[0] ??
      null;
    const selectedLifecycle =
      selectedRow?.controlPlaneRunId
        ? lifecycleByRunId.get(selectedRow.controlPlaneRunId)
        : undefined;

    const workflowTabKeys = new Set<string>([
      QUEUE_FILTER_KEYS.queueMyWork,
      QUEUE_FILTER_KEYS.queueUnassigned,
      QUEUE_FILTER_KEYS.queuePendingReview,
      QUEUE_FILTER_KEYS.queueClarification,
      QUEUE_FILTER_KEYS.queueScopeDrafting,
      QUEUE_FILTER_KEYS.queueScopeApproved,
      QUEUE_FILTER_KEYS.queueResponded,
    ]);
    const workflowTabsVisible = workflowTabs.filter(
      (group) =>
        group.key !== QUEUE_FILTER_KEYS.queueMyWork || Boolean(currentActor),
    );
    const secondaryFilters = filterGroups.filter(
      (group) =>
        !workflowTabKeys.has(group.key) && group.intakeIds.length > 0,
    );

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
                  <Link
                    className={styles.rowAction}
                    href={buildQueueUrl(activeFilter, row.intakeId)}
                  >
                    Open in queue
                  </Link>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {view.rows.length === 0 ? (
          <div className={styles.emptyState}>No admission history yet.</div>
        ) : (
          <div className={styles.queueSplitView}>
            <div className={styles.queueListPane}>
              <div className={styles.queueTabs}>
                <Link
                  href={buildQueueUrl(null, null)}
                  className={`${styles.queueTab}${!activeFilter ? ` ${styles.queueTabActive}` : ""}`}
                >
                  All
                  <span className={styles.queueTabCount}>{view.rows.length}</span>
                </Link>
                {workflowTabsVisible.map((tab) => (
                  <Link
                    key={tab.key}
                    href={buildQueueUrl(tab.key, null)}
                    className={`${styles.queueTab}${activeFilter === tab.key ? ` ${styles.queueTabActive}` : ""}`}
                  >
                    {tab.label}
                    <span className={styles.queueTabCount}>{tab.intakeIds.length}</span>
                  </Link>
                ))}
              </div>

              {secondaryFilters.length > 0 ? (
                <div className={styles.filterBar}>
                  {secondaryFilters.map((group) => (
                    <Link
                      key={group.key}
                      href={buildQueueUrl(group.key, null)}
                      className={`${styles.filterPill}${activeFilter === group.key ? ` ${styles.filterPillActive}` : ""}`}
                    >
                      {group.label} ({group.intakeIds.length})
                    </Link>
                  ))}
                  {activeFilter ? (
                    <Link href={buildQueueUrl(null, null)} className={styles.filterPill}>
                      Clear
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {filteredRows.length === 0 ? (
                <div className={styles.emptyState}>
                  No items match the current filter.
                </div>
              ) : (
                <div className={styles.queueList}>
                  {filteredRows.map((row) =>
                    renderQueueListItem(row, activeFilter, selectedRow?.intakeId ?? null),
                  )}
                </div>
              )}
            </div>

            <div className={styles.queueDetailPane}>
              {selectedRow ? (
                renderDetailPanel(selectedRow, selectedLifecycle)
              ) : (
                <div className={styles.emptyState}>
                  Select an intake to view queue details.
                </div>
              )}
            </div>
          </div>
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
