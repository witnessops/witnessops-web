"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  askWitnessOpsAnswerText,
  fetchAskWitnessOps,
  type AskWitnessOpsUiAnswer,
} from "./ask-witnessops-response";
import { AskWitnessOpsReceiptMeta } from "./ask-witnessops-receipt-meta";
import { AskWitnessOpsRouteCta } from "./ask-witnessops-route-cta";
import { AskWitnessOpsSourceLinks } from "./ask-witnessops-source-links";
import { DocsAssistantLoadingStatus } from "./docs-assistant-loading-status";

interface AnswerState {
  content: string;
  answer?: AskWitnessOpsUiAnswer;
  error?: boolean;
}

const HIDDEN_WIDGET_PATHS = [
  "/pl",
  "/admin",
  "/assessment",
  "/design",
  "/runner-loop",
] as const;

export function shouldShowDocsAssistantWidget(pathname: string): boolean {
  if (pathname === "/docs/assistant") return false;

  return !HIDDEN_WIDGET_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
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

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!shouldShowDocsAssistantWidget(pathname)) {
    return null;
  }

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setAnswer(null);

    try {
      const data = await fetchAskWitnessOps(trimmed);
      setAnswer({
        content: askWitnessOpsAnswerText(data),
        answer: data,
      });
      setQuestion("");
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Ask WitnessOps request failed")) {
        setAnswer({
          content: err.message,
          error: true,
        });
        setQuestion("");
        return;
      }

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
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="ask-witnessops-title"
          className="flex w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-bg shadow-[0_24px_80px_rgba(0,0,0,0.45)] max-[420px]:w-full max-[420px]:max-w-none"
          style={{ height: "min(560px, calc(100vh - 8rem))" }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3">
            <div>
              <span
                id="ask-witnessops-title"
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

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="flex-1 overflow-y-auto">
              {!answer && !loading && (
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    What can I help you with?
                  </h2>
                  <div className="mt-4 grid gap-1">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.focus()}
                      className="flex min-h-10 items-center gap-3 rounded px-2 text-left text-sm text-text-muted transition-colors hover:bg-surface-bg-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      <span aria-hidden="true">?</span>
                      Ask a question
                    </button>
                    <Link
                      href="/docs"
                      onClick={handleClose}
                      className="flex min-h-10 items-center gap-3 rounded px-2 text-sm text-text-muted transition-colors hover:bg-surface-bg-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      <span aria-hidden="true">⌕</span>
                      Find a page
                    </Link>
                    <Link
                      href="/review/request"
                      onClick={handleClose}
                      className="flex min-h-10 items-center gap-3 rounded px-2 text-sm text-text-muted transition-colors hover:bg-surface-bg-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      <span aria-hidden="true">→</span>
                      Start a fit check
                    </Link>
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-text-muted">
                    Ask a non-secret question about proof packets, receipts,
                    verification paths, catalog packages, or safe first contact.
                  </p>
                </div>
              )}

              {loading && <DocsAssistantLoadingStatus compact />}

              {answer && (
                <div>
                  <p
                    className={`whitespace-pre-line text-sm leading-relaxed ${
                      answer.error ? "text-red-400" : "text-text-primary"
                    }`}
                  >
                    {answer.content}
                  </p>

                  {answer.answer && (
                    <>
                      <AskWitnessOpsRouteCta answer={answer.answer} compact />
                      <AskWitnessOpsSourceLinks
                        answer={answer.answer}
                        compact
                      />
                      <AskWitnessOpsReceiptMeta
                        answer={answer.answer}
                        compact
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            <p className="mt-3 shrink-0 text-[11px] leading-relaxed text-text-muted">
              Do not paste secrets, logs, credentials, private keys, MFA codes,
              screenshots, customer evidence, or raw exports.
            </p>

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
        </section>
      )}

      <button
        onClick={handleToggle}
        className="flex h-11 items-center gap-2 rounded-full border border-text-primary bg-text-primary px-5 text-sm font-semibold text-text-inverse shadow-[0_12px_36px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 hover:border-brand-accent hover:bg-brand-accent hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg motion-reduce:transform-none max-[420px]:w-11 max-[420px]:justify-center max-[420px]:px-0"
        aria-expanded={open}
        aria-label={open ? "Close Ask WitnessOps" : "Open Ask WitnessOps"}
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
        <span className="max-[420px]:sr-only">Ask AI</span>
      </button>
    </div>
  );
}
