import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";

export type SovereignLocale = "en" | "pl";
export type SovereignAnswerKind = "agent" | "external" | "contact" | "handoff";

export type SovereignAnswer = {
  kind: SovereignAnswerKind;
  text: string;
  needsReview: boolean;
};

const CONTACT = "engage@mail.witnessops.com";

function agentText(locale: SovereignLocale): string {
  const offer = PUBLIC_AGENT_ACTION_OFFER;
  if (locale === "pl") {
    return `${offer.name.pl} sprawdza jedno nazwane istotne działanie. Cena: ${offer.price.pl}. ${offer.timing.pl}. Tylko inspekcja i rekonstrukcja. Przegląd nie wykonuje działania i nie zmienia produkcji.`;
  }
  return `${offer.name.en} reviews one named consequential action. The price is ${offer.price.en}. ${offer.timing.en}. Inspection and reconstruction only; the review does not execute the action or change production.`;
}

function externalText(locale: SovereignLocale): string {
  const offer = EXTERNAL_ATTACK_SURFACE_OFFER;
  if (locale === "pl") {
    return `${offer.name.pl} obejmuje jeden autoryzowany system dostępny z internetu. Cena: ${offer.price.pl}. ${offer.result.pl} ${offer.timing.pl}. To nie jest test penetracyjny.`;
  }
  return `${offer.name.en} covers one authorised internet-facing system. The price is ${offer.price.en}. ${offer.result.en} ${offer.timing.en}. This is not a penetration test.`;
}

function contactText(locale: SovereignLocale): string {
  const timing = PUBLIC_AGENT_ACTION_OFFER.timing[locale];
  if (locale === "pl") {
    return `Napisz na ${CONTACT} albo użyj strony kontaktu. Zgłoszenie nie upoważnia do zbierania danych i nie rozpoczyna przeglądu. ${timing}.`;
  }
  return `Write to ${CONTACT} or use the contact page. An enquiry does not authorise collection or start a review. ${timing}.`;
}

function handoffText(locale: SovereignLocale): string {
  if (locale === "pl") {
    return `Tego tematu nie ma w opublikowanych warunkach dwóch przeglądów. Napisz na ${CONTACT}.`;
  }
  return `That topic is not in the published offer facts for the two reviews. Write to ${CONTACT}.`;
}

export function sovereignAnswer(question: string, locale: SovereignLocale): SovereignAnswer {
  const q = question.toLowerCase();
  if (/retain|retention|data location|where (is|are) (the )?data|provider|openai|model|legal|disclosure|privacy law|gdpr|przechow|lokalizacj|dostawc|ujawnien|klauzul/.test(q)) {
    return { kind: "handoff", text: handoffText(locale), needsReview: true };
  }
  if (/external|attack surface|1,900|1900|retest|ekspozycj|powierzchn/.test(q)) {
    return { kind: "external", text: externalText(locale), needsReview: false };
  }
  if (/agent action|2,500|2500|consequential|istotn/.test(q)) {
    return { kind: "agent", text: agentText(locale), needsReview: false };
  }
  if (/start|write|email|contact|where|zaczą|napisz|kontakt|gdzie/.test(q)) {
    return { kind: "contact", text: contactText(locale), needsReview: false };
  }
  return { kind: "handoff", text: handoffText(locale), needsReview: false };
}
