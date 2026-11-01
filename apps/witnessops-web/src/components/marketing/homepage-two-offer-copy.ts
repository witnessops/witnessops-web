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
    headline: "Zanim agent AI zadziała.",
    support:
      "Agent Action Security Review to przegląd jednego ważnego działania agenta — na przykład zwrotu płatności lub nadania dostępu. Otrzymasz raport z ustaleniami, zaleceniami i opisem tego, czego nie udało się ustalić.",
    aiHeadline: "Sprawdź jedno ważne działanie agenta.",
    aiWhoFor: "Dla zespołów inżynierskich i partnerów wdrażających AI przed uruchomieniem lub przekazaniem agenta.",
    aiScopeNote:
      "Przegląd obejmuje jedno istotne działanie, na przykład zwrot płatności, zmianę danych lub nadanie dostępu. Analizujemy dostępne materiały i odtwarzamy przebieg działania. Nie wykonujemy go, nie zmieniamy systemów produkcyjnych, nie wdrażamy poprawek, nie prowadzimy ciągłego monitoringu ani nie certyfikujemy bezpieczeństwa agenta.",
    aiDescription:
      "Sprawdzamy, co uruchamia działanie i jaka tożsamość je wykonuje, na przykład konto usługi. W dostępnych materiałach szukamy informacji o jej uprawnieniach, zatwierdzaniu działania i zapisach wykonania.",
    aiPrice: AGENT_PRICE_PL,
    aiCta: "Zapytaj o przegląd agenta",
    evidenceHeadline: "Dowody zostają po zamknięciu panelu.",
    contactLead: "Zapytaj o przegląd:",
    reviewsEyebrow: "Jeden płatny przegląd",
    reviewsTitle: "Jedno działanie. Konkretny zakres.",
    reviewsBody: "Przed uruchomieniem lub przekazaniem agenta sprawdź zabezpieczenia działania, które może zmienić dane, pieniądze lub dostęp.",
    freeLabel: "Bezpłatne sprawdzenie — to nie jest przegląd",
    freeTitle: "Bezpłatne sprawdzenie",
    freeBody: "Publiczny podgląd nazwy hosta. Bez konta. To nie jest przegląd.",
    freeCta: "Zacznij bezpłatne sprawdzenie",
    compareCta: "Zobacz pełny zakres przeglądu",
    fitCta: "Zapytaj o przegląd agenta",
    offerName: "Agent Action Security Review",
    timing: "Termin realizacji według podpisanego SOW (zakresu prac).",
    deliverables: [
      "Mapa działania",
      "Ustalenia powiązane z dowodami",
      "Zalecenia w kolejności ważności",
      "Informacje o tym, czego nie udało się ustalić",
      "Raport pisemny i omówienie",
    ],
  },
} as const;
