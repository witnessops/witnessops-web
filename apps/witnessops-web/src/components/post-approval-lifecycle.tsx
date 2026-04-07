/**
 * Post-approval lifecycle renderer (WEB-001).
 *
 * Read-only server component. Renders the discriminated lifecycle view
 * built by `buildPostApprovalLifecycle`. Visually separates LOCAL handoff
 * metadata from AUTHORITATIVE downstream lifecycle so users can see which
 * facts came from where.
 */

import type { PostApprovalLifecycleView, PostApprovalStage } from "@/lib/server/post-approval-lifecycle";

interface Props {
  view: PostApprovalLifecycleView;
}

const STAGE_LABELS: Record<PostApprovalStage, string> = {
  awaiting_approval: "Awaiting approval",
  handoff_pending: "Handoff pending",
  handoff_accepted: "Handoff accepted",
  delivery_pending: "Delivery pending",
  delivered: "Delivered",
  acknowledged: "Acknowledged",
  completed: "Completed",
  failed: "Failed",
};

const STAGE_DESCRIPTIONS: Record<PostApprovalStage, string> = {
  awaiting_approval:
    "Explicit scope approval is required before governed recon starts.",
  handoff_pending:
    "Approval recorded locally. Waiting for control plane to confirm the handoff.",
  handoff_accepted:
    "Control plane has accepted the scope-approved handoff. Governed recon is in progress.",
  delivery_pending:
    "Proof bundle is ready. Delivery has not yet been recorded by control plane.",
  delivered:
    "Proof bundle has been delivered and the delivery fact is durably recorded.",
  acknowledged:
    "Receipt of the delivered proof bundle has been durably acknowledged.",
  completed:
    "Engagement is complete. The closeout fact is durably recorded.",
  failed:
    "Lifecycle is in a non-success state. See details below.",
};

const STAGE_TONE: Record<PostApprovalStage, string> = {
  awaiting_approval: "border-zinc-700 bg-zinc-900 text-zinc-300",
  handoff_pending: "border-zinc-700 bg-zinc-900 text-zinc-300",
  handoff_accepted: "border-blue-900/60 bg-blue-950/20 text-blue-200",
  delivery_pending: "border-blue-900/60 bg-blue-950/20 text-blue-200",
  delivered: "border-emerald-900 bg-emerald-950/30 text-emerald-200",
  acknowledged: "border-emerald-900 bg-emerald-950/30 text-emerald-200",
  completed: "border-emerald-700 bg-emerald-900/40 text-emerald-100",
  failed: "border-red-900/60 bg-red-950/30 text-red-200",
};

const STAGE_ORDER: PostApprovalStage[] = [
  "awaiting_approval",
  "handoff_pending",
  "handoff_accepted",
  "delivery_pending",
  "delivered",
  "acknowledged",
  "completed",
];

function StagePill({ stage, current }: { stage: PostApprovalStage; current: PostApprovalStage }) {
  if (current === "failed") {
    const isFailed = stage === "failed";
    return (
      <span
        className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
          isFailed ? "bg-red-900/40 text-red-200" : "bg-zinc-900 text-zinc-600"
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

export function PostApprovalLifecycle({ view }: Props) {
  const { stage, local, authoritative, failureReason } = view;

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
          </dl>
        </div>
      ) : null}
    </section>
  );
}
