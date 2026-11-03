import { BUYER_SERVICES } from "@/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { askResponseLanguage } from "@/lib/docs-assistant/conversation-guidance";
import { isPublicPaidReviewId } from "@/lib/public-paid-reviews";
import type { NormalizedAskRequest } from "./ask-request-normalizer";

export function offerWords(text: string) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase().replace(/&/g, "and").replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
}

const RETIRED_NAMES = [...new Set([
  ...BUYER_SERVICES.filter((service) => !isPublicPaidReviewId(service.id)).flatMap((service) => [service.id, service.name.en, service.name.pl]),
  "bounded-workflow-review", "Agent Workflow Reconstruction", "Agent Risk & Control Review",
  "Workflow S", "Workflow M", "Workflow L", "przegląd powierzchni ataku", "przegląd jednego serwera",
].map(offerWords))].map((name) => new RegExp(`(?:^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z0-9])`));

export function mentionsRetiredOffer(text: string) {
  const words = ` ${offerWords(text)} `;
  return RETIRED_NAMES.some((name) => name.test(words));
}

/** Historical names are permitted only in explicit withdrawal explanations. */
export function promotesRetiredOffer(text: string) {
  return text.split(/[.!?;\n]+/).some((sentence) => {
    if (!mentionsRetiredOffer(sentence)) return false;
    const words = offerWords(sentence);
    return !/\b(?:no longer available|not available|not (?:a |the )?(?:current|new)|withdrawn|retired|do not offer|not offered|wycofan\w*|niedostepn\w*|nie oferujemy|nie sprzedajemy|nie (?:jest|sa) (?:juz )?dostepn\w*)\b/.test(words)
      || /\b(?:but|however|ale|jednak|natomiast)\b/.test(words);
  });
}

/** Polish catalogue facts are server-owned, including when the provider is off. */
export function polishOfferGuidance(args: NormalizedAskRequest): { text: string; recommend: boolean } | null {
  const language = askResponseLanguage(args.question, args.locale);
  if (language !== "pl") return null;
  const question = offerWords(args.question).replace(/[?!.]+$/, "");
  const offer = PUBLIC_AGENT_ACTION_OFFER;
  const namesCurrent = question.includes(offerWords(offer.name.pl)) || question.includes(offerWords(offer.id));
  const isFollowUp = (text: string) => /^(?:a )?(?:ile|jaka|jaki|jak dlugo|co (?:dostane|obejmuje)|czy (?:to|ten|ta))\b/.test(offerWords(text));
  const priorUser = [...(args.history ?? [])].reverse().find((item) => item.role === "user" && (
    !isFollowUp(item.content) || mentionsRetiredOffer(item.content) || offerWords(item.content).includes(offerWords(offer.name.pl))
  ))?.content ?? "";
  const followUp = isFollowUp(question);
  const retiredPage = args.page_service_id && !isPublicPaidReviewId(args.page_service_id);
  if (mentionsRetiredOffer(question) || (!namesCurrent && followUp && (mentionsRetiredOffer(priorUser) || retiredPage))) {
    return { text: `Ta usługa nie jest już dostępna dla nowych zleceń. Aktualna płatna oferta to ${offer.name.pl}: przegląd jednego istotnego działania agenta AI lub automatyzacji. Wcześniejsze umowy zachowują własny zakres i warunki.`, recommend: false };
  }
  const overview = /^(?:(?:jakie|jaka|jak) (?:sa |jest )?(?:wasze |wasza |macie |wyglada )?(?:aktualne |aktualna |obecne |obecna )?(?:ofert\w*|uslug\w*)(?: oferujecie)?|co oferujecie|czym sie zajmujecie|oferta|oferty|uslugi|opowiedz o witnessops)$/.test(question);
  if (overview) {
    return { text: `Aktualnie oferujemy jeden płatny przegląd: ${offer.name.pl}. ${offer.situation.pl} ${offer.result.pl}`, recommend: true };
  }
  const currentContext = namesCurrent || isPublicPaidReviewId(args.page_service_id)
    || offerWords(priorUser).includes(offerWords(offer.name.pl))
    || /^(?:jakie.*(?:ofert|uslug)|jaka.*ofert|co oferujecie|czym zajmuje sie witnessops|co robi witnessops|oferta|oferty|uslugi)/.test(offerWords(priorUser));
  const price = /\b(?:ile kosztuje|jaka (?:jest )?cena|cennik|cena|koszt przegladu)\b/.test(question);
  const timing = /\b(?:jak dlugo|ile (?:to )?trwa|termin realizacji|kiedy (?:otrzymam|dostane))\b/.test(question);
  const scope = /\b(?:co (?:obejmuje|dostane|otrzymam)|jakie (?:sa )?(?:wyniki|rezultaty))\b/.test(question);
  if (currentContext && (price || timing || scope || namesCurrent)) {
    return { text: price ? `${offer.name.pl}: ${offer.price.pl}. ${offer.timing.pl}. Zakres i dostępność wymagają potwierdzenia przed rozpoczęciem pracy.`
      : timing ? `${offer.timing.pl}. Ta rozmowa nie potwierdza dostępności ani daty rozpoczęcia przeglądu.`
        : `${offer.situation.pl} ${offer.result.pl}`, recommend: true };
  }
  return null;
}
