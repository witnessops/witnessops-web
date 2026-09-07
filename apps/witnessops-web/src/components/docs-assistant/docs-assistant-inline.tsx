"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackAskEvent } from "@/lib/docs-assistant/ask-analytics";
import { AskAiDisclosure } from "./ask-ai-disclosure";
import { askConversationHistory, askPageService, clearAskConversation, getAskConversation,
  getEmptyAskConversation, rememberAskTurn, subscribeAskConversation } from "./ask-conversation";

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

export function DocsAssistantInline() {
  const [question, setQuestion] = useState("");
  const completedTurns = useSyncExternalStore(subscribeAskConversation, getAskConversation, getEmptyAskConversation);
  const pageService = askPageService(usePathname());
  const [response, setResponse] = useState<AskWitnessOpsUiAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await fetchAskWitnessOps(trimmed, { history: askConversationHistory(completedTurns), page_service_id: pageService?.id });
      setResponse(data);
      rememberAskTurn(trimmed, data);
      setQuestion(data.fallback_reason ? trimmed : "");
      trackAskEvent("answered", { surface: "inline", service_id: data.recommendation?.service_id,
        outcome: data.fallback_reason ? "unavailable" : data.schema === "witnessops.ask.generated-answer.v1" ? "generated" : "guide" });
    } catch {
      setError("The AI could not answer just now. Your question is still here; retry or ask a person.");
      trackAskEvent("answered", { surface: "inline", outcome: "unavailable" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 border-t border-surface-border pt-8">
      <p
        className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        ASK WITNESSOPS
      </p>
      <p className="mt-1 text-sm font-medium text-text-primary">
        Questions about scope, evidence or pricing?
      </p>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        Ask about security reviews, verification or workflow repair. Start with a short description, without confidential data.
      </p>
      <p className="mb-3 mt-2 text-xs leading-relaxed text-text-muted">
        Do not paste secrets, logs, credentials, private keys, MFA codes,
        screenshots, customer evidence, or raw exports.
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
          aria-label="Ask WitnessOps question"
          maxLength={2_000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Example: Leads stopped reaching our CRM."
          className="min-w-0 flex-1 rounded border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="shrink-0 rounded border border-surface-border bg-surface-bg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
        >
          {loading ? "…" : "Ask AI"}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
        <Link href={response?.recommendation?.request_href ?? "/review/request?source=ask"} className="inline-flex min-h-11 items-center text-brand-accent underline underline-offset-4">Request a follow-up</Link>
        {(response || completedTurns.length > 0) && <button type="button" disabled={loading} className="min-h-11 underline underline-offset-4" onClick={() => {
          clearAskConversation(); setResponse(null); setError(null); setQuestion("");
        }}>Start over</button>}
      </div>
      <AskAiDisclosure model={response?.model} />

      {error && (
        <div className="mt-3">
          <p role="alert" className="text-sm text-red-400">{error}</p>
          <button type="button" onClick={handleAsk} disabled={loading || !question.trim()} className="min-h-11 text-sm text-text-primary underline underline-offset-4">Retry question</button>
        </div>
      )}

      {response && (
        <div className="mt-4 border-l-2 border-surface-border pl-4">
          <p
            className="mb-2 text-xs uppercase tracking-[0.08em] text-text-muted"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {askWitnessOpsModeLabel(response)}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
            {askWitnessOpsAnswerText(response)}
          </p>

          <AskWitnessOpsCommercialFitCard answer={response} />
          {!(response.schema === "witnessops.ask.generated-answer.v1"
            ? response.recommendation
            : response.commercial_fit.offer) && (
            <AskWitnessOpsRouteCta answer={response} />
          )}
          <AskWitnessOpsSourceLinks answer={response} compact />
          {response.fallback_reason && <button type="button" onClick={handleAsk} disabled={loading || !question.trim()} className="min-h-11 text-sm text-text-primary underline underline-offset-4">Retry AI answer</button>}
          <AskWitnessOpsReceiptMeta answer={response} />
        </div>
      )}
    </div>
  );
}
