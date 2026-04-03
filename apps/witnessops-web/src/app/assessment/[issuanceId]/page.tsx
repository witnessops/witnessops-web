import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIntakeById, getIssuanceById } from "@/lib/server/token-store";
import { getAssessmentStatus } from "@/lib/server/assessment-client";
import { AssessmentPoller } from "./assessment-poller";
import { ScopeApprovalForm } from "./scope-approval-form";

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

  // Fetch live status for completed runs (so the initial render is rich)
  let initialStatus = record.assessmentStatus ?? "unavailable";
  let liveRun = null;
  if (record.assessmentRunId) {
    try {
      const live = await getAssessmentStatus(record.assessmentRunId);
      if (live) {
        liveRun = live;
        initialStatus = live.status;
      }
    } catch {
      // Use stored status
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
            <div className="mt-1 text-xs text-zinc-500">
              Approved{" "}
              <span className="font-mono">
                {record.approvalAt?.replace("T", " ").replace("Z", " UTC") ?? "at unknown time"}
              </span>
              {record.approverEmail ? (
                <>
                  {" "}by <span className="font-mono">{record.approverEmail}</span>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Assessment block — client-side polling */}
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-3">
            Governed Recon Results
          </div>
          {approvalStatus === "approved" && record.assessmentRunId ? (
            <AssessmentPoller
              issuanceId={issuanceId}
              email={email}
              initialStatus={initialStatus}
              initialRun={liveRun}
            />
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
