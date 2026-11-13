import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";

/**
 * Homepage presentation of the only current paid review.
 * These strings do not select an intake identity or amend the offer contract.
 * Polish lines are meaning-accurate stand-ins and stay under the pending-review bar.
 */
export type HomepageOfferCopy = {
  headline: string;
  /** Visual line at ≥768. Falls back to `headline` when omitted. */
  headlineDesktopVisual?: string;
  /** Visual line below 768. Not the accessible name. */
  headlineMobile: string;
  support: string;
  /** Home support at ≤420px. */
  supportCompact: string;
  /** Polish home support at ≤360px. */
  supportShort?: string;
  aiQuestion?: string;
  aiHeadline: string;
  aiWhoFor: string;
  aiScopeNote: string;
  aiDescription: string;
  aiPrice: string;
  aiCta: string;
  evidenceHeadline: string;
  contactLead: string;
  reviewsEyebrow: string;
  reviewsTitle: string;
  reviewsBody: string;
  freeLabel: string;
  freeTitle: string;
  freeBody: string;
  freeCta: string;
  compareCta: string;
  fitCta: string;
  offerName: string;
  timing: string;
  deliverables: readonly string[];
  fourWaysEyebrow: string;
  fourWaysTitle: string;
  fourWaysIntro: string;
  fourWays: readonly (readonly [string, string])[];
  fourWaysNote: string;
};

const EN_SUPPORT =
  "You pick one action that matters — a refund, a record change, an access grant. We try to make your agent do it when it shouldn't, inside a boundary you sign off first. You get a record of what happened, the evidence, and what we'd fix. We might not get through. That's part of the result.";
const EN_SUPPORT_COMPACT =
  "You pick one action that matters. We try to make your agent do it when it shouldn't, inside a boundary you sign off first. We might not get through. That's part of the result.";
const PL_SUPPORT =
  "Wskazujesz jedno ważne działanie — zwrot pieniędzy, zmianę w rejestrze, nadanie dostępu. Próbujemy sprawić, by agent je wykonał, gdy nie powinien, w granicach, które wcześniej zatwierdzisz. Dostajesz zapis tego, co się stało, dowody i to, co naprawilibyśmy. Możemy nie przejść. To też jest wynik.";
const PL_SUPPORT_COMPACT =
  "Wskazujesz jedno ważne działanie. Próbujemy sprawić, by agent je wykonał, gdy nie powinien, w granicach, które wcześniej zatwierdzisz. Możemy nie przejść. To też jest wynik.";

