"use client";

/**
 * WEB-004: explicit operator reject and request-clarification controls.
 *
 * These actions stop operators from misusing the reply / reconcile flows
 * for outcomes that should be a deny or a clarification request.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "./admin.module.css";

interface Props {
  intakeId: string;
  alreadyRejected: boolean;
}

type Mode = "reject" | "request_clarification" | null;

export function AdminOperatorActionsForm(props: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (props.alreadyRejected) {
    return (
      <div
        data-testid="operator-action-state"
        data-kind="reject"
        className={styles.queueWarning}
      >
        Intake has been rejected by an operator. Approval is blocked.
      </div>
    );
  }

  async function submit() {
    setError("");
    if (!mode) return;
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    if (mode === "request_clarification" && !question.trim()) {
      setError("A clarification question is required.");
      return;
    }
    const path =
      mode === "reject"
        ? "/api/admin/intake/reject"
        : "/api/admin/intake/request-clarification";
    const body: Record<string, string> = {
      intakeId: props.intakeId,
      reason: reason.trim(),
    };
    if (mode === "request_clarification") {
      body.clarificationQuestion = question.trim();
    }
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Action failed.");
      return;
    }
    setMode(null);
    setReason("");
    setQuestion("");
    startTransition(() => router.refresh());
  }

  return (
    <div className={styles.queueActionPanel} data-testid="operator-actions-form">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={styles.rowAction}
          onClick={() => {
            setError("");
            setMode((current) => (current === "reject" ? null : "reject"));
          }}
        >
          Reject intake
        </button>
        <button
          type="button"
          className={styles.rowAction}
          onClick={() => {
            setError("");
            setMode((current) =>
              current === "request_clarification" ? null : "request_clarification",
            );
          }}
        >
          Request clarification
        </button>
      </div>

      {mode ? (
        <div className="mt-2 space-y-2 rounded border border-zinc-800 bg-black/30 p-2 text-xs">
          <div className="font-mono uppercase tracking-wider text-zinc-400">
            {mode}
          </div>
          {mode === "request_clarification" ? (
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Question for the claimant"
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
            />
          ) : null}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Reason"
            className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
          />
          {error ? <div className="text-red-300">{error}</div> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={isPending}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200"
            >
              Submit {mode === "reject" ? "rejection" : "clarification request"}
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
          <div className="text-[10px] text-zinc-500">
            {mode === "reject"
              ? "Reject is terminal. Writes the existing rejected admission state and approval_denied issuance state."
              : "Request clarification is non-terminal. Intake state is unchanged. Approval is not blocked."}
          </div>
        </div>
      ) : null}
    </div>
  );
}
