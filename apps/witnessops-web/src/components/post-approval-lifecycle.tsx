import React from "react";

/**
 * Post-approval lifecycle renderer (WEB-001).
 *
 * Read-only server component. Renders the discriminated lifecycle view
 * built by `buildPostApprovalLifecycle`. Visually separates LOCAL handoff
 * metadata from AUTHORITATIVE downstream lifecycle so users can see which
 * facts came from where.
 */

import type { PostApprovalLifecycleView, PostApprovalStage } from "@/lib/server/post-approval-lifecycle";
import { AdminAuthorizeRunAction } from "@/components/admin/admin-authorize-run-action";

interface Props {
  view: PostApprovalLifecycleView;
  /**
   * When set, render a bounded retry-request affordance that POSTs to
   * `/api/admin/lifecycle/{controlPlaneRunId}/retry-request`. Only the
   * admin queue passes this in — the assessment page renders read-only.
   */
  retryActionEnabled?: boolean;
  /**
   * When set, render the admin/operator authorize-start affordance for
   * control-plane runs that are still at requested.
   */
  authorizeActionEnabled?: boolean;
}

const STAGE_LABELS: Record<PostApprovalStage, string> = {
  awaiting_approval: "Awaiting approval",
  handoff_pending: "Handoff pending",
  authorization_pending: "Awaiting start",
  authorized: "Authorized",
  delivery_pending: "Delivery pending",
  delivered: "Delivered",
  acknowledged: "Acknowledged",
  accepted: "Customer accepted",
  rejected: "Customer rejected",
  completed: "Completed",
  retry_pending: "Retry pending",
  failed: "Failed",
};

const STAGE_DESCRIPTIONS: Record<PostApprovalStage, string> = {
  awaiting_approval:
    "Explicit scope approval is required before governed recon starts.",
  handoff_pending:
    "Approval recorded locally. Waiting for control plane to confirm the handoff.",
  authorization_pending:
    "Control plane has accepted the scope-approved handoff, but this run is still requested. An operator must authorize/start it before governed recon can proceed.",
  authorized:
    "Control plane has authorized the run. Execution may proceed and may already be underway.",
  delivery_pending:
    "Proof bundle is ready. Delivery has not yet been recorded by control plane.",
  delivered:
    "Proof bundle has been delivered and the delivery fact is durably recorded.",
  acknowledged:
    "Receipt of the delivered proof bundle has been durably acknowledged.",
  accepted:
    "The customer has accepted the delivered proof package. This is a terminal state.",
  rejected:
    "The customer has rejected the delivered proof package. This is a terminal state.",
  completed:
    "Engagement is complete. The closeout fact is durably recorded.",
  retry_pending:
    "An operator has requested a retry. This is a local intent — it does not by itself mean delivery has succeeded. Recovery will be observed from control plane.",
  failed:
    "Lifecycle is in a non-success state. See details below.",
};

const STAGE_TONE: Record<PostApprovalStage, string> = {
  awaiting_approval: "border-zinc-700 bg-zinc-900 text-zinc-300",
  handoff_pending: "border-zinc-700 bg-zinc-900 text-zinc-300",
  authorization_pending: "border-amber-900/60 bg-amber-950/30 text-amber-200",
  authorized: "border-blue-900/60 bg-blue-950/20 text-blue-200",
  delivery_pending: "border-blue-900/60 bg-blue-950/20 text-blue-200",
  delivered: "border-emerald-900 bg-emerald-950/30 text-emerald-200",
  acknowledged: "border-emerald-900 bg-emerald-950/30 text-emerald-200",
  accepted: "border-emerald-700 bg-emerald-900/40 text-emerald-100",
  rejected: "border-orange-900/60 bg-orange-950/30 text-orange-200",
  completed: "border-emerald-700 bg-emerald-900/40 text-emerald-100",
  retry_pending: "border-amber-900/60 bg-amber-950/30 text-amber-200",
  failed: "border-red-900/60 bg-red-950/30 text-red-200",
};

const STAGE_ORDER: PostApprovalStage[] = [
  "awaiting_approval",
  "handoff_pending",
  "authorization_pending",
  "authorized",
  "delivery_pending",
  "delivered",
  "acknowledged",
  "accepted",
  "rejected",
  "completed",
];

