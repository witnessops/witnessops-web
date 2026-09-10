"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { askLanguage } from "@/lib/docs-assistant/conversation-guidance";
import { trackAskEvent } from "@/lib/docs-assistant/ask-analytics";
import {
  askWitnessOpsAnswerText,
  fetchAskWitnessOps,
  type AskWitnessOpsUiAnswer,
} from "./ask-witnessops-response";
import { useConversationFollow } from "./use-conversation-follow";
import { AskFreeCheckCard } from "./ask-free-check-card";
import { AskWitnessOpsCommercialFitCard } from "./ask-witnessops-commercial-fit-card";
import { AskWitnessOpsReceiptMeta } from "./ask-witnessops-receipt-meta";
import { AskWitnessOpsSourceLinks } from "./ask-witnessops-source-links";
import { DocsAssistantLoadingStatus } from "./docs-assistant-loading-status";

import { AskAiDisclosure } from "./ask-ai-disclosure";
import { DocsAssistantContactHandoff } from "./docs-assistant-contact-handoff";
import { askConversationContext, shouldShowServiceCard, askConversationBrief, askConversationHistory, askFollowUpQuestions, askGuidedQuestions,
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { reveal, resume, newReply } = useConversationFollow(conversationRef, messages);

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

  const language = askLanguage(completedTurns.at(-1)?.question ?? question);
  const pl = language === "pl";
  const isEmpty = messages.length === 0;
  const [freeCheckIntake, setFreeCheckIntake] = useState(false);
  const latestMessage = messages[messages.length - 1];
  const latestAssistantAnnouncement =
    latestMessage?.role === "assistant" && !latestMessage.error
      ? latestMessage.content
      : "";

  return (
    <div data-ask-page data-ask-fresh={isEmpty || undefined} className="mx-auto flex h-[calc(100dvh-72px)] data-[ask-fresh=true]:max-sm:max-h-[600px] min-h-0 w-full max-w-[768px] flex-col px-4 py-3 sm:px-6 sm:py-4">
      <header className="mb-4 border-b border-surface-border pb-4">
        <div
          className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          AI guide to finding the right next step.
        </div>
        <h1
          className="mt-3 text-3xl font-semibold uppercase tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Ask WitnessOps
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Tell me what happened, or what you need to check. I’ll help you find the right next step.
        </p>
      </header>


      {contactMode ? (
        <DocsAssistantContactHandoff expanded surface="page" commercialFit={contactAnswer?.commercial_fit}
          language={language} serviceId={contactAnswer?.recommendation?.service_id} proposedBrief={askConversationBrief(completedTurns)}
          launcherRef={contactLauncherRef} onExpandedChange={(expanded) => {
            setContactMode(expanded);
            if (!expanded) window.requestAnimationFrame(() => contactLauncherRef.current?.focus());
          }} />
      ) : <>
      <div
        ref={conversationRef}
        data-ask-scroll-region
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none]"
      >
        {isEmpty ? (
          <div className="py-1">
            <div className="flex flex-wrap gap-2">
              {askGuidedQuestions().map((item) => (
                <button
                  key={item.label}
                  onClick={() => ask(item.question)}
                  className="min-h-11 rounded border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-muted transition-colors hover:border-brand-accent hover:text-text-primary"
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
                  <div className="max-w-xl rounded border border-surface-border bg-surface-bg px-4 py-3 whitespace-pre-wrap break-words text-base text-text-primary">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} data-ask-latest={i === messages.length - 1 ? "" : undefined} className="scroll-mt-24">
                  <div className="min-w-0">
                    <p
                      role={msg.error ? "alert" : undefined}
                      className={`whitespace-pre-line break-words text-base leading-7 ${
                        msg.error ? "text-red-400" : "text-text-primary"
                      }`}
                    >
                      {msg.content}
                    </p>
                    {msg.answer && (
                      <>
                        <AskWitnessOpsSourceLinks answer={msg.answer} compact />
                        {shouldShowServiceCard(completedTurns, Math.floor(i / 2)) && <AskWitnessOpsCommercialFitCard answer={msg.answer}
                          showRequestAction={false} compact language={askLanguage(messages[i - 1]?.content ?? "")}
                          onOfferSelected={() => trackAskEvent("offer_selected", { surface: "page", service_id: msg.answer?.recommendation?.service_id })}
                          onRequestScope={() => { setContactAnswer(msg.answer); setContactMode(true); }} />}
                        {i === messages.length - 1 && msg.answer.presented_sources.some((source) => source.source_id === "public.external-exposure-snapshot") && <AskFreeCheckCard onStepChange={reveal} onIntakeChange={setFreeCheckIntake} />}
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
      {completedTurns.length > 3 && <details className="my-3 text-xs text-text-muted">
        <summary className="min-h-11 cursor-pointer">{pl ? "Kontekst tej rozmowy" : "Context retained in this tab"}</summary>
        <p className="whitespace-pre-wrap">{askConversationContext(completedTurns.slice(0, -2))}</p>
        <p>Visitor statements only. Earlier answers are not treated as facts. Start over clears this context.</p>
      </details>}
      </div>
      {newReply && <button type="button" className="min-h-11 shrink-0 self-start text-sm underline" onClick={resume}>{pl ? "Nowa odpowiedź ↓" : "New reply ↓"}</button>}
      {!freeCheckIntake && <div className="mt-2 shrink-0 border-t border-surface-border pt-2 pb-[env(safe-area-inset-bottom)]" data-ask-composer>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex gap-2"
        >
          <textarea
            ref={inputRef}
            rows={2}
            name="question"
            aria-label="Ask WitnessOps question"
            maxLength={2_000}
            enterKeyHint="send"
            disabled={loading}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(question); }
            }}
            placeholder={isEmpty ? "Example: Leads stopped reaching our CRM." : "Ask a follow-up…"}
            className="min-w-0 flex-1 rounded border border-surface-border bg-surface-bg px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="shrink-0 rounded border border-surface-border bg-surface-bg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
          >
            {loading ? (pl ? "Odpowiadam…" : "Responding…") : (pl ? "Wyślij" : "Send")}
          </button>
        </form>
        <p className="mt-2 text-xs text-text-muted">{pl ? "Nie wklejaj sekretów. Shift+Enter: nowy wiersz." : "Do not paste secrets. Shift+Enter for a new line."}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
          {askConversationBrief(completedTurns).trim() && <button ref={contactLauncherRef} type="button" className="min-h-11 text-brand-accent underline underline-offset-4" onClick={() => {
            setContactAnswer(latestMessage?.answer); setContactMode(true);
          }}>{pl ? "Przygotuj moją prośbę" : "Prepare my request"}</button>}
          {!isEmpty && <button type="button" onClick={startOver} disabled={loading} className="min-h-11 underline underline-offset-4">Start over</button>}
        </div>
        <AskAiDisclosure model={latestMessage?.answer?.model} />
      </div>}
      </>}
    </div>
  );
}
