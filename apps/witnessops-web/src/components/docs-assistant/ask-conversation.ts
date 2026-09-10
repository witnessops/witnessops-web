import { askLanguage, contextualSuggestions, visitorStatements } from "@/lib/docs-assistant/conversation-guidance";
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
  const repairedClaim = answer.schema === "witnessops.ask.public-boundary-response.v1" &&
    answer.status === "closed" && answer.answer_mode === "policy_refusal" &&
    answer.commercial_fit.result === "not_fit" && answer.template.template_id === "boundary.refund_claim_repair.v1";
  if ((!repairedClaim && answer.status !== "success") || answer.commercial_fit.result === "blocked" || answer.fallback_reason) return false;
  // Retain only the subject of this narrowly marked refused claim, never the
  // rejected prompt or appended material. The canonical answer preserves the
  // no-verification boundary. This is session context, not a verified fact.
  turns = [...turns, { question: repairedClaim ? (askLanguage(question) === "pl" ? "Agent zwrotów." : "Refund agent.") : question.trim().slice(0, 2_000), answer }].slice(-12);
  listeners.forEach((listener) => listener());
  return true;
}

export function clearAskConversation() {
  turns = EMPTY_TURNS;
  listeners.forEach((listener) => listener());
}

export function askConversationHistory(completed: readonly AskCompletedTurn[]): AskConversationMessage[] {
  const pairs = completed.flatMap(({ question, answer }) => [
    { role: "user" as const, content: question },
    { role: "assistant" as const, content: askWitnessOpsAnswerText(answer).slice(0, 4_000) },
  ]);
  if (completed.length <= 3) return keepRecentAskHistory(pairs);
  // Keep the existing six-message / 6,000-character API boundary. Older context
  // is inspectable quoted visitor material, not a hidden model-generated memory.
  const older = completed.slice(0, -2);
  const context = askConversationContext(older);
  const questions = older.map(({ answer }) => askWitnessOpsAnswerText(answer).match(/[^.!?]*\?/g)?.join(" ") ?? "").join(" ").trim().slice(0, 1_000);
  return keepRecentAskHistory([
    { role: "user", content: context },
    { role: "assistant", content: questions || "Earlier answers omitted; no factual authority is implied." },
    ...pairs.slice(-4),
  ]);
}

export function askConversationContext(completed: readonly AskCompletedTurn[]): string {
  return "Earlier visitor statements, in order; later corrections take precedence:\n" +
    visitorStatements(completed.map(({ question }) => question)).join("\n").slice(0, 1_850);

}

/** Only the visitor's accepted words may be proposed for a human handoff. */
export function askConversationBrief(completed: readonly AskCompletedTurn[]): string {
  return visitorStatements(completed.map(({ question }) => question)).join("\n").slice(0, 1_000);
}

export function askPageService(pathname: string): BuyerService | undefined {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return BUYER_SERVICES.find((service) => service.detailHref.en === normalized);
}

export function askGuidedQuestions(service?: BuyerService) {
  void service; // Starters describe situations; the page still supplies a service hint to the API.
  return [
    { label: "An automation stopped working", detail: "", question: "An automation stopped working." },
    { label: "We're launching an AI agent", detail: "", question: "We're launching an AI agent." },
    { label: "A customer needs security evidence", detail: "", question: "A customer needs security evidence." },
    { label: "I want to check a server", detail: "", question: "I want to check a server." },
    { label: "Check my public exposure", detail: "", question: "Can you check my website externally?" },
  ];
}

export function askFollowUpQuestions(answer?: AskWitnessOpsUiAnswer, service?: BuyerService) {
  void service; // Retain the existing call signature; page context no longer creates generic chips.
  return contextualSuggestions(answer ? askWitnessOpsAnswerText(answer) : "")
    .map((label) => ({ label, question: label }));
}

export function shouldShowServiceCard(completed: readonly AskCompletedTurn[], index: number) {
  const id = completed[index]?.answer.recommendation?.service_id;
  return Boolean(id && completed[index - 1]?.answer.recommendation?.service_id !== id);
}
