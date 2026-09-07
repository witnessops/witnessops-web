import { BUYER_SERVICES, type BuyerService } from "@/lib/buyer-services";
import { keepRecentAskHistory, type AskConversationMessage } from "@/lib/docs-assistant/conversation-contract";
import { askWitnessOpsAnswerText, type AskWitnessOpsUiAnswer } from "./ask-witnessops-response";

export interface AskCompletedTurn {
  readonly question: string;
  readonly answer: AskWitnessOpsUiAnswer;
}

const EMPTY_TURNS: readonly AskCompletedTurn[] = [];
let turns: readonly AskCompletedTurn[] = EMPTY_TURNS;
const listeners = new Set<() => void>();

// Deliberately only browser module memory: a reload, closing the tab, or Start
// over forgets the conversation. No transcript enters local/session storage.
export function getAskConversation() { return turns; }
export function getEmptyAskConversation() { return EMPTY_TURNS; }
export function subscribeAskConversation(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function rememberAskTurn(question: string, answer: AskWitnessOpsUiAnswer) {
  if (answer.status !== "success" || answer.commercial_fit.result === "blocked" || answer.fallback_reason) return;
  turns = [...turns, { question: question.trim().slice(0, 2_000), answer }].slice(-3);
  listeners.forEach((listener) => listener());
}

export function clearAskConversation() {
  turns = EMPTY_TURNS;
  listeners.forEach((listener) => listener());
}

export function askConversationHistory(completed: readonly AskCompletedTurn[]): AskConversationMessage[] {
  return keepRecentAskHistory(completed.flatMap(({ question, answer }) => [
    { role: "user" as const, content: question },
    {
      role: "assistant" as const,
      content: `${askWitnessOpsAnswerText(answer)}${answer.recommendation ? `\nSuggested service: ${answer.recommendation.name}` : ""}`.slice(0, 4_000),
    },
  ]));
}

/** Only the visitor's accepted words may be proposed for a human handoff. */
export function askConversationBrief(completed: readonly AskCompletedTurn[]): string {
  return completed.map(({ question }) => question).join("\n\n").slice(0, 1_000);
}

export function askPageService(pathname: string): BuyerService | undefined {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return BUYER_SERVICES.find((service) => service.detailHref.en === normalized);
}

export function askGuidedQuestions(service?: BuyerService) {
  if (service) return [
    { label: "What do I get?", detail: "Deliverables and scope", question: `What do we receive from ${service.name.en}?` },
    { label: "Price and timing", detail: "Fee and delivery", question: `What does ${service.name.en} cost and how long does it take?` },
    { label: "Is this right for us?", detail: "Find out if it fits", question: `Who is ${service.name.en} for, and when is it not a fit?` },
  ];
  return [
    { label: "What does an agent review cover?", detail: "Scope and deliverables", question: "What does an Agent Action Security Review cover, and what do we receive?" },
    { label: "How do you check a result?", detail: "Evidence and limitations", question: "How does WitnessOps check a result, and what does the evidence establish?" },
    { label: "Can you review one server?", detail: "System security", question: "Can you review one Linux server, and what are the scope and price?" },
    { label: "Can you diagnose a broken workflow?", detail: "Diagnosis and repair", question: "How do diagnosis and repair work for a broken workflow, and what do they cost?" },
  ];
}

export function askFollowUpQuestions(answer?: AskWitnessOpsUiAnswer, service?: BuyerService) {
  const serviceId = answer?.recommendation?.service_id;
  const selected = BUYER_SERVICES.find((item) => item.id === serviceId) ?? service;
  if (selected) return [
    { label: "What should we prepare?", question: `What should we prepare for ${selected.name.en}, without sharing secrets here?` },
    { label: "Is this right for us?", question: `Help me decide whether ${selected.name.en} fits our situation. Ask one useful question.` },
  ];
  return [
    { label: "Help me choose", question: "Help me choose a WitnessOps service. Ask one useful question about our situation." },
    { label: "What happens next?", question: "What happens when I request a service from WitnessOps?" },
  ];
}
