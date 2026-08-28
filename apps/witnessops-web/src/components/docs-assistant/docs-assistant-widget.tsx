"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";

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
import styles from "./docs-assistant-widget.module.css";

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
  "/review/request",
  "/runner-loop",
] as const;

// Tailwind's shared `sm` breakpoint starts at 40rem. Keep the JavaScript
// scroll-lock boundary aligned with the responsive layout boundary below.
const MOBILE_WIDGET_MEDIA_QUERY = "(max-width: 39.999rem)";

const GUIDED_FIT_QUESTIONS = [
  {
    label: "Agent changed production",
    detail: "Action · tool path · touched system",
    question:
      "Can WitnessOps review one bounded AI-agent action that changes a production system?",
  },
  {
    label: "Approval or authority gap",
    detail: "Owner · scope · policy · approval",
    question:
      "Can WitnessOps review who approved access for one consequential agent workflow?",
  },
  {
    label: "Review scope and price",
    detail: "Offer · price · paid next step",
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
  const [contactBusy, setContactBusy] = useState(false);
  const [suppressFloatingTrigger, setSuppressFloatingTrigger] = useState(
    pathname === "/",
  );
  const [mobileViewport, setMobileViewport] = useState<MobileViewportState>({
    height: null,
    keyboardVisible: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contactLauncherRef = useRef<HTMLButtonElement>(null);
  const restoreContactLauncherFocusRef = useRef(false);
  const contactBusyRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    if (window.matchMedia(MOBILE_WIDGET_MEDIA_QUERY).matches) {
      dialogRef.current?.focus();
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const mobileViewport = window.matchMedia(MOBILE_WIDGET_MEDIA_QUERY);

    if (pathname !== "/") {
      const syncNonHomeTrigger = () => {
        setSuppressFloatingTrigger(mobileViewport.matches);
      };
      mobileViewport.addEventListener("change", syncNonHomeTrigger);
      syncNonHomeTrigger();
      return () => {
        mobileViewport.removeEventListener("change", syncNonHomeTrigger);
      };
    }

    const triggerGuard = document.querySelector("[data-ask-trigger-guard]");
    if (!triggerGuard) {
      setSuppressFloatingTrigger(mobileViewport.matches);
      return;
    }

    const footer = document.querySelector("footer[data-brand-footer]");

    let guardVisible = true;
    let footerVisible = false;
    const syncTrigger = () => {
      setSuppressFloatingTrigger(
        mobileViewport.matches && (guardVisible || footerVisible),
      );
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === triggerGuard) {
            guardVisible = entry.isIntersecting;
          } else if (footer && entry.target === footer) {
            footerVisible = entry.isIntersecting;
          }
        }
        syncTrigger();
      },
      { threshold: 0.05 },
    );

    observer.observe(triggerGuard);
    if (footer) observer.observe(footer);
    mobileViewport.addEventListener("change", syncTrigger);
    syncTrigger();

    return () => {
      observer.disconnect();
      mobileViewport.removeEventListener("change", syncTrigger);
    };
  }, [pathname]);

  useEffect(() => {
    if (contactMode || !restoreContactLauncherFocusRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      contactLauncherRef.current?.focus();
      restoreContactLauncherFocusRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [contactMode]);

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
    if (contactBusyRef.current) return;

    setOpen(false);
    setQuestion("");
    setAnswer(null);
    setContactMode(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleOpen() {
    setOpen(true);
  }

  function handleContactModeChange(expanded: boolean) {
    if (!expanded && contactBusyRef.current) return;

    if (!expanded) {
      restoreContactLauncherFocusRef.current = true;
    }
    setContactMode(expanded);
  }

  function handleContactBusyChange(busy: boolean) {
    contactBusyRef.current = busy;
    setContactBusy(busy);
  }

  function handleResetAnswer() {
    if (loading || contactBusyRef.current) return;

    setAnswer(null);
    setQuestion("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
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
  const hasPaidScopeCta = Boolean(answer?.answer?.commercial_fit.offer);
  const layerClassName = open ? styles.openLayer : styles.closedLayer;

  return (
    <div className={layerClassName}>
      {open && (
        <section
          ref={dialogRef}
          id="ask-witnessops-dialog"
          role="dialog"
          tabIndex={-1}
          aria-modal="false"
          aria-labelledby="ask-witnessops-title"
          className={styles.dialog}
          data-ask-state={
            contactMode
              ? "contact"
              : loading
                ? "loading"
                : answer?.error
                  ? "error"
                  : answer
                    ? "result"
                    : "prompt"
          }
          style={dialogStyle}
        >
          <div className={styles.chrome} data-ask-chrome>
            <div className={styles.chromeIdentity}>
              <span
                id="ask-witnessops-title"
                className={styles.chromeTitle}
              >
                ASK WITNESSOPS
              </span>
              <span className={styles.chromeSubtitle}>
                Bounded proof guide
              </span>
            </div>
            <div className={styles.chromeMeta} aria-hidden="true">
              <span>PUBLIC MATERIAL</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={contactBusy}
              className={styles.closeButton}
              aria-label={
                contactBusy
                  ? "Close unavailable while request is processing"
                  : "Close Ask WitnessOps"
              }
            >
              <X size={16} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>

          <div
            className={styles.dialogBody}
            style={{
              paddingBottom:
                "calc(max(1rem, env(safe-area-inset-bottom)) + var(--ask-ai-keyboard-cushion))",
            }}
          >
            <div
              data-ask-scroll-region
              className={
                contactMode
                  ? styles.hidden
                  : styles.scrollRegion
              }
            >
              {!answer && !loading && (
                <div className={styles.promptStage}>
                  <p className={styles.promptKicker}>
                    One workflow · no secrets
                  </p>
                  <h2 className={styles.promptTitle}>
                    Describe one consequential agent workflow.
                  </h2>
                  <p className={styles.promptCopy}>
                    See the likely review scope, evidence questions, and paid
                    next step using only a short non-secret description.
                  </p>
                  <div className={styles.guidedRows}>
                    {GUIDED_FIT_QUESTIONS.map((item, index) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void handleAsk(item.question)}
                        className={styles.guidedRow}
                      >
                        <span className={styles.guidedIndex} aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={styles.guidedText}>
                          <span className={styles.guidedLabel}>{item.label}</span>
                          <span className={styles.guidedDetail}>{item.detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.utilityLinks}>
                    <Link
                      href="/review/request?offerId=bounded-workflow-review&source=ask"
                      onClick={handleClose}
                      className={styles.utilityLink}
                    >
                      Request scope directly <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </div>
              )}

              {loading && (
                <div className={styles.loadingStage}>
                  <DocsAssistantLoadingStatus compact />
                </div>
              )}

              {answer && (
                <div className={styles.answerStage}>
                  {answer.error ? (
                    <section
                      className={styles.errorPanel}
                      aria-label="Ask WitnessOps unavailable"
                    >
                      <div className={styles.errorPanelChrome}>
                        <span>PUBLIC GUIDE UNAVAILABLE</span>
                        <span>NO FIT CLAIM</span>
                      </div>
                      <p className={styles.errorPanelCopy}>{answer.content}</p>
                    </section>
                  ) : (
                    <section
                      className={styles.answerSheet}
                      aria-label="Public fit signal"
                    >
                      <div className={styles.answerSheetChrome}>
                        <span>PUBLIC FIT SIGNAL</span>
                        <span>NO EVIDENCE REVIEWED</span>
                      </div>
                      <div className={styles.answerSheetBody}>
                        {answer.answer && (
                          <p className={styles.answerMode}>
                            {askWitnessOpsModeLabel(answer.answer)}
                          </p>
                        )}
                        {answer.answer?.commercial_fit.offer && (
                          <AskWitnessOpsCommercialFitCard
                            answer={answer.answer}
                            compact
                            onRequestScope={() => handleContactModeChange(true)}
                          />
                        )}
                        {!answer.answer?.commercial_fit.offer && (
                          <p className={styles.answerCopy}>{answer.content}</p>
                        )}

                        {answer.answer && (
                          <>
                            {!answer.answer.commercial_fit.offer && (
                              <AskWitnessOpsRouteCta
                                answer={answer.answer}
                                compact
                              />
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
                    </section>
                  )}
                  <button
                    type="button"
                    onClick={handleResetAnswer}
                    className={styles.resultReset}
                  >
                    Ask another workflow
                  </button>
                </div>
              )}

            </div>

            {contactMode && (
              <div className={styles.contactScrollRegion}>
                <DocsAssistantContactHandoff
                  expanded
                  commercialFit={answer?.answer?.commercial_fit}
                  launcherRef={contactLauncherRef}
                  onBusyChange={handleContactBusyChange}
                  onExpandedChange={handleContactModeChange}
                />
              </div>
            )}

            {!contactMode && answer && !hasPaidScopeCta && (
              <div className={styles.contactLauncher}>
                <DocsAssistantContactHandoff
                  expanded={false}
                  commercialFit={answer?.answer?.commercial_fit}
                  launcherRef={contactLauncherRef}
                  onBusyChange={handleContactBusyChange}
                  onExpandedChange={handleContactModeChange}
                />
              </div>
            )}

            {!contactMode && !answer && (
              <div className={styles.composer} data-ask-composer>
                <p className={styles.safetyLine}>
                  <strong>PUBLIC INPUT</strong>
                  <span>
                    Do not paste secrets, logs, credentials, private keys, MFA
                    codes, screenshots, customer evidence, or raw exports.
                  </span>
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAsk();
                  }}
                  className={styles.askForm}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Example: An agent rotates a compromised key."
                    aria-label="Describe one non-secret workflow"
                    className={styles.askInput}
                  />
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className={styles.askSubmit}
                  >
                    {loading ? "…" : "Check fit"}
                  </button>
                </form>
                <p className={styles.providerDisclosure}>
                  Uses public WitnessOps material. Eligible questions may be
                  sent to OpenAI with <code>store: false</code>; provider
                  retention may still apply.{" "}
                  <Link href="/privacy">Privacy</Link>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {shouldShowDocsAssistantTrigger(open) && !suppressFloatingTrigger && (
        <button
          ref={triggerRef}
          onClick={handleOpen}
          className={styles.trigger}
          aria-controls="ask-witnessops-dialog"
          aria-expanded="false"
          aria-label="Open Ask WitnessOps"
        >
          <MessageCircle size={15} strokeWidth={1.7} aria-hidden="true" />
          <span className={styles.triggerLabel}>Ask WitnessOps</span>
          <span className={styles.triggerMeta} aria-hidden="true">
            AI
          </span>
        </button>
      )}
    </div>
  );
}
