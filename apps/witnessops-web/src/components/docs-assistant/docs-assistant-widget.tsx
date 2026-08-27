"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  askWitnessOpsAnswerText,
  askWitnessOpsModeLabel,
  fetchAskWitnessOps,
  type AskWitnessOpsUiAnswer,
} from "./ask-witnessops-response";
import { AskWitnessOpsCommercialFitCard } from "./ask-witnessops-commercial-fit-card";
import { AskWitnessOpsReceiptMeta } from "./ask-witnessops-receipt-meta";
import { AskWitnessOpsRouteCta } from "./ask-witnessops-route-cta";
import { AskWitnessOpsSourceLinks } from "./ask-witnessops-source-links";
import { DocsAssistantContactHandoff } from "./docs-assistant-contact-handoff";
import { DocsAssistantLoadingStatus } from "./docs-assistant-loading-status";

interface AnswerState {
  content: string;
  answer?: AskWitnessOpsUiAnswer;
  error?: boolean;
}

interface MobileViewportState {
  height: number | null;
  keyboardVisible: boolean;
}

const HIDDEN_WIDGET_PATHS = [
  "/pl",
  "/admin",
  "/assessment",
  "/design",
  "/runner-loop",
] as const;

// Tailwind's shared `sm` breakpoint starts at 40rem. Keep the JavaScript
// scroll-lock boundary aligned with the responsive layout boundary below.
const MOBILE_WIDGET_MEDIA_QUERY = "(max-width: 39.999rem)";

const GUIDED_FIT_QUESTIONS = [
  {
    label: "Agent changed production",
    question:
      "Can WitnessOps review one bounded AI-agent action that changes a production system?",
  },
  {
    label: "Approval or authority gap",
    question:
      "Can WitnessOps review who approved access for one consequential agent workflow?",
  },
  {
    label: "Review scope and price",
    question:
      "What is included in the Agent Risk & Control Review and how much does it cost?",
  },
] as const;

