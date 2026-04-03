import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIssuanceById } from "@/lib/server/token-store";
import { getAssessmentStatus } from "@/lib/server/assessment-client";
import { AssessmentPoller } from "./assessment-poller";

export const metadata: Metadata = {
  title: "Assessment Results",
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
            WitnessOps — Governed Exposure
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Assessment: <span className="text-emerald-400 font-mono">{domain}</span>
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

        {/* Assessment block — client-side polling */}
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-3">
            Governed Recon Results
          </div>
          <AssessmentPoller
            issuanceId={issuanceId}
            email={email}
            initialStatus={initialStatus}
            initialRun={liveRun}
          />
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
