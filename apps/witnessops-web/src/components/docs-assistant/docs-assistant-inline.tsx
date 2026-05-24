"use client";

import { useState } from "react";

import {
  answerText,
  citationLabel,
  type DocsAssistantUiAnswer,
  visibleCitations,
} from "./docs-assistant-response";

interface Props {
  pageContext?: string;
}

export function DocsAssistantInline({ pageContext }: Props) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<DocsAssistantUiAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    const query = pageContext ? `${trimmed} (page: ${pageContext})` : trimmed;

    try {
      const res = await fetch("/api/docs-assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setResponse(await res.json());
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
        className="flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this page…"
          className="flex-1 rounded border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded border border-surface-border bg-surface-bg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
        >
          {loading ? "…" : "Ask"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

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

          {response.citations?.length > 0 && (
            <div className="mt-3">
              <p
                className="mb-2 text-xs uppercase tracking-wider text-text-muted"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Sources
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleCitations(response.citations).map((c) => (
                  <span
                    key={c.citation_id}
                    className="rounded border border-surface-border px-2 py-0.5 text-xs text-text-muted"
                  >
                    {citationLabel(c)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
