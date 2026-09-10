import type { AskConversationMessage } from "./conversation-contract";

export type AskLanguage = "en" | "pl";
export function askLanguage(text: string): AskLanguage {
  return /[ąćęłńóśźż]|\b(czy|nasz|nasza|naszego|chcemy|potrzebujemy|klientowi|agenta|zwroty|dzisiaj)\b/i.test(text) ? "pl" : "en";
}

/** Context is visitor-reported, never independently established or model-authored. */
export function visitorStatements(questions: readonly string[]): string[] {
  const statements = questions.flatMap((question) => question.split(/(?<=[.!?])\s+|\n+/))
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith("?") && !/^(can|could|would|what|how|why|when|is|are|czy|jak|ile)\b/i.test(line));
  return [...new Set(statements)].slice(-8).map((line) => line.slice(0, 300));
}

/** Compare wording only; punctuation/case changes do not create a new question. */
export function questionKey(text: string): string {
  return text.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

export function wasQuestionAsked(question: string, previous: readonly string[]): boolean {
  return previous.some((text) => (text.match(/[^.!?]*\?/g) ?? [])
    .some((asked) => questionKey(asked) === questionKey(question)));
}

export function conversationNextQuestion(question: string, history: readonly AskConversationMessage[] = []): string | null {
  const previous = history.filter((message) => message.role === "assistant").map((message) => message.content);
  if (previous.reduce((count, text) => count + (text.match(/\?/g)?.length ?? 0), 0) >= 3) return null;
  const said = [...history.filter((m) => m.role === "user").map((m) => m.content), question].join("\n");
  const pl = askLanguage(question) === "pl";
  let next: string | null = null;
  if (/\b(n8n|workflow)\b/i.test(said) && /hubspot/i.test(said) && !/\b(missing|delayed|wrong fields)\b/i.test(said)) {
    next = pl ? "Czy leadów brakuje, docierają z opóźnieniem, czy mają błędne pola?" : "Are leads missing entirely, arriving late, or arriving with the wrong fields?";
  } else if (/\b(agent|agenta)\b/i.test(said) && /refund|zwrot/i.test(said) && !/\b(live|pre-launch|already issuing|before launch|produkcyjnie|przed uruchomieniem)\b/i.test(said)) {
    next = pl ? "Czy agent już realizuje zwroty, czy sprawdzacie go przed uruchomieniem?" : "Is the agent already issuing refunds, or are you checking it before launch?";
  } else if (/something is wrong|don't know what|nie wiem/i.test(question) && /automation|automatyzac/i.test(said)) {
    next = pl ? "Czy proces się zatrzymał, daje błędny wynik, czy sprawdzacie go przed uruchomieniem?" : "Did it stop working, produce the wrong result, or are you checking it before launch?";
  }
  return next && !wasQuestionAsked(next, previous) && !asksKnownQualification(next, visitorQualificationFacts([...history.filter(m => m.role === "user").map(m => m.content), question])) ? next : null;
}

export function contextualSuggestions(text: string) {
  if (text.includes("Are leads missing entirely, arriving late, or arriving with the wrong fields?")) return ["Missing", "Delayed", "Wrong fields"];
  if (text.includes("Czy leadów brakuje, docierają z opóźnieniem, czy mają błędne pola?")) return ["Brakuje", "Opóźnione", "Błędne pola"];
  if (text.includes("Is the agent already issuing refunds, or are you checking it before launch?")) return ["Already issuing refunds", "Before launch"];
  if (text.includes("Czy agent już realizuje zwroty, czy sprawdzacie go przed uruchomieniem?")) return ["Już realizuje zwroty", "Przed uruchomieniem"];
  if (text.includes("Did it stop working, produce the wrong result, or are you checking it before launch?")) return ["Stopped working", "Wrong result", "Before launch"];
  return [];
}


export function unsupportedClaimRepair(question: string): string | null {
  if (!/refund|zwrot/i.test(question) || !/agent/i.test(question) || !/verified|safe|zweryfik|bezpiecz/i.test(question)) return null;
  return askLanguage(question) === "pl"
    ? "Nie. W tej rozmowie nie przeprowadzono przeglądu ani testu, więc nie ma zweryfikowanego wyniku do przekazania. Możesz powiedzieć, że rozważasz przegląd kontroli zatwierdzania zwrotów. Czy agent już realizuje zwroty, czy sprawdzacie go przed uruchomieniem?"
    : "No review or test has happened in this chat, so there is no verified result to report. You can say you are exploring a review of the refund approval controls. Is the agent already issuing refunds, or are you checking it before launch?";
}

/** Exact visitor wording only, bounded and chronological; never model-authored memory. */
export function explicitVisitorCorrections(messages: readonly string[]): string[] {
  return messages.flatMap(text => text.split(/\n+/)).filter(text =>
    /^(?:no\b|actually\b|correction\b|I meant\b|that(?:'s| is) not\b|nie\b|właściwie\b)/i.test(text.trim())
  ).map(text => text.trim().slice(0, 400)).slice(-4);
}


export type QualificationDimension = "lifecycle" | "environment" | "deadline" | "system" | "outcome" | "change_status";
export type VisitorQualificationFacts = Partial<Record<QualificationDimension, { value: string; statement: string }>>;

/** Small lexical qualification vocabulary, not semantic fact extraction. Latest visitor wording wins. */
export function visitorQualificationFacts(messages: readonly string[]): VisitorQualificationFacts {
  const facts: VisitorQualificationFacts = {};
  for (const statement of visitorStatements(messages)) {
    const put = (dimension: QualificationDimension, value: string) => { facts[dimension] = {value, statement: statement.slice(0, 200)}; };
    const changeStatement = statement.replace(/[’‘]/g, "'");
    if (/^(?:no[,.]\s*)?(?:nothing (?:has )?changed|no (?:(?:known|recent)\s+){0,2}changes|(?:we|I) (?:did not|didn't|haven't|have not) chang(?:e|ed)\b)/i.test(changeStatement)) put("change_status", "no_known_change");
    else if (/^(?:(?:actually|correction)[,:]?\s*)?(?:(?:we|I) (?:changed|deployed|updated|modified)\b|this started after (?:a |the )?deployment\b)/i.test(changeStatement)) put("change_status", "changed");
    else if (/\b(?:don't know|do not know|not sure|unsure)\b[^.!?]{0,70}\bchang(?:e|ed|es)\b/i.test(changeStatement)) put("change_status", "unknown");
    if (/\b(?:pre[- ]launch|before launch|planned|not (?:yet )?live)\b|przed uruchomieniem|jeszcze nie działa/i.test(statement)) put("lifecycle", "planned/not live");
    else if (/\b(?:live|already issuing|already running|in production)\b|już uruchomiony|już działa|produkcyjnie/i.test(statement)) put("lifecycle", "live");
    if (/\bproduction\b|produkcj/i.test(statement) && !/not production|nie produkcj/i.test(statement)) put("environment", "production");
    else if (/\bstaging\b/i.test(statement) && !/not staging/i.test(statement)) put("environment", "staging");
    if (/\b(?:today|tomorrow|deadline|due|needed? by|need (?:it|this) by)\b|dzisiaj|jutro|termin/i.test(statement)) put("deadline", statement.slice(0, 200));
    if (/\b(?:n8n|HubSpot|Zapier|Make|Apps Script|refund agent|Linux|Windows|CRM)\b|agent zwrotów/i.test(statement)) put("system", statement.slice(0, 200));
    if (/\b(?:missing|delayed|wrong fields)\b|brakuje|opóźnione|błędne pola/i.test(statement)) put("outcome", statement.slice(0, 200));
  }
  return facts;
}

/** Suppress only recognizable requests for a known qualification dimension. */
export function asksKnownQualification(text: string, facts: VisitorQualificationFacts): boolean {
  // This guards change-history requests only; failure onset and other dimensions remain separate.
  if (facts.change_status?.value === "no_known_change" &&
    /\?|\b(?:whether|share|tell|describe|include|prepare|confirm|note|list|check)\b/i.test(text) &&
    /\brecent (?:changes?|edits?|deployments?)\b|\bwhat changed\b|\banything (?:has )?chang(?:e|ed)\b|\b(?:workflow|configuration|config|mapping)\b[^.!?]{0,35}\bchang(?:e|ed)\b/i.test(text)) return true;
  if (!/\?|\b(?:whether|share|tell|describe|include|prepare|confirm)\b|czy|podaj|opisz/i.test(text)) return false;
  return Boolean(
    (facts.lifecycle && /\b(?:is|are|whether)\b[^.!?]{0,90}\b(?:live|planned|pre[- ]launch|production)\b|already issuing|czy[^.!?]{0,80}(?:już|przed uruchomieniem)/i.test(text)) ||
    (facts.environment && /\b(?:is|are|whether|which|what)\b[^.!?]{0,90}\b(?:production|staging|environment)\b/i.test(text)) ||
    (facts.deadline && /\bwhen\b[^.!?]{0,50}\b(?:need|due|ready|deadline)\b|\b(?:what|which|share|include|confirm)\b[^.!?]{0,45}\b(?:deadline|timeline|timeframe)\b|jaki[^.!?]{0,25}termin/i.test(text)) ||
    (facts.system && /\b(?:what|which)\b[^.!?]{0,30}\b(?:systems?|workflows?|platforms?|tools?|agents?)\b|jaki[^.!?]{0,25}system/i.test(text)) ||
    (facts.outcome && /missing[^.!?]{0,45}(?:late|delayed|wrong fields)|\bwhat\b[^.!?]{0,30}\b(?:stopped|failed|outcome)\b/i.test(text))
  );
}