export function shouldShowDocsAssistantWidget(pathname: string): boolean {
  if (pathname === "/docs/assistant") return false;

  return !HIDDEN_WIDGET_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldShowDocsAssistantTrigger(open: boolean): boolean {
  return !open;
}

export function DocsAssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [contactMode, setContactMode] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<MobileViewportState>({
    height: null,
    keyboardVisible: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!open || !window.visualViewport) return;

    const responsiveBoundary = window.matchMedia(MOBILE_WIDGET_MEDIA_QUERY);
    const visualViewport = window.visualViewport;
    let largestObservedHeight = visualViewport.height;

    function syncVisibleViewport() {
      if (!responsiveBoundary.matches) {
        setMobileViewport({ height: null, keyboardVisible: false });
        return;
      }

      largestObservedHeight = Math.max(
        largestObservedHeight,
        visualViewport.height,
      );
      setMobileViewport({
        height: Math.round(visualViewport.height),
        keyboardVisible:
          largestObservedHeight - visualViewport.height > 120,
      });
    }

    syncVisibleViewport();
    visualViewport.addEventListener("resize", syncVisibleViewport);
    visualViewport.addEventListener("scroll", syncVisibleViewport);
    responsiveBoundary.addEventListener("change", syncVisibleViewport);

    return () => {
      visualViewport.removeEventListener("resize", syncVisibleViewport);
      visualViewport.removeEventListener("scroll", syncVisibleViewport);
      responsiveBoundary.removeEventListener("change", syncVisibleViewport);
      setMobileViewport({ height: null, keyboardVisible: false });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const mobileViewport = window.matchMedia(MOBILE_WIDGET_MEDIA_QUERY);
    let previousOverflow = "";
    let scrollLocked = false;

    function syncPageScrollLock() {
      if (mobileViewport.matches && !scrollLocked) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        scrollLocked = true;
        return;
      }

      if (!mobileViewport.matches && scrollLocked) {
        document.body.style.overflow = previousOverflow;
        scrollLocked = false;
      }
    }

    syncPageScrollLock();
    mobileViewport.addEventListener("change", syncPageScrollLock);

    return () => {
      mobileViewport.removeEventListener("change", syncPageScrollLock);
      if (scrollLocked) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [open]);

  if (!shouldShowDocsAssistantWidget(pathname)) {
    return null;
  }

  async function handleAsk(questionOverride?: string) {
    const trimmed = (questionOverride ?? question).trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setAnswer(null);
    setContactMode(false);

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
    setContactMode(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleOpen() {
    setOpen(true);
  }

  const dialogStyle = {
    "--ask-ai-mobile-height":
      mobileViewport.height === null
        ? "100dvh"
        : `${mobileViewport.height}px`,
    "--ask-ai-keyboard-cushion": mobileViewport.keyboardVisible
      ? "4rem"
      : "0px",
  } as CSSProperties;

  return (
    <div
      className={
        open
          ? "fixed inset-0 z-50 flex flex-col items-stretch sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:items-end"
          : "fixed right-4 bottom-20 z-50 flex flex-col items-end sm:right-6 sm:bottom-6"
      }
    >
      {open && (
        <section
          id="ask-witnessops-dialog"
          role="dialog"
          aria-modal="false"
          aria-labelledby="ask-witnessops-title"
          className="flex h-[var(--ask-ai-mobile-height)] w-full max-w-none flex-col overflow-hidden border-0 border-surface-border bg-surface-bg shadow-none sm:h-[min(560px,calc(100vh-8rem))] sm:w-[calc(100vw-2rem)] sm:max-w-[390px] sm:rounded-xl sm:border sm:shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          style={dialogStyle}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:py-3">
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
              className="flex h-11 w-11 items-center justify-center rounded text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent sm:h-6 sm:w-6"
              aria-label="Close Ask WitnessOps"
            >
              ✕
            </button>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-4 sm:p-4"
            style={{
              paddingBottom:
                "calc(max(1rem, env(safe-area-inset-bottom)) + var(--ask-ai-keyboard-cushion))",
            }}
          >
            <div
              className={
                contactMode
                  ? "hidden"
                  : "min-h-0 flex-1 overflow-y-auto overscroll-contain"
              }
            >
              {!answer && !loading && (
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Describe one consequential agent workflow.
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    Use non-secret terms. I’ll show whether it fits the Agent
                    Risk &amp; Control Review, what the review would examine, and
                    the paid next step.
                  </p>
                  <div className="mt-4 grid gap-2">
                    {GUIDED_FIT_QUESTIONS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void handleAsk(item.question)}
                        className="min-h-10 rounded border border-surface-border px-3 py-2 text-left text-xs font-medium text-text-muted transition-colors hover:border-brand-accent hover:bg-surface-bg-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                      >
                        {item.label}
                      </button>
                    ))}
                    <Link
                      href="/docs"
                      onClick={handleClose}
                      className="flex min-h-10 items-center gap-3 rounded px-2 text-sm text-text-muted transition-colors hover:bg-surface-bg-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      Find a page
                    </Link>
                    <Link
                      href="/review/request?offerId=bounded-workflow-review&source=ask"
                      onClick={handleClose}
                      className="flex min-h-10 items-center gap-3 rounded px-2 text-sm text-text-muted transition-colors hover:bg-surface-bg-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      Request scope directly
                    </Link>
                  </div>
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
                      <p
                        className="mb-2 mt-3 text-[11px] uppercase tracking-[0.08em] text-text-muted"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {askWitnessOpsModeLabel(answer.answer)}
                      </p>
                      <AskWitnessOpsCommercialFitCard
                        answer={answer.answer}
                        compact
                        onRequestScope={() => setContactMode(true)}
                      />
                      {!answer.answer.commercial_fit.offer && (
                        <AskWitnessOpsRouteCta answer={answer.answer} compact />
                      )}
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

            <div
              className={
                contactMode
                  ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
                  : "shrink-0"
              }
            >
              <DocsAssistantContactHandoff
                expanded={contactMode}
                commercialFit={answer?.answer?.commercial_fit}
                onExpandedChange={setContactMode}
              />
            </div>

            {!contactMode && (
              <>
                <p className="mt-3 shrink-0 text-[11px] leading-relaxed text-text-muted">
                  Do not paste secrets, logs, credentials, private keys, MFA
                  codes, screenshots, customer evidence, or raw exports.
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
                    placeholder="Example: An agent rotates a compromised production key."
                    className="min-w-0 flex-1 rounded border border-surface-border bg-surface-bg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="shrink-0 rounded border border-surface-border bg-surface-bg px-3 py-2 text-xs text-text-muted transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
                  >
                    {loading ? "…" : "Check fit"}
                  </button>
                </form>
                <p className="mt-2 shrink-0 text-[11px] leading-relaxed text-text-muted">
                  AI uses public WitnessOps material. Questions may be processed
                  by OpenAI with provider storage disabled. Do not include
                  confidential or personal material. <Link href="/privacy">Privacy</Link>
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {shouldShowDocsAssistantTrigger(open) && (
        <button
          ref={triggerRef}
          onClick={handleOpen}
          className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-text-primary bg-text-primary px-0 text-sm font-semibold text-text-inverse shadow-[0_12px_36px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 hover:border-brand-accent hover:bg-brand-accent hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg motion-reduce:transform-none sm:w-auto sm:px-5"
          aria-controls="ask-witnessops-dialog"
          aria-expanded="false"
          aria-label="Open Ask WitnessOps"
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
          <span className="sr-only sm:not-sr-only">Ask AI</span>
        </button>
      )}
    </div>
  );
}
