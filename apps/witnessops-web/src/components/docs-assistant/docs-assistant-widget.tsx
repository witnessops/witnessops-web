"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";

import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { trackAskEvent } from "@/lib/docs-assistant/ask-analytics";

import {
  askWitnessOpsAnswerText,
  askWitnessOpsModeLabel,
  fetchAskWitnessOps,
  type AskWitnessOpsUiAnswer,
} from "./ask-witnessops-response";
import { askLanguage } from "@/lib/docs-assistant/conversation-guidance";
import { useConversationFollow } from "./use-conversation-follow";
import { AskFreeCheckCard } from "./ask-free-check-card";
import { AskWitnessOpsCommercialFitCard } from "./ask-witnessops-commercial-fit-card";
import { AskWitnessOpsReceiptMeta } from "./ask-witnessops-receipt-meta";
import { AskWitnessOpsRouteCta } from "./ask-witnessops-route-cta";
import { AskWitnessOpsSourceLinks } from "./ask-witnessops-source-links";
import { DocsAssistantContactHandoff } from "./docs-assistant-contact-handoff";
import { DocsAssistantLoadingStatus } from "./docs-assistant-loading-status";
import styles from "./docs-assistant-widget.module.css";
import { AskAiDisclosure } from "./ask-ai-disclosure";
import {
  askServiceCardIdentity, shouldShowServiceCard, askConversationBrief, askConversationHistory, askFollowUpQuestions, askGuidedQuestions,
  askPageService, clearAskConversation, getAskConversation, getEmptyAskConversation,
  rememberAskTurn, subscribeAskConversation,
} from "./ask-conversation";

interface AnswerState {
  content: string;
  answer?: AskWitnessOpsUiAnswer;
  question?: string;
  error?: boolean;
}

interface MobileViewportState {
  height: number | null;
  keyboardVisible: boolean;
}

const HIDDEN_WIDGET_PATHS = [
  "/proofpack",
  "/pl",
  "/admin",
  "/assessment",
  "/design",
  "/review/request",
  "/review/sample-cases/ai-agent-action-proof-run",
  "/runner-loop",
] as const;

