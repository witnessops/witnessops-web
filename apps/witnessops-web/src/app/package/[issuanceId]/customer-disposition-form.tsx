"use client";

/**
 * Customer accept/reject control surface (WEB-014).
 *
 * Whole-package disposition only. One optional comment. POSTs to
 * /api/package/[issuanceId]/disposition. On success, refreshes the
 * server component so the rendered disposition reflects control-plane
 * truth.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  issuanceId: string;
  email: string;
}

const MAX_COMMENT_LENGTH = 2000;

export function CustomerDispositionForm({ issuanceId, email }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState<
    null | "accepted" | "rejected"
  >(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(disposition: "accepted" | "rejected") {
    setError(null);
    setSubmitting(disposition);
    try {
      const response = await fetch(
        `/api/package/${encodeURIComponent(issuanceId)}/disposition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            disposition,
            comment: comment.trim() || undefined,
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Submission failed.");
        setSubmitting(null);
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(null);
    }
  }

  const busy = submitting !== null || pending;

  return (
    <section
      data-testid="customer-disposition-form"
      className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-4 space-y-3"
    >
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
        Your decision
      </div>
      <p className="text-sm text-zinc-300">
        Confirm whether you accept or reject this proof package as a whole.
        This decision is recorded once and cannot be changed afterwards.
      </p>

      <label className="block">
        <span className="block text-xs text-zinc-500 font-mono mb-1">
          Optional comment
        </span>
        <textarea
          data-testid="customer-disposition-comment"
          value={comment}
          maxLength={MAX_COMMENT_LENGTH}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          disabled={busy}
          className="w-full rounded border border-zinc-800 bg-black/60 p-2 text-sm text-zinc-100 font-mono"
        />
        <span className="block text-[10px] text-zinc-600 font-mono mt-1">
          {comment.length}/{MAX_COMMENT_LENGTH}
        </span>
      </label>

      {error ? (
        <div
          data-testid="customer-disposition-error"
          className="rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          data-testid="customer-disposition-accept"
          disabled={busy}
          onClick={() => submit("accepted")}
          className="rounded border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-50"
        >
          {submitting === "accepted" ? "Submitting…" : "Accept package"}
        </button>
        <button
          type="button"
          data-testid="customer-disposition-reject"
          disabled={busy}
          onClick={() => submit("rejected")}
          className="rounded border border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-200 hover:bg-red-900/40 disabled:opacity-50"
        >
          {submitting === "rejected" ? "Submitting…" : "Reject package"}
        </button>
      </div>
    </section>
  );
}
