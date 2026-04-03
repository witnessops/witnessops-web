"use client";

import { useEffect, useState } from "react";
import type { AssessmentStatusResult, FindingSummary } from "@/lib/server/assessment-client";

interface AssessmentPollerProps {
  issuanceId: string;
  email: string;
  initialStatus: string;
  initialRun?: AssessmentStatusResult | null;
}

interface PollResponse {
  ok: boolean;
  assessmentStatus: string;
  assessmentRunId: string | null;
  run?: AssessmentStatusResult;
}

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

function severityBadge(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical": return "bg-red-900 text-red-200";
    case "high":     return "bg-orange-900 text-orange-200";
    case "medium":   return "bg-yellow-900 text-yellow-200";
    case "low":      return "bg-blue-900 text-blue-200";
    default:         return "bg-zinc-800 text-zinc-300";
  }
}

function FindingRow({ finding }: { finding: FindingSummary }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
      <span className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ${severityBadge(finding.severity)}`}>
        {finding.severity.toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="text-sm text-zinc-200 truncate">{finding.title}</div>
        <div className="text-xs text-zinc-500">{finding.category}</div>
      </div>
    </div>
  );
}

export function AssessmentPoller({ issuanceId, email, initialStatus, initialRun = null }: AssessmentPollerProps) {
  const [status, setStatus] = useState(initialStatus);
  const [run, setRun] = useState<AssessmentStatusResult | null>(initialRun);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = status === "completed" || status === "failed" || status === "unavailable";

  useEffect(() => {
    if (isTerminal) return;

    let cancelled = false;

    async function poll() {
      try {
        const url = `/api/assessment/${encodeURIComponent(issuanceId)}?email=${encodeURIComponent(email)}`;
        const res = await fetch(url);
        if (!res.ok) {
          setError("Could not fetch assessment status.");
          return;
        }
        const data = (await res.json()) as PollResponse;
        if (!cancelled) {
          setStatus(data.assessmentStatus);
          if (data.run) setRun(data.run);
        }
      } catch {
        if (!cancelled) setError("Network error checking assessment status.");
      }
    }

    const interval = setInterval(poll, 3_000);
    void poll(); // immediate first check
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [issuanceId, email, isTerminal]);

  if (status === "unavailable") {
    return (
      <div className="rounded border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
        Assessment infrastructure is not available. Your mailbox has been verified. Results will be
        delivered when the assessment system is online.
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded border border-red-900 bg-zinc-900 p-4 text-sm text-red-400">
        Assessment encountered an error.{run?.error ? ` ${run.error}` : ""}
      </div>
    );
  }

  if (status === "pending" || status === "running") {
    return (
      <div className="rounded border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400 flex items-center gap-3">
        <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span>
          {status === "pending"
            ? "Assessment queued — governed recon starting…"
            : "Running governed recon — collecting DNS, CT, TLS, email auth…"}
        </span>
        {error && <span className="text-red-400 ml-2">{error}</span>}
      </div>
    );
  }

  if (status === "completed" && run) {
    const sorted = [...(run.findings_summary ?? [])].sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity.toLowerCase()) -
        SEVERITY_ORDER.indexOf(b.severity.toLowerCase()),
    );

    return (
      <div className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Findings", value: run.findings_count ?? 0 },
            { label: "Surfaces", value: run.checks_count ?? 0 },
            { label: "Envelopes", value: run.envelopes_count ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="rounded border border-zinc-800 bg-zinc-900 p-3 text-center">
              <div className="text-xl font-mono text-emerald-400">{value}</div>
              <div className="text-xs text-zinc-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Signing proof */}
        <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 flex items-center gap-2 text-xs text-zinc-500">
          <span className="text-emerald-500">✓</span>
          <span>
            Signed with{" "}
            <span className="font-mono text-zinc-300">
              {run.signed_with ?? "unknown"}
            </span>{" "}
            · DSSE Ed25519 envelopes
          </span>
          {run.completed_at && (
            <span className="ml-auto font-mono">{run.completed_at.replace("T", " ").replace("Z", " UTC")}</span>
          )}
        </div>

        {/* Findings list */}
        {sorted.length > 0 ? (
          <div className="rounded border border-zinc-800 bg-zinc-900 px-4 py-2">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Findings</div>
            {sorted.map((f, i) => (
              <FindingRow key={i} finding={f} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
            No findings in this assessment run.
          </div>
        )}
      </div>
    );
  }

  return null;
}