// Tailwind's shared `sm` breakpoint starts at 40rem. Keep the JavaScript
// scroll-lock boundary aligned with the responsive layout boundary below.
const MOBILE_WIDGET_MEDIA_QUERY = "(max-width: 39.999rem)";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "summary",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

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
  const widgetVisible = shouldShowDocsAssistantWidget(pathname);
  const [open, setOpen] = useState(false);
  const [focusedControlObscured, setFocusedControlObscured] = useState(false);
  const [question, setQuestion] = useState("");
  const [answerState, setAnswer] = useState<AnswerState | null>(null);
  const completedTurns = useSyncExternalStore(subscribeAskConversation, getAskConversation, getEmptyAskConversation);
  const lastTurn = completedTurns[completedTurns.length - 1];
  const answer = answerState ?? (lastTurn ? {
    content: askWitnessOpsAnswerText(lastTurn.answer), answer: lastTurn.answer, question: lastTurn.question,
  } : null);
  const previousTurns = answer?.answer === lastTurn?.answer ? completedTurns.slice(0, -1) : completedTurns;
  const pageService = askPageService(pathname);
  const proposedBrief = askConversationBrief(completedTurns);
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [loading, setLoading] = useState(false);
  const [contactMode, setContactMode] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<MobileViewportState>({
    height: null,
    keyboardVisible: false,
  });
  const [freeCheckIntake, setFreeCheckIntake] = useState(false);
  const [mobileModal, setMobileModal] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousPathnameRef = useRef(pathname);
  const requestGenerationRef = useRef(0);
  const contactLauncherRef = useRef<HTMLButtonElement>(null);
  const restoreContactLauncherFocusRef = useRef(false);
  const contactBusyRef = useRef(false);

  const closeAskPanel = useCallback(() => {
    requestGenerationRef.current += 1;
    contactBusyRef.current = false;
    restoreContactLauncherFocusRef.current = false;
    setOpen(false);
    setLoading(false);
    setContactMode(false);
    setContactBusy(false);
    setMobileViewport({ height: null, keyboardVisible: false });
  }, []);

  const handleClose = useCallback(() => {
    if (contactBusyRef.current) return;

    const previousFocus = previousFocusRef.current;
    closeAskPanel();
    window.requestAnimationFrame(() => {
      if (previousFocus?.isConnected) {
        previousFocus.focus();
        return;
      }

      triggerRef.current?.focus();
    });
  }, [closeAskPanel]);

  const handleNavigation = useCallback(() => {
    closeAskPanel();
  }, [closeAskPanel]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;

    previousPathnameRef.current = pathname;
    closeAskPanel();
    setAnswer(null);
    setFeedback(null);
  }, [pathname, closeAskPanel]);

  const { reveal, resume, newReply } = useConversationFollow(scrollRef, open && !contactMode ? answerState ?? lastTurn : null);

  useEffect(() => {
    const mobileBoundary = window.matchMedia(MOBILE_WIDGET_MEDIA_QUERY);
    const syncMobileModal = () => setMobileModal(mobileBoundary.matches);

    syncMobileModal();
    mobileBoundary.addEventListener("change", syncMobileModal);
    return () => {
      mobileBoundary.removeEventListener("change", syncMobileModal);
    };
  }, []);

  useEffect(() => {
    if (!open || !widgetVisible) return;

    const focusFrame = window.requestAnimationFrame(() => {
      if (mobileModal) {
        dialogRef.current?.focus();
        return;
      }

      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [mobileModal, open, widgetVisible]);

  useEffect(() => {
    if (open || !widgetVisible) return;
    let frame = 0;
    const checkFocus = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const active = document.activeElement;
        const trigger = triggerRef.current;
        if (!(active instanceof HTMLElement) || !trigger || active === trigger || active === document.body) {
          setFocusedControlObscured(false);
          return;
        }
        const editing = active.matches("input, textarea, select, [contenteditable='true']");
        const keyboardCollision = editing && window.matchMedia(MOBILE_WIDGET_MEDIA_QUERY).matches && Boolean(window.visualViewport && window.innerHeight - window.visualViewport.height > 120);
        const field = active.getBoundingClientRect();
        const button = trigger.getBoundingClientRect();
        const intersects = field.left < button.right && field.right > button.left && field.top < button.bottom && field.bottom > button.top;
        const interactive = active.matches("a[href], button, input, textarea, select, summary, [contenteditable='true'], [role='button'], [role='link']");
        setFocusedControlObscured(keyboardCollision || (interactive && intersects));
      });
    };
    document.addEventListener("focusin", checkFocus);
    document.addEventListener("focusout", checkFocus);
    window.addEventListener("scroll", checkFocus, true);
    window.addEventListener("resize", checkFocus);
    window.visualViewport?.addEventListener("resize", checkFocus);
    checkFocus();
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("focusin", checkFocus);
      document.removeEventListener("focusout", checkFocus);
      window.removeEventListener("scroll", checkFocus, true);
      window.removeEventListener("resize", checkFocus);
      window.visualViewport?.removeEventListener("resize", checkFocus);
    };
  }, [open, pathname, widgetVisible]);

  useEffect(() => {
    if (contactMode || !restoreContactLauncherFocusRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      if (contactLauncherRef.current) contactLauncherRef.current?.focus();
      else dialogRef.current?.querySelector<HTMLButtonElement>("[data-ask-primary-cta]")?.focus();
      restoreContactLauncherFocusRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [contactMode]);

  useEffect(() => {
    if (!open || !widgetVisible) return;

    function keepMobileFocusInsideDialog(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (!mobileModal || event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active) || active === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keepMobileFocusInsideDialog);
    return () => {
      document.removeEventListener("keydown", keepMobileFocusInsideDialog);
    };
  }, [handleClose, mobileModal, open, widgetVisible]);

  useEffect(() => {
    if (!open || !widgetVisible || !window.visualViewport) return;

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
  }, [open, widgetVisible]);

  useEffect(() => {
    if (!open || !widgetVisible || !mobileModal) return;

    return acquireBodyScrollLock();
  }, [mobileModal, open, widgetVisible]);

  useEffect(() => {
    if (!open || !widgetVisible || !mobileModal) return;

    const layer = layerRef.current;
    if (!layer) return;

    const backgroundState: Array<{
      element: HTMLElement;
      inert: boolean;
      ariaHidden: string | null;
    }> = [];
    let activeBranch: HTMLElement | null = layer;

    while (activeBranch && activeBranch !== document.body) {
      const parent: HTMLElement | null = activeBranch.parentElement;
      if (!parent) break;

      for (const sibling of Array.from(parent.children)) {
        if (sibling === activeBranch || !(sibling instanceof HTMLElement)) {
          continue;
        }

        backgroundState.push({
          element: sibling,
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute("aria-hidden"),
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      }

      activeBranch = parent;
    }

    return () => {
      for (const { element, inert, ariaHidden } of backgroundState) {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", ariaHidden);
        }
      }
    };
  }, [mobileModal, open, widgetVisible]);

  if (!widgetVisible) {
    return null;
  }

  async function handleAsk(questionOverride?: string) {
    const trimmed = (questionOverride ?? question).trim();
    if (!trimmed || loading) return;
    const requestGeneration = ++requestGenerationRef.current;
    setLoading(true);
    setQuestion(trimmed);
    setFeedback(null);
    setContactMode(false);

    try {
      const data = await fetchAskWitnessOps(trimmed, {
        history: askConversationHistory(completedTurns),
        page_service_id: pageService?.id,
      });
      if (requestGeneration !== requestGenerationRef.current) return;
      setAnswer({
        content: askWitnessOpsAnswerText(data),
        answer: data,
        question:
          data.status === "success" && data.commercial_fit.result !== "blocked"
            ? trimmed
            : undefined,
      });
      rememberAskTurn(trimmed, data);
      setQuestion(data.fallback_reason === "ai_unavailable" ? trimmed : "");
      trackAskEvent("answered", {
        surface: "widget", service_id: data.recommendation?.service_id,
        outcome: data.fallback_reason ? "unavailable" : data.schema === "witnessops.ask.generated-answer.v1" ? "generated" : "guide",
      });
    } catch {
      if (requestGeneration !== requestGenerationRef.current) return;
      setAnswer({ content: "The AI could not answer just now. Your question is still here; retry or ask a person.", error: true });
      trackAskEvent("answered", { surface: "widget", outcome: "unavailable" });
    } finally {
      if (requestGeneration === requestGenerationRef.current) setLoading(false);
    }
  }

  function handleOpen() {
    previousFocusRef.current = triggerRef.current;
    setOpen(true);
    trackAskEvent("opened", { surface: "widget", service_id: pageService?.id });
  }

  function handleDialogLinkClick(event: ReactMouseEvent<HTMLElement>) {
    // Bubble after Next Link has handled the click. Closing in capture removes
    // the link before client navigation and causes a full reload, losing chat.
    // Next Link prevents the browser default; that must not skip panel cleanup.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) return;

    const link = eventTarget.closest<HTMLAnchorElement>("a[href]");
    if (
      !link ||
      !event.currentTarget.contains(link) ||
      link.target === "_blank" ||
      link.hasAttribute("download")
    ) {
      return;
    }

    const href = link.getAttribute("href");
    if (!href) return;

    try {
      const destination = new URL(href, window.location.href);
      if (destination.origin === window.location.origin) {
        handleNavigation();
      }
    } catch {
      // Leave malformed or non-navigation hrefs to the browser.
    }
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

    clearAskConversation();
    setAnswer(null);
    setQuestion("");
    setFeedback(null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  const dialogStyle = {
    "--ask-ai-mobile-height":
      mobileViewport.height === null
        ? "100dvh"
        : `${mobileViewport.height}px`,
    "--ask-ai-keyboard-cushion": "0px",
  } as CSSProperties;
  const hasPaidScopeCta = Boolean(askServiceCardIdentity(answer?.answer));
  const layerClassName = open ? styles.openLayer : styles.closedLayer;

  return (
    <div ref={layerRef} className={layerClassName} data-focus-obscured={!open && focusedControlObscured ? "true" : undefined}>
      {open && (
        <section
          ref={dialogRef}
          id="ask-witnessops-dialog"
          role="dialog"
          tabIndex={-1}
          aria-modal={mobileModal}
          aria-labelledby="ask-witnessops-title"
          className={styles.dialog}
          data-ask-fresh={!answer && !loading && !contactMode || undefined}
          onClick={handleDialogLinkClick}
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
                Tell me what happened, or what you need to check.
              </span>
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
              ref={scrollRef}
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
                    Your question · a useful next step
                  </p>
                  <h2 className={styles.promptTitle}>
                    Tell me what happened, or what you need to check.
                  </h2>
                  <p className={styles.promptCopy}>
                    I’ll help you find the right next step.
                  </p>
                  <div className={styles.guidedRows}>
                    {askGuidedQuestions(pageService).map((item, index) => (
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
                </div>
              )}

              {loading && (
                <div className={styles.loadingStage}>
                  <DocsAssistantLoadingStatus compact />
                </div>
              )}

              {answer && (
                <div className={styles.answerStage}>
                  {previousTurns.length > 0 && (
                    <div className={styles.earlierTurns} aria-label="Earlier in this chat">
                      {previousTurns.map((turn, index) => (
                        <div key={index} className={styles.earlierTurn}>
                          <p><strong>You:</strong> {turn.question}</p>
                          <p><strong>AI:</strong> {askWitnessOpsAnswerText(turn.answer)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {answer.question && <p className={styles.visitorQuestion}>{answer.question}</p>}
                  {answer.error ? (
                    <section
                      className={styles.errorPanel}
                      aria-label="Ask WitnessOps unavailable"
                    >
                      <div className={styles.errorPanelChrome}>
                        <span>PUBLIC GUIDE UNAVAILABLE</span>
                        <span>NO FIT CLAIM</span>
                      </div>
                      <p className={styles.errorPanelCopy} role="alert">{answer.content}</p>
                      <button type="button" className={styles.retryButton} onClick={() => void handleAsk()} disabled={!question.trim()}>Retry question</button>
                    </section>
                  ) : (
                    <section data-ask-latest
                      className={styles.answerSheet}
                      aria-label="Ask WitnessOps answer"
                    >
                      <div className={styles.answerSheetChrome}>
                        <span>{answer.answer ? askWitnessOpsModeLabel(answer.answer) : "AI answer"}</span>
                        <span>NO EVIDENCE REVIEWED</span>
                      </div>
                      <div className={styles.answerSheetBody}>
                        <p className={styles.answerCopy}>{answer.content}</p>
                        {answer.answer && shouldShowServiceCard(answer.answer, previousTurns.at(-1)?.answer) && (
                          <AskWitnessOpsCommercialFitCard
                            answer={answer.answer}
                            showRequestAction={false}
                            language={askLanguage(answer.question ?? "")}
                            compact
                            onOfferSelected={() => trackAskEvent("offer_selected", { surface: "widget", service_id: answer.answer?.recommendation?.service_id })}
                            onRequestScope={() => handleContactModeChange(true)}
                          />
                        )}

                        {answer.answer && (
                          <>
                            {!hasPaidScopeCta && (
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
              {answer?.answer?.presented_sources.some((source) => source.source_id === "public.external-exposure-snapshot") && <AskFreeCheckCard onStepChange={reveal} onIntakeChange={setFreeCheckIntake} />}
                  {answer.answer?.fallback_reason === "ai_unavailable" && (
                    <div className={styles.recoveryLine}>
                      <p>The AI is temporarily unavailable. This is public guide information.</p>
                      <button type="button" className={styles.resultReset} onClick={() => void handleAsk()} disabled={!question.trim()}>Retry AI answer</button>
                    </div>
                  )}
                  {answer.answer && !answer.answer.fallback_reason && (
                    <div className={styles.feedbackRow} aria-label="Answer feedback">
                      <span>{feedback ? "Thanks for the feedback" : "Was this helpful?"}</span>
                      {!feedback && (["helpful", "not_helpful"] as const).map((value) => (
                        <button key={value} type="button" onClick={() => {
                          setFeedback(value);
                          trackAskEvent("feedback", { surface: "widget", feedback: value, service_id: answer.answer?.recommendation?.service_id });
                        }}>{value === "helpful" ? "Yes" : "Not quite"}</button>
                      ))}
                    </div>
                  )}
                  {answer.answer?.status === "success" && !answer.answer.fallback_reason && (
                    <div className={styles.followUpQuestions} aria-label="Suggested follow-ups">
                      {askFollowUpQuestions(answer.answer, pageService).map((item) => (
                        <button key={item.label} type="button" onClick={() => void handleAsk(item.question)}>{item.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {contactMode && (
              <div className={styles.contactScrollRegion}>
                <DocsAssistantContactHandoff
                  expanded
                  commercialFit={answer?.answer?.commercial_fit}
                  question={answer?.answer?.fallback_reason ? undefined : answer?.question}
                  proposedBrief={proposedBrief}
                  language={askLanguage(answer?.question ?? "")}
                  serviceId={answer?.answer?.recommendation?.service_id}
                  launcherRef={contactLauncherRef}
                  onBusyChange={handleContactBusyChange}
                  onExpandedChange={handleContactModeChange}
                />
              </div>
            )}

            {!contactMode && newReply && <button type="button" className="min-h-11 shrink-0 text-sm underline" onClick={resume}>New reply ↓</button>}
            {!contactMode && !freeCheckIntake && (
              <div className={styles.composer} data-ask-composer>
                <p className={styles.safetyLine}>Do not paste secrets or private evidence.</p>

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
                    placeholder={answer ? "Ask a follow-up…" : "Example: Leads stopped reaching our CRM."}
                    aria-label="Ask WitnessOps question"
                    maxLength={2_000}
                    enterKeyHint="send"
                    disabled={loading}
                    className={styles.askInput}
                  />
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className={styles.askSubmit}
                  >
                    {loading ? "…" : "Ask AI"}
                  </button>
                </form>
                <div className={styles.conversationActions}>
                  {proposedBrief.trim() && !(answer?.answer?.fallback_reason && hasPaidScopeCta) && <button ref={contactLauncherRef} type="button" onClick={() => handleContactModeChange(true)}>{askLanguage(answer?.question ?? "") === "pl" ? "Przygotuj moją prośbę" : "Prepare my request"}</button>}
                  {(answer || completedTurns.length > 0) && (
                    <button type="button" onClick={handleResetAnswer} disabled={loading}>Start over</button>
                  )}
                </div>
                <AskAiDisclosure model={answer?.answer?.model} className={styles.providerDisclosure} />
              </div>
            )}
          </div>
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {!loading && !contactMode && answer && !answer.error ? answer.content : ""}
          </div>
        </section>
      )}

      {shouldShowDocsAssistantTrigger(open) && (
        <button
          ref={triggerRef}
          onClick={handleOpen}
          className={styles.trigger}
          aria-controls="ask-witnessops-dialog"
          aria-expanded="false"
          aria-label="Ask WitnessOps"
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
