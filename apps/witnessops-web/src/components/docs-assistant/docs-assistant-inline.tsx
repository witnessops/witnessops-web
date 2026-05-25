"use client";

import { useState } from "react";

import { DocsAssistantBoundaryMeta } from "./docs-assistant-boundary-meta";
import { DocsAssistantSourceLinks } from "./docs-assistant-source-links";
import {
  answerText,
  docsAssistantRequestErrorDetails,
  type DocsAssistantUiAnswer,
} from "./docs-assistant-response";

interface Props {
  pageContext?: string;
}

export function DocsAssistantInline({ pageContext }: Props) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<DocsAssistantUiAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAnswer, setErrorAnswer] =
    useState<DocsAssistantUiAnswer | null>(null);

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setErrorAnswer(null);
    setResponse(null);

    const query = pageContext ? `${trimmed} (page: ${pageContext})` : trimmed;

    try {
      const res = await fetch("/api/docs-assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      if (!res.ok) {
        const requestError = await docsAssistantRequestErrorDetails(res);
        setError(requestError.message);
        setErrorAnswer(requestError.answer ?? null);
        setQuestion("");
        return;
      }
      setResponse((await res.json()) as DocsAssistantUiAnswer);
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
        className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Ask about this page
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
          placeholder="Ask about this page…"
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

      {error && (
        <div className="mt-3">
          <p className="text-sm text-red-400">{error}</p>
          <DocsAssistantBoundaryMeta answer={errorAnswer ?? undefined} />
        </div>
      )}

      {!error && !response && !loading && (
        <p className="mt-3 text-xs text-text-muted">
          Ask a question and the assistant will search the WitnessOps docs.
        </p>
      )}

      {response && (
        <div className="mt-4 border-l-2 border-surface-border pl-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
            {answerText(response)}
          </p>

          <DocsAssistantSourceLinks answer={response} />

          <DocsAssistantBoundaryMeta answer={response} />
        </div>
      )}
    </div>
  );
}
