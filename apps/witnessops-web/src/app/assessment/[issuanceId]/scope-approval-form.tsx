"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ApprovalStatus = "pending" | "approved" | "approval_denied" | null;

/** V1 passive-only methods from the governed-recon contract. */
const PASSIVE_METHODS = [
  "DNS resolution",
  "Certificate observation",
  "Subdomain discovery",
  "HTTP fingerprint",
  "Email posture",
  "Service banner observation",
] as const;

interface ScopeApprovalFormProps {
  issuanceId: string;
  email: string;
  scopeDraft: string | null;
  approvalStatus: ApprovalStatus;
  approvedAt: string | null;
  approverEmail: string | null;
  approverName: string | null;
  approvalNote: string | null;
}

export function ScopeApprovalForm(props: ScopeApprovalFormProps) {
  const router = useRouter();
  const [note, setNote] = useState("Approved for passive-only recon.");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isApproved = props.approvalStatus === "approved";
  const scopeText = useMemo(
    () => props.scopeDraft?.trim() || "No scope draft captured.",
    [props.scopeDraft],
  );

  async function submitApproval() {
    setError("");

    const response = await fetch(
      `/api/assessment/${encodeURIComponent(props.issuanceId)}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: props.email,
          approvalNote: note.trim() || undefined,
        }),
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to approve the scope.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  if (isApproved) {
    return (
      <div className="rounded border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">
        <div className="flex items-center gap-2">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">
            Scope approved
          </div>
          <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
            Passive-only
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PASSIVE_METHODS.map((method) => (
            <span
              key={method}
              className="rounded border border-emerald-900/60 bg-black/20 px-2 py-0.5 text-[10px] text-emerald-200/80"
            >
              {method}
            </span>
          ))}
        </div>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-emerald-50">
          {scopeText}
        </div>
        <div className="mt-3 text-xs text-emerald-200/80">
          Approved at{" "}
          <span className="font-mono">
            {props.approvedAt ?? "not recorded"}
          </span>
          {props.approverEmail ? (
            <>
              {" "}
              by <span className="font-mono">{props.approverEmail}</span>
            </>
          ) : null}
          {props.approverName ? (
            <>
              {" "}
              ({props.approverName})
            </>
          ) : null}
        </div>
        {props.approvalNote ? (
          <div className="mt-3 rounded border border-emerald-900/80 bg-black/20 p-3 text-xs leading-6 text-emerald-50/90">
            {props.approvalNote}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded border border-zinc-800 bg-zinc-950/80 p-4 text-sm text-zinc-300">
      <div className="flex items-center gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Scope approval required
        </div>
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Passive-only
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PASSIVE_METHODS.map((method) => (
          <span
            key={method}
            className="rounded border border-zinc-800 bg-black/20 px-2 py-0.5 text-[10px] text-zinc-400"
          >
            {method}
          </span>
        ))}
      </div>
      <div className="mt-3 whitespace-pre-wrap rounded border border-zinc-800 bg-black/20 p-3 text-sm leading-7 text-zinc-100">
        {scopeText}
      </div>
      <div className="mt-3 text-xs leading-6 text-zinc-500">
        This approval authorizes passive-only reconnaissance methods listed
        above. It does not widen scope or enable active scanning.
      </div>
      <textarea
        className="mt-3 w-full rounded border border-zinc-800 bg-black/40 px-3 py-2 font-mono text-xs leading-6 text-zinc-100 outline-none transition-colors focus:border-emerald-500"
        rows={4}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Approval note"
        spellCheck={false}
      />
      {error ? (
        <div className="mt-3 text-xs leading-6 text-red-400">{error}</div>
      ) : null}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 transition-colors hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void submitApproval()}
          disabled={isPending}
        >
          {isPending ? "Approving..." : "Approve scope and start recon"}
        </button>
      </div>
    </div>
  );
}
