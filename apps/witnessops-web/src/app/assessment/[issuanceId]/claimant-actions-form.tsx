"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ClaimantActionRecord } from "@/lib/server/token-store";

interface Props {
  issuanceId: string;
  email: string;
  scopeDraft: string | null;
  claimantAction: ClaimantActionRecord | null;
}

type Mode = "amend" | "retract" | "disagree" | null;

export function ClaimantActionsForm(props: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const [amendedScope, setAmendedScope] = useState<string>(props.scopeDraft ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const action = props.claimantAction;

  // Terminal states render a banner instead of the form.
  if (action?.kind === "retract") {
    return (
      <div
        data-testid="claimant-action-state"
        data-kind="retract"
        className="rounded border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-100"
      >
        <div className="text-xs font-mono uppercase tracking-wider text-red-300">
          Engagement retracted by claimant
        </div>
        <div className="mt-2">
          The claimant has retracted this engagement before scope approval.
          Approval is blocked until the engagement is re-opened.
        </div>
        <div className="mt-2 text-xs text-red-200/80">
          Recorded at <span className="font-mono">{action.recordedAt}</span>
        </div>
        {action.reason ? (
          <div className="mt-2 rounded border border-red-900/80 bg-black/30 p-2 text-xs text-red-100/90">
            {action.reason}
          </div>
        ) : null}
      </div>
    );
  }

  if (action?.kind === "disagree") {
    return (
      <div
        data-testid="claimant-action-state"
        data-kind="disagree"
        className="rounded border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-100"
      >
        <div className="text-xs font-mono uppercase tracking-wider text-red-300">
          Scope disagreement recorded
        </div>
        <div className="mt-2">
          The claimant has disputed the proposed scope. Approval is blocked
          until the disagreement is cleared.
        </div>
        <div className="mt-2 text-xs text-red-200/80">
          Recorded at <span className="font-mono">{action.recordedAt}</span>
        </div>
        {action.reason ? (
          <div className="mt-2 rounded border border-red-900/80 bg-black/30 p-2 text-xs text-red-100/90">
            {action.reason}
          </div>
        ) : null}
      </div>
    );
  }

  // Amend is non-blocking — surface a banner above the action surface
  // and allow further edits or proceed-to-approval.
  const amendBanner =
    action?.kind === "amend" ? (
      <div
        data-testid="claimant-action-state"
        data-kind="amend"
        className="rounded border border-amber-900/60 bg-amber-950/20 p-3 text-xs text-amber-100"
      >
        <div className="font-mono uppercase tracking-wider text-amber-300">
          Scope amended by claimant
        </div>
        <div className="mt-1">
          The submitted scope was revised on{" "}
          <span className="font-mono">{action.recordedAt}</span>. Approval is
          still possible against the amended scope.
        </div>
        {action.reason ? (
          <div className="mt-1 rounded border border-amber-900/80 bg-black/30 p-2">
            {action.reason}
          </div>
        ) : null}
      </div>
    ) : null;

  async function submit() {
    setError("");
    if (!mode) return;
    if (!reason.trim()) {
      setError("A short reason is required.");
      return;
    }
    if (mode === "amend" && !amendedScope.trim()) {
      setError("Amended scope text is required.");
      return;
    }
    const path =
      mode === "amend"
        ? "amend"
        : mode === "retract"
          ? "retract"
          : "disagree";
    const body: Record<string, string> = {
      email: props.email,
      reason: reason.trim(),
    };
    if (mode === "amend") body.amendedScope = amendedScope.trim();

    const response = await fetch(
      `/api/assessment/${encodeURIComponent(props.issuanceId)}/${path}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Action failed.");
      return;
    }
    setMode(null);
    setReason("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {amendBanner}
      <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
        <div className="font-mono uppercase tracking-wider text-zinc-500">
          Claimant actions before approval
        </div>
        <div className="mt-1 text-zinc-500">
          You can amend the scope, retract the engagement, or record a
          disagreement before approving.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("amend")}
            className="rounded border border-amber-800 bg-amber-950/30 px-3 py-1 text-amber-200"
          >
            Amend scope
          </button>
          <button
            type="button"
            onClick={() => setMode("retract")}
            className="rounded border border-red-900/60 bg-red-950/20 px-3 py-1 text-red-200"
          >
            Retract engagement
          </button>
          <button
            type="button"
            onClick={() => setMode("disagree")}
            className="rounded border border-red-900/60 bg-red-950/20 px-3 py-1 text-red-200"
          >
            Disagree with scope
          </button>
        </div>

        {mode ? (
          <div className="mt-3 space-y-2 rounded border border-zinc-800 bg-black/30 p-3">
            <div className="font-mono uppercase tracking-wider text-zinc-400">
              {mode}
            </div>
            {mode === "amend" ? (
              <textarea
                value={amendedScope}
                onChange={(e) => setAmendedScope(e.target.value)}
                rows={4}
                placeholder="Replacement scope text"
                className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
              />
            ) : null}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Reason"
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
            />
            {error ? (
              <div className="text-red-300">{error}</div>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={isPending}
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200"
              >
                Submit {mode}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setError("");
                }}
                className="rounded border border-zinc-800 px-3 py-1 text-zinc-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
