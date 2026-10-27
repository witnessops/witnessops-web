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
  const parked = EXTERNAL_ATTACK_SURFACE_OFFER.name[locale];
  const current = PUBLIC_AGENT_ACTION_OFFER;
  if (locale === "pl") {
    return `${parked} nie jest już dostępny dla nowych zleceń. To nie jest ${current.name.pl}. Aktualny płatny przegląd dotyczy jednego istotnego działania agenta lub automatyzacji. Cena: ${current.price.pl}. ${current.timing.pl}.`;
  }
  return `${parked} is no longer available for new engagements. It is not the ${current.name.en}. The current paid review covers one consequential agent or automation action. The price is ${current.price.en}. ${current.timing.en}.`;
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
    return "Tego tematu nie ma w opublikowanych warunkach aktualnego przeglądu.";
  }
  return "That topic is not in the published offer facts for the current review.";
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
