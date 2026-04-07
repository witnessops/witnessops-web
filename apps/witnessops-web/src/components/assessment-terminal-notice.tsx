import type { PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";

interface Props {
  view: PostApprovalLifecycleView;
}

export function AssessmentTerminalNotice({ view }: Props) {
  if (view.stage !== "accepted" && view.stage !== "rejected") {
    return null;
  }

  return (
    <div
      data-testid="assessment-terminal-notice"
      data-disposition={view.stage}
      className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-400"
    >
      {view.stage === "accepted" ? (
        <>
          This assessment run is <span className="text-zinc-200">closed</span>.
          The delivered proof package has been accepted. No further action is
          required on this page. The record is append-only and cannot be
          modified.
        </>
      ) : (
        <>
          This assessment run is <span className="text-zinc-200">closed</span>.
          The delivered proof package has been rejected. The operator has
          visibility into this outcome. The record is append-only and cannot be
          modified.
        </>
      )}
      {view.authoritative.customerAcceptanceAt ? (
        <div className="mt-2 text-xs font-mono text-zinc-500">
          Recorded at {view.authoritative.customerAcceptanceAt}
        </div>
      ) : null}
    </div>
  );
}
