"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { trackAskEvent } from "@/lib/docs-assistant/ask-analytics";
import {
  askWitnessOpsAnswerText,
  askWitnessOpsModeLabel,
  fetchAskWitnessOps,
  type AskWitnessOpsUiAnswer,
} from "./ask-witnessops-response";
import { AskFreeCheckCard } from "./ask-free-check-card";
import { AskWitnessOpsCommercialFitCard } from "./ask-witnessops-commercial-fit-card";
import { AskWitnessOpsReceiptMeta } from "./ask-witnessops-receipt-meta";
import { AskWitnessOpsRouteCta } from "./ask-witnessops-route-cta";
import { AskWitnessOpsSourceLinks } from "./ask-witnessops-source-links";
import { DocsAssistantLoadingStatus } from "./docs-assistant-loading-status";

import { AskAiDisclosure } from "./ask-ai-disclosure";
import { DocsAssistantContactHandoff } from "./docs-assistant-contact-handoff";
import { askConversationBrief, askConversationHistory, askFollowUpQuestions, askGuidedQuestions,
  clearAskConversation, getAskConversation, getEmptyAskConversation,
  rememberAskTurn, subscribeAskConversation } from "./ask-conversation";

interface Message {
  role: "user" | "assistant";
  content: string;
  answer?: AskWitnessOpsUiAnswer;
  error?: boolean;
}

