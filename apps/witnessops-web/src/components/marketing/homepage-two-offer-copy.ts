import { AGENT_PRICE_EN, AGENT_PRICE_PL } from "@/lib/offer-price-unit";

/**
 * Homepage presentation of the only current paid review.
 * These strings do not select an intake identity or amend the offer contract.
 */
export const HOMEPAGE_TWO_OFFER_COPY = {
  en: {
    headline: "Understand the controls before your AI agent acts.",
    support:
      "Agent Action Security Review helps engineering teams and AI implementation partners decide what needs attention before launch or handover. Review one consequential action and leave with sourced findings, clear priorities and explicit unknowns.",
    aiQuestion: "Understand the controls before your AI agent acts.",
    aiHeadline: "Understand the controls before your AI agent acts.",
    aiWhoFor: "For engineering teams and AI implementation partners preparing to launch or hand over an agent.",
    aiScopeNote:
      "One consequential action, such as issuing a refund, changing a record or granting access. Operating mode: read, inspect, reconstruct and report. We do not execute the action, change production, remediate, monitor continuously or certify that an agent is safe. This is not a penetration test.",
    aiDescription:
      "Inspect the trigger, executing identity, effective permissions, approvals and available execution evidence. You receive an action map, findings linked to evidence, prioritised recommendations, documented unknowns, a written report and a readout.",
    aiPrice: AGENT_PRICE_EN,
    aiCta: "Request an agent review",
    evidenceHeadline: "Evidence survives the dashboard.",
    contactLead: "Discuss a review:",
    reviewsEyebrow: "One paid review",
    reviewsTitle: "One consequential agent action.",
    reviewsBody: "The free hostname check stays a separate tool, not a second review.",
    freeLabel: "Free check — not a review",
    freeTitle: "Free check",
    freeBody: "A public hostname snapshot. No account needed. Not a review.",
    freeCta: "Start a free check",
    compareCta: "See scope and deliverables",
    fitCta: "Request an agent review",
    offerName: "Agent Action Security Review",
    timing: "Delivery timing agreed in the signed statement of work.",
    deliverables: [
      "Action map",
      "Findings linked to evidence",
      "Prioritised recommendations",
      "Documented unknowns",
      "Written report and readout",
    ],
  },
  pl: {
    headline: "Poznaj mechanizmy kontroli, zanim agent AI wykona działanie.",
    support:
      "Agent Action Security Review pomaga zespołom inżynierskim i partnerom wdrażającym AI ustalić, co wymaga uwagi przed uruchomieniem lub przekazaniem agenta. Jedno istotne działanie, ustalenia ze źródłami, jasne priorytety i jawne niewiadome.",
    aiHeadline: "Poznaj mechanizmy kontroli, zanim agent AI wykona działanie.",
    aiWhoFor: "Dla zespołów inżynierskich i partnerów wdrażających AI przed uruchomieniem lub przekazaniem agenta.",
    aiScopeNote:
      "Jedno istotne działanie, na przykład zwrot, zmiana rekordu albo nadanie dostępu. Tryb pracy: odczyt, inspekcja, rekonstrukcja i raport. Nie wykonujemy działania, nie zmieniamy produkcji, nie naprawiamy, nie monitorujemy ciągle i nie certyfikujemy, że agent jest bezpieczny.",
    aiDescription:
      "Sprawdzamy wyzwalacz, tożsamość wykonawczą, efektywne uprawnienia, zatwierdzanie i dostępne dowody wykonania. Otrzymujesz mapę działania, ustalenia powiązane z dowodami, zalecenia według priorytetu, udokumentowane niewiadome, raport pisemny i omówienie.",
    aiPrice: AGENT_PRICE_PL,
    aiCta: "Zgłoś przegląd agenta",
    evidenceHeadline: "Dowody zostają po zamknięciu panelu.",
    contactLead: "Zapytaj o przegląd:",
    reviewsEyebrow: "Jeden płatny przegląd",
    reviewsTitle: "Jedno istotne działanie agenta.",
    reviewsBody: "Bezpłatne sprawdzenie nazwy hosta zostaje osobnym narzędziem, nie drugim przeglądem.",
    freeLabel: "Bezpłatne sprawdzenie — to nie jest przegląd",
    freeTitle: "Bezpłatne sprawdzenie",
    freeBody: "Publiczny podgląd nazwy hosta. Bez konta. To nie jest przegląd.",
    freeCta: "Zacznij bezpłatne sprawdzenie",
    compareCta: "Zobacz zakres i wyniki",
    fitCta: "Zgłoś przegląd agenta",
    offerName: "Agent Action Security Review",
    timing: "Termin realizacji według podpisanego SOW.",
    deliverables: [
      "Mapa działania",
      "Ustalenia powiązane z dowodami",
      "Zalecenia według priorytetu",
      "Udokumentowane niewiadome",
      "Raport pisemny i omówienie",
    ],
  },
} as const;
