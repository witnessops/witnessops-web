import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIntakeById, getIssuanceById } from "@/lib/server/token-store";
import { getAssessmentStatus } from "@/lib/server/assessment-client";
import { buildPostApprovalLifecycle } from "@/lib/server/post-approval-lifecycle";
import { PostApprovalLifecycle } from "@/components/post-approval-lifecycle";
import { AssessmentTerminalNotice } from "@/components/assessment-terminal-notice";
import { AssessmentPoller } from "./assessment-poller";
import { ScopeApprovalForm } from "./scope-approval-form";
import { ClaimantActionsForm } from "./claimant-actions-form";

export const metadata: Metadata = {
  title: "Governed Recon",
  robots: { index: false, follow: false },
};

// Disable caching — results change as the assessment progresses
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ issuanceId: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function AssessmentPage({ params, searchParams }: Props) {
  const { issuanceId } = await params;
  const { email: rawEmail } = await searchParams;
  const email = rawEmail?.toLowerCase().trim() ?? "";

  const record = await getIssuanceById(issuanceId);
  if (!record || record.email !== email) {
    notFound();
  }

  const intake = record.intakeId ? await getIntakeById(record.intakeId) : null;
  const approvalStatus = record.approvalStatus ?? "pending";

  // Extract domain for display
  const domain = record.email.split("@")[1] ?? "";

  // WEB-001: when the issuance has been handed off to control-plane,
  // build the post-approval lifecycle view from authoritative truth.
  // Local handoff metadata stays clearly separated in the rendered view.
  const postApprovalView = record.controlPlaneRunId
    ? await buildPostApprovalLifecycle(record)
    : null;
  const assessmentTerminalView =
    postApprovalView?.stage === "accepted" || postApprovalView?.stage === "rejected"
      ? postApprovalView
      : null;

  // Fetch live status for completed runs (so the initial render is rich)
  let initialStatus = record.assessmentStatus ?? "unavailable";
  let liveRun = null;
  let statusIsStale = false;
  if (record.assessmentRunId) {
    try {
      const live = await getAssessmentStatus(record.assessmentRunId);
      if (live) {
        liveRun = live;
        initialStatus = live.status;
      }
    } catch {
      // Live fetch failed — use stored status but mark as stale
      statusIsStale = true;
    }
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div>
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">
            WitnessOps — Governed Recon
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Governed Recon: <span className="text-emerald-400 font-mono">{domain}</span>
          </h1>
          <div className="mt-1 text-sm text-zinc-500 font-mono">
            Issuance: {issuanceId}
          </div>
        </div>

        {/* Verification badge */}
        <div className="rounded border border-emerald-900 bg-emerald-950/30 px-4 py-3 flex items-center gap-3">
          <span className="text-emerald-400 text-lg">✓</span>
          <div>
            <div className="text-sm text-emerald-300 font-medium">Mailbox verified</div>
            <div className="text-xs text-zinc-500 font-mono">{record.email}</div>
          </div>
          <div className="ml-auto text-xs text-zinc-600 font-mono">
            {record.verifiedAt?.replace("T", " ").replace("Z", " UTC")}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-3">
            Scope Approval
          </div>
          {intake?.operatorAction?.kind === "reject" || record.approvalStatus === "approval_denied" ? (
            <div
              data-testid="operator-action-state"
              data-kind="reject"
              className="mb-3 rounded border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-100"
            >
              <div className="text-xs font-mono uppercase tracking-wider text-red-300">
                Intake rejected by operator
              </div>
              <div className="mt-2">
                An operator has rejected this engagement. Scope approval is
                blocked.
              </div>
              {intake?.operatorAction?.kind === "reject" ? (
                <>
                  <div className="mt-2 text-xs text-red-200/80">
                    Recorded at <span className="font-mono">{intake.operatorAction.recordedAt}</span>
                  </div>
                  {intake.operatorAction.reason ? (
                    <div className="mt-2 rounded border border-red-900/80 bg-black/30 p-2 text-xs text-red-100/90">
                      {intake.operatorAction.reason}
                    </div>
                  ) : null}
                </>
              ) : null}
              {/*
                WEB-010: when an operator reject AND a terminal claimant
                action are both in force, surface the co-existing claimant
                block on this banner so the operator's rescind path does
                not appear to be the only thing blocking approval.
              */}
              {record.claimantAction?.kind === "retract" ||
              record.claimantAction?.kind === "disagree" ? (
                <div
                  data-testid="coexisting-claimant-action-note"
                  className="mt-3 rounded border border-red-900/60 bg-black/30 p-2 text-xs text-red-100/90"
                >
                  A claimant action ({record.claimantAction.kind}) is also
                  recorded on this engagement. Rescinding the operator
                  rejection alone will not unblock approval — the claimant
                  must also reopen their action.
                </div>
              ) : null}
            </div>
          ) : intake?.operatorAction?.kind === "request_clarification" ? (
            <div
              data-testid="operator-action-state"
              data-kind="request_clarification"
              className="mb-3 rounded border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-100"
            >
              <div className="text-xs font-mono uppercase tracking-wider text-amber-300">
                Operator requested clarification
              </div>
              <div className="mt-2">
                Please review the operator&apos;s question below and update your
                submission via &ldquo;Amend scope&rdquo; before approving.
              </div>
              {intake.operatorAction.clarificationQuestion ? (
                <div className="mt-2 rounded border border-amber-900/80 bg-black/30 p-2 font-mono text-xs text-amber-50">
                  {intake.operatorAction.clarificationQuestion}
                </div>
              ) : null}
              {intake.operatorAction.reason ? (
                <div className="mt-2 text-xs text-amber-200/80">
                  Reason: {intake.operatorAction.reason}
                </div>
              ) : null}
            </div>
          ) : null}

          <ScopeApprovalForm
            issuanceId={issuanceId}
            email={email}
            scopeDraft={intake?.submission.scope ?? null}
            approvalStatus={approvalStatus}
            approvedAt={record.approvalAt ?? null}
            approverEmail={record.approverEmail ?? null}
            approverName={record.approverName ?? null}
            approvalNote={record.approvalNote ?? null}
          />
          {approvalStatus !== "approved" ? (
            <div className="mt-4">
              <ClaimantActionsForm
                issuanceId={issuanceId}
                email={email}
                scopeDraft={intake?.submission.scope ?? null}
                claimantAction={record.claimantAction ?? null}
                operatorRejectInForce={
                  intake?.operatorAction?.kind === "reject" ||
                  record.approvalStatus === "approval_denied"
                }
              />
            </div>
          ) : null}
        </div>

        {/* Authorization summary — bridges scope approval to results */}
        {approvalStatus === "approved" ? (
          <div className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-2">
              Authorization
            </div>
            <div className="text-sm text-zinc-200">
              Passive-only recon authorized for{" "}
              <span className="font-mono text-emerald-400">{domain}</span>
            </div>
          </div>
        ) : null}

        {/* Assessment block — client-side polling */}
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-3">
            Governed Recon Results
          </div>
          {postApprovalView ? (
            <>
              <PostApprovalLifecycle view={postApprovalView} />
              {assessmentTerminalView ? (
                <AssessmentTerminalNotice view={assessmentTerminalView} />
              ) : null}
            </>
          ) : approvalStatus === "approved" && record.assessmentRunId ? (
            <>
              {statusIsStale ? (
                <div className="mb-3 rounded border border-yellow-900/60 bg-yellow-950/20 px-3 py-2 text-xs text-yellow-300/80">
                  Live status could not be fetched. Showing last known state.
                </div>
              ) : null}
              <AssessmentPoller
                issuanceId={issuanceId}
                email={email}
                initialStatus={initialStatus}
                initialRun={liveRun}
              />
            </>
          ) : approvalStatus === "approved" && record.assessmentStatus === "unavailable" ? (
            <div className="rounded border border-red-900/40 bg-zinc-900 p-4 text-sm text-zinc-400">
              Scope approval is recorded, but the assessment server was not
              reachable when recon was triggered.
              {record.assessmentError ? (
                <div className="mt-2 text-xs text-zinc-500 font-mono">{record.assessmentError}</div>
              ) : null}
            </div>
          ) : approvalStatus === "approved" ? (
            <div className="rounded border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
              Scope approval is recorded, but recon infrastructure is not yet
              attached for this issuance.
            </div>
          ) : (
            <div className="rounded border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
              Explicit scope approval is required before governed recon starts.
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="text-xs text-zinc-700 border-t border-zinc-900 pt-4">
          Results are sealed with DSSE Ed25519 envelopes and stored as append-only proof records.
          This page is session-private. Do not share the URL.
        </div>
      </div>
    </main>
  );
}