export function DocsAssistantPage() {
  const completedTurns = useSyncExternalStore(subscribeAskConversation, getAskConversation, getEmptyAskConversation);
  const [currentResponse, setCurrentResponse] = useState<Message | null>(null);
  const messages = useMemo(() => {
    const entries: Message[] = completedTurns.flatMap((turn) => [
      { role: "user", content: turn.question },
      { role: "assistant", content: askWitnessOpsAnswerText(turn.answer), answer: turn.answer },
    ]);
    if (currentResponse) entries.push(currentResponse);
    return entries;
  }, [completedTurns, currentResponse]);
  const [contactMode, setContactMode] = useState(false);
  const [contactAnswer, setContactAnswer] = useState<AskWitnessOpsUiAnswer | undefined>();
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const contactLauncherRef = useRef<HTMLButtonElement>(null);
  const requestGenerationRef = useRef(0);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (
      !conversation ||
      !window.matchMedia("(min-width: 48rem)").matches
    ) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    conversation.scrollTo({
      top: conversation.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    trackAskEvent("opened", { surface: "page" });
    return () => { requestGenerationRef.current += 1; };
  }, []);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    const generation = ++requestGenerationRef.current;
    setQuestion(trimmed);
    setCurrentResponse(null);
    setFeedback(null);
    setLoading(true);

    try {
      const data = await fetchAskWitnessOps(trimmed, { history: askConversationHistory(completedTurns) });
      if (generation !== requestGenerationRef.current) return;
      rememberAskTurn(trimmed, data);
      if (data.status !== "success" || data.commercial_fit.result === "blocked" || data.fallback_reason) {
        setCurrentResponse({ role: "assistant", content: askWitnessOpsAnswerText(data), answer: data });
      }
      setQuestion(data.fallback_reason ? trimmed : "");
      trackAskEvent("answered", { surface: "page", service_id: data.recommendation?.service_id,
        outcome: data.fallback_reason ? "unavailable" : data.schema === "witnessops.ask.generated-answer.v1" ? "generated" : "guide" });
    } catch {
      if (generation !== requestGenerationRef.current) return;
      setCurrentResponse({ role: "assistant", content: "The AI could not answer just now. Your question is still here; retry or ask a person.", error: true });
      trackAskEvent("answered", { surface: "page", outcome: "unavailable" });
    } finally {
      if (generation === requestGenerationRef.current) setLoading(false);
    }
  }

  function startOver() {
    if (loading) return;
    clearAskConversation();
    setCurrentResponse(null);
    setQuestion("");
    setFeedback(null);
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0;
  const latestMessage = messages[messages.length - 1];
  const latestAssistantAnnouncement =
    latestMessage?.role === "assistant" && !latestMessage.error
      ? latestMessage.content
      : "";

  return (
    <div className="flex min-h-[calc(100vh-13rem)] flex-col pb-20 md:h-[calc(100vh-13rem)] md:pb-0">
      <header className="mb-4 border-b border-surface-border pb-4">
        <div
          className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Questions about scope, evidence or pricing?
        </div>
        <h1
          className="mt-1 text-2xl font-semibold uppercase tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ASK WITNESSOPS
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Ask about security reviews, verification or workflow repair. Describe your situation
          in non-secret terms and find the right next step.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted md:text-xs">
          Do not paste secrets or private evidence.
        </p>
      </header>

      {!contactMode && <AskFreeCheckCard />}
      {contactMode ? (
        <DocsAssistantContactHandoff expanded surface="page" commercialFit={contactAnswer?.commercial_fit}
          serviceId={contactAnswer?.recommendation?.service_id} proposedBrief={askConversationBrief(completedTurns)}
          launcherRef={contactLauncherRef} onExpandedChange={(expanded) => {
            setContactMode(expanded);
            if (!expanded) window.requestAnimationFrame(() => contactLauncherRef.current?.focus());
          }} />
      ) : <>
      <div
        ref={conversationRef}
        className="overflow-visible md:min-h-0 md:flex-1 md:overflow-y-auto"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-6 text-center md:h-full md:gap-6 md:py-0">
            <p className="max-w-sm text-sm leading-relaxed text-text-muted">
              Pick a question below or write your own.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {askGuidedQuestions().map((item) => (
                <button
                  key={item.label}
                  onClick={() => ask(item.question)}
                  className="rounded border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-muted transition-colors hover:border-brand-accent hover:text-text-primary"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-xl rounded border border-surface-border bg-surface-bg px-4 py-3 text-sm text-text-primary">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-2xl">
                    <p
                      role={msg.error ? "alert" : undefined}
                      className={`whitespace-pre-line text-sm leading-relaxed ${
                        msg.error ? "text-red-400" : "text-text-primary"
                      }`}
                    >
                      {msg.content}
                    </p>
                    {msg.answer && (
                      <>
                        <p
                          className="mb-2 mt-3 text-xs uppercase tracking-[0.08em] text-text-muted"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {askWitnessOpsModeLabel(msg.answer)}
                        </p>
                        {i === messages.length - 1 && <AskWitnessOpsCommercialFitCard answer={msg.answer}
                          onOfferSelected={() => trackAskEvent("offer_selected", { surface: "page", service_id: msg.answer?.recommendation?.service_id })}
                          onRequestScope={() => {
                          setContactAnswer(msg.answer); setContactMode(true);
                        }} />}
                        {!(msg.answer.schema === "witnessops.ask.generated-answer.v1"
                          ? msg.answer.recommendation
                          : msg.answer.commercial_fit.offer) && (
                          <AskWitnessOpsRouteCta answer={msg.answer} />
                        )}
                        <AskWitnessOpsSourceLinks answer={msg.answer} compact />
                        <AskWitnessOpsReceiptMeta answer={msg.answer} />
                      </>
                    )}
                  </div>
                </div>
              ),
            )}

            {loading && (
              <div className="flex justify-start">
                <DocsAssistantLoadingStatus />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latestAssistantAnnouncement}
      </div>

      {!loading && latestMessage?.answer?.status === "success" && !latestMessage.answer.fallback_reason && (
        <div className="flex flex-wrap items-center gap-2 py-3" aria-label="Suggested follow-ups">
          {askFollowUpQuestions(latestMessage.answer).map((item) => (
            <button type="button" key={item.label} onClick={() => ask(item.question)} className="min-h-11 rounded border border-surface-border px-3 text-sm text-text-muted">{item.label}</button>
          ))}
        </div>
      )}
      {!loading && latestMessage?.answer && !latestMessage.answer.fallback_reason && (
        <div className="flex items-center gap-3 text-xs text-text-muted" aria-label="Answer feedback">
          <span>{feedback ? "Thanks for the feedback" : "Was this helpful?"}</span>
          {!feedback && (["helpful", "not_helpful"] as const).map((value) => (
            <button type="button" key={value} className="min-h-11 underline underline-offset-4" onClick={() => {
              setFeedback(value); trackAskEvent("feedback", { surface: "page", feedback: value, service_id: latestMessage.answer?.recommendation?.service_id });
            }}>{value === "helpful" ? "Yes" : "Not quite"}</button>
          ))}
        </div>
      )}
      {(latestMessage?.error || latestMessage?.answer?.fallback_reason) && !loading && (
        <div className="py-2 text-sm text-text-muted">
          {latestMessage.answer?.fallback_reason && <p>The AI is temporarily unavailable. This is public guide information.</p>}
          <button type="button" onClick={() => ask(question)} disabled={!question.trim()} className="min-h-11 underline underline-offset-4">Retry question</button>
        </div>
      )}
      <div className="border-t border-surface-border pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            ref={inputRef}
            type="text"
            name="question"
            aria-label="Ask WitnessOps question"
            maxLength={2_000}
            enterKeyHint="send"
            disabled={loading}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isEmpty ? "Example: Leads stopped reaching our CRM." : "Ask a follow-up…"}
            className="min-w-0 flex-1 rounded border border-surface-border bg-surface-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="shrink-0 rounded border border-surface-border bg-surface-bg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
          >
            {loading ? "…" : "Ask AI"}
          </button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
          <button ref={contactLauncherRef} type="button" className="min-h-11 text-brand-accent underline underline-offset-4" onClick={() => {
            setContactAnswer(latestMessage?.answer); setContactMode(true);
          }}>Request a follow-up</button>
          {!isEmpty && <button type="button" onClick={startOver} disabled={loading} className="min-h-11 underline underline-offset-4">Start over</button>}
        </div>
        <AskAiDisclosure model={latestMessage?.answer?.model} />
      </div>
      </>}
    </div>
  );
}
