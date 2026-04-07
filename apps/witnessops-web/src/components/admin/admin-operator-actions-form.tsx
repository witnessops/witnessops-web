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
  /**
   * WEB-006: true only when the row is in a pre-approval intake state
   * (submitted / verification_sent / verified / admitted) where reject
   * and request_clarification are server-side allowed. False on
   * responded / replayed / expired and any other post-engagement or
   * terminal state. When false the form renders nothing — the operator
   * has no intake-stage action vocabulary on this row.
   */
  applicable: boolean;
  /**
   * WEB-006: true when an operator clarification request is already
   * recorded against this intake. Used to disable the "Request
   * clarification" button (still rendered, but inert) so operators
   * cannot stack multiple pending requests; reject remains available.
   */
  pendingClarification: boolean;
  /**
   * WEB-010: true when a claimant terminal action (retract or
   * disagree) is also blocking approval on this intake. The operator
   * affordances remain available — operators can still take their
   * own actions — but a footer line is rendered so the operator sees
   * the co-existing block before clicking rescind, and does not
   * incorrectly believe rescinding alone will unblock approval.
   */
  claimantActionBlocking?: boolean;
}

type Mode = "reject" | "request_clarification" | null;

/**
 * WEB-005: operator-side rescind affordance shown beneath the
 * "intake has been rejected" warning. POSTs to
 * `/api/admin/intake/rescind-rejection` under the existing admin session.
 *
 * Collapsed by default. The rescind reads the original
 * intake.rejected_by_operator ledger event server-side and fails closed
 * if the event or its previous_state is missing — operators are not
 * shielded from that failure here, the server returns 500 and the
 * affordance surfaces the message.
 */
function OperatorRescindAffordance({ intakeId }: { intakeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submit() {
    setError("");
    if (!reason.trim()) {
      setError("A reason is required to rescind.");
      return;
    }
    const response = await fetch("/api/admin/intake/rescind-rejection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId, reason: reason.trim() }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Rescind failed.");
      return;
    }
    setOpen(false);
    setReason("");
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <div className="mt-2" data-testid="operator-rescind-affordance">
        <button
          type="button"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-mono text-zinc-200"
        >
          Rescind rejection
        </button>
        <div className="mt-1 text-[10px] text-zinc-500">
          Reverts intake.state to its prior value (read from the original
          ledger event), clears operatorAction, and restores
          approvalStatus to pending. The original rejection event remains
          in the audit ledger.
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-2 space-y-2 rounded border border-zinc-800 bg-black/30 p-2 text-xs"
      data-testid="operator-rescind-form"
    >
      <div className="font-mono uppercase tracking-wider text-zinc-400">
        rescind
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Reason for rescinding"
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
          Submit rescind
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="rounded border border-zinc-800 px-3 py-1 text-zinc-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

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
        {props.claimantActionBlocking ? (
          <div
            className="mt-1 text-[10px] text-amber-300"
            data-testid="coexisting-claimant-action-note"
          >
            A claimant action is also blocking approval. Rescinding the
            rejection will not unblock by itself — the claimant must
            also reopen their action.
          </div>
        ) : null}
        <OperatorRescindAffordance intakeId={props.intakeId} />
      </div>
    );
  }

  // WEB-006: render nothing on rows where the server-side gate would
  // refuse the action. Hiding the affordances keeps the queue from
  // suggesting that an operator can reject or clarify against an
  // already-engaged or terminal intake — the previous behavior would
  // silently overwrite responded state. The clarification "Waiting on
  // claimant" banner in admin-admission-queue still renders separately
  // when relevant.
  if (!props.applicable) {
    return null;
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
      {props.claimantActionBlocking ? (
        <div
          className="mb-2 rounded border border-amber-900/60 bg-amber-950/20 p-2 text-[11px] text-amber-200"
          data-testid="coexisting-claimant-action-note"
        >
          A claimant terminal action (retract or disagree) is currently
          blocking approval. Operator actions remain available, but
          rejecting or rescinding alone will not change the
          claimant-side block — only the claimant can clear it.
        </div>
      ) : null}
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
          disabled={props.pendingClarification}
          aria-disabled={props.pendingClarification}
          title={
            props.pendingClarification
              ? "A clarification request is already pending. Wait for the claimant to act."
              : undefined
          }
          onClick={() => {
            if (props.pendingClarification) return;
            setError("");
            setMode((current) =>
              current === "request_clarification" ? null : "request_clarification",
            );
          }}
        >
          Request clarification
        </button>
      </div>
      {props.pendingClarification ? (
        <div className="mt-1 text-[10px] text-zinc-500" data-testid="clarification-pending-note">
          A clarification request is already pending. Wait for the claimant
          to act before recording another.
        </div>
      ) : null}

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
