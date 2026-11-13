import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";

/**
 * Homepage presentation of the only current paid review.
 * These strings do not select an intake identity or amend the offer contract.
 */
export const HOMEPAGE_TWO_OFFER_COPY = {
  en: {
    headline: "Test what your AI agent should refuse.",
    support:
      "We try to make your AI agent take actions it should refuse, then show you the evidence and what needs fixing. Agent Action Security Review for engineering teams and AI implementation partners, within an agreed environment and test boundary.",
    aiQuestion: "Test what your AI agent should refuse.",
    aiHeadline: "Test what your AI agent should refuse.",
    aiWhoFor: "For engineering teams and AI implementation partners preparing to launch or hand over an agent.",
    aiScopeNote:
      "One consequential action, such as issuing a refund, changing a record or granting access. Active adversarial testing only within the agreed environment and test boundary. Authorization must be enforced before the system changes. No production changes without separate explicit authorization, remediation implementation, continuous monitoring or safety certification. This is not a penetration test of the whole environment.",
    aiDescription:
      "Test attacker-controlled input, the agent decision, tool or API execution, effective permissions and the actual saved change against the supporting evidence. Receive an action map, test results, demonstrated impact, reproduction conditions, prioritised recommendations, documented unknowns, a written report and a readout.",
    aiPrice: PUBLIC_AGENT_ACTION_OFFER.price.en,
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
      "Test results and demonstrated impact",
      "Reproduction conditions",
      "Prioritised recommendations",
      "Documented unknowns",
      "Written report and readout",
    ],
  },
  pl: {
    headline: "Sprawdź, czy agent odmówi.",
    support:
      "Agent Action Security Review: jedno istotne działanie w uzgodnionym środowisku i granicach testu. Próbujemy wywołać niedozwolony skutek, pokazujemy dowody i wskazujemy, co poprawić.",
    aiHeadline: "Sprawdź, czy agent odmówi niedozwolonego działania.",
    aiWhoFor: "Dla zespołów inżynierskich i partnerów wdrażających AI przed uruchomieniem lub przekazaniem agenta.",
    aiScopeNote:
      "Aktywne testy jednego istotnego działania w uzgodnionym środowisku. Upoważnienie musi być egzekwowane przed zmianą systemu. Zmiany produkcyjne wymagają osobnego wyraźnego upoważnienia. Bez wdrażania poprawek, ciągłego monitoringu i certyfikacji bezpieczeństwa agenta. To nie jest test penetracyjny całego środowiska.",
    aiDescription:
      "Badamy treść kontrolowaną przez atakującego, decyzję agenta, wywołanie narzędzia lub API, efektywne uprawnienia, faktycznie zapisaną zmianę i dowody wyniku.",
    aiPrice: PUBLIC_AGENT_ACTION_OFFER.price.pl,
    aiCta: "Zapytaj o przegląd agenta",
    evidenceHeadline: "Dowody zostają po zamknięciu panelu.",
    contactLead: "Zapytaj o przegląd:",
    reviewsEyebrow: "Jeden płatny przegląd",
    reviewsTitle: "Jedno działanie. Konkretny zakres.",
    reviewsBody: "Testujemy uzgodnione niedozwolone skutki jednego działania, które może zmienić dane, pieniądze lub dostęp.",
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
      "Wyniki testów i wykazany wpływ",
      "Warunki odtworzenia",
      "Zalecenia w kolejności ważności",
      "Informacje o tym, czego nie udało się ustalić",
      "Raport pisemny i omówienie",
    ],
  },
} as const;
