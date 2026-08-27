"use client";

import { useState } from "react";

import {
  askWitnessOpsAnswerText,
  askWitnessOpsModeLabel,
  fetchAskWitnessOps,
  type AskWitnessOpsUiAnswer,
} from "./ask-witnessops-response";
import { AskWitnessOpsReceiptMeta } from "./ask-witnessops-receipt-meta";
import { AskWitnessOpsRouteCta } from "./ask-witnessops-route-cta";
import { AskWitnessOpsSourceLinks } from "./ask-witnessops-source-links";

export function DocsAssistantInline() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskWitnessOpsUiAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      setResponse(await fetchAskWitnessOps(trimmed));
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 border-t border-surface-border pt-8">
      <p
        className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        ASK WITNESSOPS
      </p>
      <p className="mt-1 text-sm font-medium text-text-primary">
        Bounded proof guide
      </p>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        Ask a non-secret question about proof packets, receipts, verification
        paths, catalog packages, or safe first contact.
      </p>
      <p className="mb-3 mt-2 text-xs leading-relaxed text-text-muted">
        Do not paste secrets, logs, credentials, private keys, MFA codes,
        screenshots, customer evidence, or raw exports.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a non-secret question..."
          className="min-w-0 flex-1 rounded border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="shrink-0 rounded border border-surface-border bg-surface-bg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
        >
          {loading ? "…" : "Ask"}
        </button>
      </form>

      <p className="mt-3 text-xs leading-relaxed text-text-muted">
        Answers are based on public WitnessOps material. For private systems,
        request a fit check.
      </p>

      {error && (
        <div className="mt-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {response && (
        <div className="mt-4 border-l-2 border-surface-border pl-4">
          <p
            className="mb-2 text-xs uppercase tracking-[0.08em] text-text-muted"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {askWitnessOpsModeLabel(response)}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
            {askWitnessOpsAnswerText(response)}
          </p>

          <AskWitnessOpsRouteCta answer={response} />
          <AskWitnessOpsSourceLinks answer={response} />
          <AskWitnessOpsReceiptMeta answer={response} />
        </div>
      )}
    </div>
  );
}