export const HOMEPAGE_TWO_OFFER_COPY: { en: HomepageOfferCopy; pl: HomepageOfferCopy } = {
  en: {
    headline: "We try to break your AI agent before someone else does.",
    headlineMobile: "We try to break your AI agent first.",
    support: EN_SUPPORT,
    supportCompact: EN_SUPPORT_COMPACT,
    aiQuestion: "We try to break your AI agent before someone else does.",
    aiHeadline: "We try to break your AI agent before someone else does.",
    aiWhoFor: "For engineering teams and AI implementation partners preparing to launch or hand over an agent.",
    aiScopeNote:
      "One consequential action, such as issuing a refund, changing a record or granting access. Active adversarial testing only within the agreed environment and test boundary. Authorization must be enforced before the system changes. No production changes without separate explicit authorization, remediation implementation, continuous monitoring or safety certification. This is not a penetration test of the whole environment.",
    aiDescription:
      "Test attacker-controlled input, the agent decision, tool or API execution, effective permissions and the actual saved change against the supporting evidence. Receive an action map, test results, demonstrated impact, reproduction conditions, prioritised recommendations, documented unknowns, a written report and a readout.",
    aiPrice: PUBLIC_AGENT_ACTION_OFFER.price.en,
    aiCta: "Request a break test",
    evidenceHeadline: "What the record looks like.",
    contactLead: "Discuss a review:",
    reviewsEyebrow: "One paid review",
    reviewsTitle: "You keep the report and the evidence.",
    reviewsBody: "The free hostname check stays a separate tool, not a second review.",
    freeLabel: "Free check — not a review",
    freeTitle: "Free check",
    freeBody: "A public hostname snapshot. No account needed. Not a review.",
    freeCta: "Start a free check",
    compareCta: "See scope and deliverables",
    fitCta: "Request a break test",
    offerName: "Agent Action Security Review",
    timing: PUBLIC_AGENT_ACTION_OFFER.timing.en,
    deliverables: [
      "Action map",
      "Findings linked to evidence",
      "Test results and demonstrated impact",
      "Reproduction conditions",
      "Prioritised recommendations",
      "Documented unknowns",
      "Written report and readout",
    ],
    fourWaysEyebrow: "What we try to break",
    fourWaysTitle: "Four ways we try to break it.",
    fourWaysIntro:
      "We follow the action from a message someone could send, through to a change that sticks. Along the way we ask:",
    fourWays: [
      ["Injected instructions", "Can a message we control talk the agent into doing the action?"],
      ["Permissions that are too wide", "Once the agent can act, can that account do more than this action needs?"],
      ["A skipped approval", "If someone is supposed to sign off, can the change go through anyway?"],
      ["A change with no record", "Can the change stick without leaving something another person can check?"],
    ],
    fourWaysNote:
      "These are the kinds of tests we run, not findings. What we actually try depends on your action and the boundary we agree.",
  },
  pl: {
    headline: "Próbujemy przełamać Twojego agenta AI, zanim zrobi to ktoś inny.",
    headlineDesktopVisual: "Próbujemy przełamać agenta AI jako pierwsi.",
    headlineMobile: "Próbujemy przełamać agenta AI.",
    support: PL_SUPPORT,
    supportCompact: PL_SUPPORT_COMPACT,
    supportShort:
      "Wskazujesz jedno działanie. Próbujemy sprawić, by agent je wykonał, gdy nie powinien. Możemy nie przejść.",
    aiHeadline: "Próbujemy przełamać Twojego agenta AI, zanim zrobi to ktoś inny.",
    aiWhoFor: "Dla zespołów inżynierskich i partnerów wdrażających AI przed uruchomieniem lub przekazaniem agenta.",
    aiScopeNote:
      "Aktywne testy jednego istotnego działania w uzgodnionym środowisku. Upoważnienie musi być egzekwowane przed zmianą systemu. Zmiany produkcyjne wymagają osobnego wyraźnego upoważnienia. Bez wdrażania poprawek, ciągłego monitoringu i certyfikacji bezpieczeństwa agenta. To nie jest test penetracyjny całego środowiska.",
    aiDescription:
      "Badamy treść kontrolowaną przez atakującego, decyzję agenta, wywołanie narzędzia lub API, efektywne uprawnienia, faktycznie zapisaną zmianę i dowody wyniku.",
    aiPrice: PUBLIC_AGENT_ACTION_OFFER.price.pl,
    aiCta: "Poproś o test przełamania",
    evidenceHeadline: "Jak wygląda zapis.",
    contactLead: "Zapytaj o przegląd:",
    reviewsEyebrow: "Jeden płatny przegląd",
    reviewsTitle: "Zachowujesz raport i dowody.",
    reviewsBody: "Testujemy uzgodnione niedozwolone skutki jednego działania, które może zmienić dane, pieniądze lub dostęp.",
    freeLabel: "Bezpłatne sprawdzenie — to nie jest przegląd",
    freeTitle: "Bezpłatne sprawdzenie",
    freeBody: "Publiczny podgląd nazwy hosta. Bez konta. To nie jest przegląd.",
    freeCta: "Zacznij bezpłatne sprawdzenie",
    compareCta: "Zobacz pełny zakres przeglądu",
    fitCta: "Poproś o test przełamania",
    offerName: "Agent Action Security Review",
    timing: PUBLIC_AGENT_ACTION_OFFER.timing.pl,
    deliverables: [
      "Mapa działania",
      "Ustalenia powiązane z dowodami",
      "Wyniki testów i wykazany wpływ",
      "Warunki odtworzenia",
      "Zalecenia w kolejności ważności",
      "Informacje o tym, czego nie udało się ustalić",
      "Raport pisemny i omówienie",
    ],
    fourWaysEyebrow: "Co próbujemy przełamać",
    fourWaysTitle: "Cztery sposoby, w jakie próbujemy to przełamać.",
    fourWaysIntro:
      "Śledzimy działanie od wiadomości, którą ktoś mógłby wysłać, aż do zmiany, która zostaje. Po drodze pytamy:",
    fourWays: [
      ["Wstrzyknięte instrukcje", "Czy wiadomość, którą kontrolujemy, może nakłonić agenta do wykonania tego działania?"],
      ["Zbyt szerokie uprawnienia", "Gdy agent może działać, czy to konto może zrobić więcej, niż to działanie wymaga?"],
      ["Pominięte zatwierdzenie", "Jeśli ktoś ma to zatwierdzić, czy zmiana może przejść mimo to?"],
      ["Zmiana bez zapisu", "Czy zmiana może zostać bez śladu, który ktoś inny mógłby sprawdzić?"],
    ],
    fourWaysNote:
      "To rodzaje testów, które przeprowadzamy, a nie ustalenia. To, co faktycznie próbujemy, zależy od Twojego działania i granicy, którą uzgodnimy.",
  },
};

export const OFFER_SPOKEN_SUPPORT = {
  en: EN_SUPPORT,
  enCompact: EN_SUPPORT_COMPACT,
  pl: PL_SUPPORT,
  plCompact: PL_SUPPORT_COMPACT,
} as const;
