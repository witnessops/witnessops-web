"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { DocsAssistantBoundaryMeta } from "./docs-assistant-boundary-meta";
import { DocsAssistantLoadingStatus } from "./docs-assistant-loading-status";
import { DocsAssistantSourceLinks } from "./docs-assistant-source-links";
import {
  answerText,
  docsAssistantRequestErrorDetails,
  type DocsAssistantUiAnswer,
} from "./docs-assistant-response";

interface AnswerState {
  content: string;
  citations?: DocsAssistantUiAnswer["citations"];
  answer?: DocsAssistantUiAnswer;
  error?: boolean;
}

export function DocsAssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

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
      if (!res.ok) {
        const error = await docsAssistantRequestErrorDetails(res);
        setAnswer({
          content: error.message,
          error: true,
          answer: error.answer,
        });
        setQuestion("");
        return;
      }
      const data = (await res.json()) as DocsAssistantUiAnswer;
      setAnswer({
        content: answerText(data),
        citations: data.citations,
        answer: data,
      });
      setQuestion("");
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

  function handleToggle() {
    if (open) {
      handleClose();
      return;
    }

    setOpen(true);
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 max-[420px]:bottom-20 max-[420px]:left-4 max-[420px]:right-4 max-[420px]:items-stretch sm:bottom-6 sm:right-6"
    >
      {open && (
        <div
          className="flex w-[calc(100vw-2rem)] max-w-[320px] flex-col overflow-hidden rounded border border-surface-border bg-surface-bg shadow-xl max-[420px]:w-full max-[420px]:max-w-none"
          style={{ height: "min(440px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3">
            <div>
              <span
                className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-primary"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                ASK WITNESSOPS
              </span>
              <span className="block text-xs text-text-muted">
                Bounded proof guide
              </span>
            </div>
            <button
              onClick={handleClose}
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:text-text-primary"
              aria-label="Close Ask WitnessOps"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="flex-1 overflow-y-auto">
              {!answer && !loading && (
                <p className="text-xs leading-relaxed text-text-muted">
                  Ask a non-secret question about proof packets, receipts,
                  verification paths, catalog packages, or safe first contact.
                </p>
              )}

              {loading && (
                <DocsAssistantLoadingStatus compact />
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

                  <DocsAssistantSourceLinks
                    answer={answer.answer}
                    citations={answer.citations}
                    compact
                  />
                  <DocsAssistantBoundaryMeta
                    answer={answer.answer}
                    compact
                  />
                </div>
              )}
            </div>

            <p className="mt-3 shrink-0 text-[11px] leading-relaxed text-text-muted">
              Do not paste secrets, logs, credentials, private keys, MFA codes,
              screenshots, customer evidence, or raw exports.
            </p>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="mt-3 flex shrink-0 gap-2 border-t border-surface-border pt-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a non-secret question..."
                className="min-w-0 flex-1 rounded border border-surface-border bg-surface-bg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="shrink-0 rounded border border-surface-border bg-surface-bg px-3 py-2 text-xs text-text-muted transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
              >
                Ask
              </button>
            </form>
            <p className="mt-2 shrink-0 text-[11px] leading-relaxed text-text-muted">
              Answers are based on public WitnessOps material. For private
              systems, request a fit check.
            </p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="flex h-10 items-center gap-2 rounded border border-surface-border bg-surface-bg px-4 text-xs font-semibold uppercase tracking-wider text-text-primary shadow-lg transition-colors hover:border-brand-accent hover:text-brand-accent max-[420px]:w-10 max-[420px]:justify-center max-[420px]:px-0"
        aria-expanded={open}
        aria-label="Toggle Ask WitnessOps"
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
        <span className="max-[420px]:sr-only">Ask WitnessOps</span>
      </button>
    </div>
  );
}
