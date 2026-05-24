"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import {
  answerText,
  citationLabel,
  type DocsAssistantUiAnswer,
  visibleCitations,
} from "./docs-assistant-response";

interface AnswerState {
  content: string;
  citations?: DocsAssistantUiAnswer["citations"];
  error?: boolean;
}

export function DocsAssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [loading, setLoading] = useState(false);
  const isDocsPath = pathname.startsWith("/docs");

  if (pathname === "/docs/assistant") {
    return null;
  }

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch("/api/docs-assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setAnswer({ content: answerText(data), citations: data.citations });
    } catch (err) {
      setAnswer({
        content: err instanceof Error ? err.message : "Something went wrong.",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setQuestion("");
    setAnswer(null);
  }

  return (
    <div
      className={`fixed right-4 z-50 flex flex-col items-end gap-3 sm:right-6 ${
        isDocsPath ? "bottom-20 sm:bottom-6" : "bottom-6"
      }`}
    >
      {open && (
        <div
          className="flex w-[320px] flex-col overflow-hidden rounded border border-surface-border bg-surface-bg shadow-xl"
          style={{ height: 440 }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3">
            <div>
              <span
                className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-primary"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Docs Assistant
              </span>
              <span className="block text-xs text-text-muted">
                WitnessOps
              </span>
            </div>
            <button
              onClick={handleClose}
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:text-text-primary"
              aria-label="Close assistant"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="flex-1 overflow-y-auto">
              {!answer && !loading && (
                <p className="text-xs leading-relaxed text-text-muted">
                  Ask anything about WitnessOps — receipts, governed execution,
                  verification, or trust boundaries.
                </p>
              )}

              {loading && (
                <p
                  className="text-xs text-text-muted"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Searching docs…
                </p>
              )}

              {answer && (
                <div>
                  <p
                    className={`whitespace-pre-line text-sm leading-relaxed ${
                      answer.error ? "text-red-400" : "text-text-primary"
                    }`}
                  >
                    {answer.content}
                  </p>

                  {answer.citations && answer.citations.length > 0 && (
                    <div className="mt-3">
                      <p
                        className="mb-1.5 text-xs uppercase tracking-wider text-text-muted"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        Sources
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {visibleCitations(answer.citations).map((c) => (
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

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="mt-3 flex shrink-0 gap-2 border-t border-surface-border pt-3"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question…"
                className="flex-1 rounded border border-surface-border bg-surface-bg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded border border-surface-border bg-surface-bg px-3 py-2 text-xs text-text-muted transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded border border-surface-border bg-surface-bg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-primary shadow-lg transition-colors hover:border-brand-accent hover:text-brand-accent"
        aria-expanded={open}
        aria-label="Toggle docs assistant"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 1C3.686 1 1 3.686 1 7c0 1.08.277 2.094.764 2.974L1 13l3.026-.764A5.96 5.96 0 0 0 7 13c3.314 0 6-2.686 6-6S10.314 1 7 1Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        Ask WitnessOps
      </button>
    </div>
  );
}