function StagePill({ stage, current }: { stage: PostApprovalStage; current: PostApprovalStage }) {
  if (current === "failed" || current === "retry_pending") {
    const isCurrent = stage === current;
    const tone =
      current === "retry_pending"
        ? "bg-amber-900/40 text-amber-200"
        : "bg-red-900/40 text-red-200";
    return (
      <span
        className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
          isCurrent ? tone : "bg-zinc-900 text-zinc-600"
        }`}
      >
        {STAGE_LABELS[stage]}
      </span>
    );
  }
  const currentIndex = STAGE_ORDER.indexOf(current);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const reached = stageIndex >= 0 && stageIndex <= currentIndex;
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
        reached
          ? stageIndex === currentIndex
            ? "bg-emerald-900/40 text-emerald-200"
            : "bg-emerald-950/30 text-emerald-300/80"
          : "bg-zinc-900 text-zinc-600"
      }`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function PostApprovalLifecycle({
  view,
  retryActionEnabled = false,
  authorizeActionEnabled = false,
}: Props) {
  const { stage, local, authoritative, failureReason } = view;
  const retryRequest = "retryRequest" in view ? view.retryRequest : null;
  const showRetryAction =
    retryActionEnabled &&
    Boolean(local.controlPlaneRunId) &&
    (stage === "failed" || stage === "retry_pending");
  const showAuthorizeAction =
    authorizeActionEnabled &&
    Boolean(local.controlPlaneRunId) &&
    authoritative?.controlPlaneState === "requested";

  return (
    <section
      data-testid="post-approval-lifecycle"
      data-stage={stage}
      className="space-y-4"
    >
      {/* Stage progression strip */}
      <div className="flex flex-wrap gap-1.5">
        {STAGE_ORDER.filter((s) => s !== "awaiting_approval").map((s) => (
          <StagePill key={s} stage={s} current={stage} />
        ))}
        {stage === "retry_pending" ? (
          <StagePill stage="retry_pending" current={stage} />
        ) : null}
        {stage === "failed" ? <StagePill stage="failed" current={stage} /> : null}
      </div>

      {/* Current stage banner */}
      <div className={`rounded border px-4 py-3 ${STAGE_TONE[stage]}`}>
        <div className="text-xs font-mono uppercase tracking-wider opacity-70">
          {STAGE_LABELS[stage]}
        </div>
        <div className="mt-1 text-sm">{STAGE_DESCRIPTIONS[stage]}</div>
        {failureReason ? (
          <div className="mt-2 text-xs font-mono opacity-80">{failureReason}</div>
        ) : null}
      </div>

      {/* Local handoff metadata — clearly labeled as local */}
      <div className="rounded border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          Local handoff metadata · web only
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
          <dt className="text-zinc-500">Approved</dt>
          <dd>{local.approved ? "yes" : "no"}</dd>
          <dt className="text-zinc-500">Approved at</dt>
          <dd className="font-mono">{local.approvedAt ?? "—"}</dd>
          <dt className="text-zinc-500">Control-plane run id</dt>
          <dd className="font-mono">{local.controlPlaneRunId ?? "—"}</dd>
        </dl>
      </div>

      {/* Retry request — local intent, never authoritative */}
      {retryRequest ? (
        <div
          data-testid="post-approval-retry-request"
          className={`rounded border p-4 ${
            retryRequest.recovered
              ? "border-emerald-900/60 bg-emerald-950/20"
              : "border-amber-900/60 bg-amber-950/20"
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Operator retry request · web only
          </div>
          <div className="mt-1 text-sm">
            {retryRequest.recovered
              ? "A retry was previously requested. Control plane has since recorded a delivery — recovery is observed authoritatively."
              : "A retry has been requested. This intent is local and does NOT mark delivery as successful. Recovery will be observed when control plane records a new delivered_at."}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-300">
            <dt className="text-zinc-500">Requested at</dt>
            <dd className="font-mono">{retryRequest.requestedAt}</dd>
            <dt className="text-zinc-500">Requested by</dt>
            <dd className="font-mono break-all">{retryRequest.requestedBy}</dd>
            <dt className="text-zinc-500">Reason</dt>
            <dd className="font-mono">{retryRequest.reason}</dd>
            <dt className="text-zinc-500">Recovered</dt>
            <dd>{retryRequest.recovered ? "yes" : "no — still pending"}</dd>
          </dl>
        </div>
      ) : null}

      {/* Operator retry action — bounded; only on admin surface in failed/retry_pending */}
      {showRetryAction ? (
        <form
          method="POST"
          action={`/api/admin/lifecycle/${local.controlPlaneRunId}/retry-request`}
          className="rounded border border-amber-900/60 bg-amber-950/10 p-4 space-y-2"
          data-testid="post-approval-retry-form"
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
            Request retry · operator only · bounded to one outstanding
          </div>
          <textarea
            name="reason"
            required
            maxLength={500}
            placeholder="Why is a retry being requested?"
            className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
            rows={2}
          />
          <button
            type="submit"
            className="rounded border border-amber-700 bg-amber-900/40 px-3 py-1 text-xs font-mono text-amber-100"
          >
            Request retry
          </button>
          <div className="text-[10px] text-zinc-500">
            Requesting a retry records intent only. It does not mark this run as delivered. Successful recovery will appear when control plane records a new delivered_at.
          </div>
        </form>
      ) : null}

      {showAuthorizeAction ? (
        <div
          data-testid="authorize-run-panel"
          className="rounded border border-amber-900/60 bg-amber-950/10 p-4 space-y-2"
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
            Authorize / start · operator only
          </div>
          <div className="text-sm text-amber-100">
            This run has been handed off successfully, but control plane still
            reports <span className="font-mono">requested</span>. Authorize it
            to advance the run to <span className="font-mono">authorized</span>.
          </div>
          <AdminAuthorizeRunAction runId={local.controlPlaneRunId!} />
          <div className="text-[10px] text-zinc-500">
            Handoff accepted is not the same as execution started. The
            authoritative run state must move from requested to authorized.
          </div>
        </div>
      ) : null}

      {/* Authoritative downstream lifecycle — clearly labeled as control plane */}
      {authoritative ? (
        <div className="rounded border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Authoritative downstream lifecycle · control plane
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
            <dt className="text-zinc-500">Run state</dt>
            <dd className="font-mono">{authoritative.controlPlaneState}</dd>
            <dt className="text-zinc-500">Delivered</dt>
            <dd>{authoritative.delivered ? "yes" : "no"}</dd>
            <dt className="text-zinc-500">Acknowledged</dt>
            <dd>{authoritative.acknowledged ? "yes" : "no"}</dd>
            <dt className="text-zinc-500">Completed</dt>
            <dd>{authoritative.completed ? "yes" : "no"}</dd>
            {authoritative.delivery ? (
              <>
                <dt className="text-zinc-500">Recipient</dt>
                <dd className="font-mono break-all">{authoritative.delivery.recipient}</dd>
                <dt className="text-zinc-500">Channel</dt>
                <dd className="font-mono">{authoritative.delivery.channel}</dd>
                <dt className="text-zinc-500">Delivered at</dt>
                <dd className="font-mono">{authoritative.delivery.delivered_at}</dd>
                <dt className="text-zinc-500">Bundle id</dt>
                <dd className="font-mono break-all">{authoritative.delivery.bundle_id}</dd>
                <dt className="text-zinc-500">Artifact hash</dt>
                <dd className="font-mono break-all">{authoritative.delivery.artifact_hash}</dd>
                {authoritative.delivery.acknowledged_at ? (
                  <>
                    <dt className="text-zinc-500">Acknowledged at</dt>
                    <dd className="font-mono">{authoritative.delivery.acknowledged_at}</dd>
                    <dt className="text-zinc-500">Acknowledged by</dt>
                    <dd className="font-mono">{authoritative.delivery.acknowledged_by ?? "—"}</dd>
                  </>
                ) : null}
              </>
            ) : null}
            {authoritative.completion ? (
              <>
                <dt className="text-zinc-500">Completed at</dt>
                <dd className="font-mono">{authoritative.completion.completed_at}</dd>
                <dt className="text-zinc-500">Completion basis</dt>
                <dd className="font-mono">{authoritative.completion.completion_basis}</dd>
              </>
            ) : null}
            {authoritative.customerAcceptanceDisposition ? (
              <>
                <dt
                  data-testid="customer-acceptance-disposition-label"
                  className="text-zinc-500"
                >
                  Customer disposition
                </dt>
                <dd
                  data-testid="customer-acceptance-disposition"
                  data-disposition={authoritative.customerAcceptanceDisposition}
                  className="font-mono"
                >
                  {authoritative.customerAcceptanceDisposition}
                </dd>
                {authoritative.customerAcceptanceAt ? (
                  <>
                    <dt className="text-zinc-500">Disposition at</dt>
                    <dd className="font-mono">{authoritative.customerAcceptanceAt}</dd>
                  </>
                ) : null}
              </>
            ) : null}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
