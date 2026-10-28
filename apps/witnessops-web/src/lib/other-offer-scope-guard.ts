/**
 * Public one-offer guard.
 *
 * Questions about any review other than Agent Action Security Review get one
 * fixed reply. The reply does not state a price, term, or availability.
 */
export const OTHER_OFFER_DECLINE =
  "I can't answer that here. Please email engage@mail.witnessops.com.";

export const RETIRED_REVIEW_NOTICE = {
  en: "This review is not offered on this website. To ask about it, email engage@mail.witnessops.com.",
  pl: "Ten przegląd nie jest oferowany na tej stronie. Aby o niego zapytać, napisz na engage@mail.witnessops.com.",
} as const;

export const AGENT_ACTION_REVIEW_PATH = {
  en: "/reviews/agent-action-security-review",
  pl: "/pl/reviews/agent-action-security-review",
} as const;

const OTHER_OFFER_QUESTION = new RegExp(
  [
    "external attack surface",
    "\\beasr\\b",
    "public exposure review",
    "offsec-external-exposure",
    "external-exposure-assessment",
    "exposure reviews?",
    "(?:€\\s*)?1[,\\s\\u00a0]?900",
    "your other review",
    "the other review",
    "other offer",
    "cheaper (?:one|review)",
    "the first review",
    "two reviews",
    "compare your two",
    "\\bretest\\b",
    "penetration test",
    "powierzchni(?:a|ę|ą)? ataku",
    "przegląd ekspozycji",
    "tańsz",
    "inny przegląd",
    "pierwszy przegląd",
    "dwa przegląd",
  ].join("|"),
  "i",
);

export function isOtherOfferQuestion(question: string): boolean {
  return OTHER_OFFER_QUESTION.test(question);
}

const FREE_CHECK_QUESTION = /free hostname check|hostname snapshot|external exposure snapshot|bezpłatne sprawdzenie nazwy hosta/i;

export function isFreeCheckQuestion(question: string): boolean {
  return FREE_CHECK_QUESTION.test(question) && !isOtherOfferQuestion(question);
}

export const FREE_CHECK_ANSWER = {
  en: "The free hostname check is a tool, not a review. It is a public hostname snapshot and does not need an account.",
  pl: "Bezpłatne sprawdzenie nazwy hosta jest narzędziem, nie przeglądem. To publiczny podgląd nazwy hosta i nie wymaga konta.",
} as const;

/** Model text that states another offer's price or availability. */
export function answerLeaksOtherOffer(text: string): boolean {
  return /external attack surface|public exposure review|offsec-external-exposure|(?:€\s*)?1[,\s\u00a0]?900|no longer available|nie jest już dostępny|discontinued/i.test(
    text,
  );
}
