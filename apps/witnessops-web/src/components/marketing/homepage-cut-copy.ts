import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { HOMEPAGE_TWO_OFFER_COPY } from "./homepage-two-offer-copy";

/**
 * Five-section homepage (Design 2026-11-13, "Homepage cut for a 5-second read").
 * H1, CTA and fee line are locked and come from the existing offer copy.
 * Polish lines are machine-drafted and stay under the pending-review bar.
 */
export type HomepageCutCopy = {
  offerName: string;
  headline: string;
  headlineDesktopVisual?: string;
  headlineMobile: string;
  sub: string;
  subCompact: string;
  fee: string;
  cta: string;
  exampleLabel: string;
  exampleHref: string;
  fourWaysEyebrow: string;
  fourWaysTitle: string;
  fourWays: readonly (readonly [string, string])[];
  fourWaysNote: string;
  getEyebrow: string;
  getTitle: string;
  get: readonly (readonly [string, string])[];
  howEyebrow: string;
  howTitle: string;
  steps: readonly (readonly [string, string, string])[];
  howNote: string;
  scopeLabel: string;
  scopeHref: string;
  enquiryEyebrow: string;
  enquiryTitle: string;
  enquiryLead: string;
  contactLead: string;
};

const en = HOMEPAGE_TWO_OFFER_COPY.en;
const pl = HOMEPAGE_TWO_OFFER_COPY.pl;

export const HOMEPAGE_CUT_COPY: { en: HomepageCutCopy; pl: HomepageCutCopy } = {
  en: {
    offerName: en.offerName,
    headline: en.headline,
    headlineDesktopVisual: en.headlineDesktopVisual,
    headlineMobile: en.headlineMobile,
    sub: "About to let an AI agent issue refunds, change records or grant access? We test one action and show which controls held, what changed and what we couldn’t verify.",
    subCompact: "Before your agent can issue refunds, change records or grant access, test which controls hold.",
    fee: `${PUBLIC_AGENT_ACTION_OFFER.price.en} · Fixed fee for one agreed workflow and one action.`,
    cta: en.aiCta,
    exampleLabel: "View an example record",
    exampleHref: "/reviews/agent-action-security-review#example-record",
    fourWaysEyebrow: en.fourWaysEyebrow,
    fourWaysTitle: en.fourWaysTitle,
    fourWays: [
      ["Injected instructions", "Could instructions in a message or document steer the agent off task?"],
      ["Permissions that are too wide", "Can the connected tool, including MCP where used, give the agent more access than the requester has?"],
      ["A skipped approval", "Does the required approval take effect before the refund or record change?"],
      ["A change with no record", "When the agent says “done”, what does the saved record show?"],
    ],
    fourWaysNote: "Examples of what we try, not findings.",
    getEyebrow: "What you get",
    getTitle: en.reviewsTitle,
    get: [
      ["Findings with evidence", "Each claim sits beside its proof."],
      ["Unknowns in writing", "What we couldn't establish is named."],
      ["What to fix first", "Prioritised recommendations."],
      ["A report you keep", "Written report and readout. No login."],
    ],
    howEyebrow: "How it works",
    howTitle: "Three steps. Nothing happens without your sign-off.",
    steps: [
      ["01", "Tell us the action", "One action and the systems it touches. No secrets."],
      ["02", "Agree the boundary", "We confirm scope, fee, capacity and timing in the signed statement of work. We don't test until you give written authority."],
      ["03", "Get the findings", "We show which controls held in the test, what failed and what the evidence leaves open."],
    ],
    howNote: "Not a full pentest, certification, fixing or monitoring.",
    scopeLabel: "See the full scope",
    scopeHref: "/reviews/agent-action-security-review",
    enquiryEyebrow: "Request the review",
    enquiryTitle: "Request a security assessment",
    enquiryLead: "Tell us one action, which systems it touches, and when you need to decide.",
    contactLead: en.contactLead,
  },
  // PL copy pending native review (machine-drafted). Listed in src/app/pl/layout.tsx.
  pl: {
    offerName: pl.offerName,
    headline: pl.headline,
    headlineDesktopVisual: pl.headlineDesktopVisual,
    headlineMobile: pl.headlineMobile,
    sub: "Twój agent ma zwracać pieniądze, zmieniać dane lub nadawać dostęp? Sprawdzimy jedno działanie i pokażemy, które zabezpieczenia zadziałały, co się zmieniło i czego nie udało się ustalić.",
    subCompact: "Zanim agent zacznie zwracać pieniądze, zmieniać dane lub nadawać dostęp, sprawdź, które zabezpieczenia działają.",
    fee: `${PUBLIC_AGENT_ACTION_OFFER.price.pl} · Stała cena za jedno działanie w jednym uzgodnionym procesie.`,
    cta: pl.aiCta,
    exampleLabel: "Zobacz przykładową dokumentację",
    exampleHref: "/pl/reviews/agent-action-security-review#example-record",
    fourWaysEyebrow: pl.fourWaysEyebrow,
    fourWaysTitle: pl.fourWaysTitle,
    fourWays: [
      ["Wstrzyknięte instrukcje", "Czy polecenie w wiadomości lub dokumencie może nakłonić agenta do innego działania?"],
      ["Za szerokie uprawnienia", "Czy podłączone narzędzie, także przez MCP, daje agentowi szerszy dostęp niż osobie zlecającej zadanie?"],
      ["Pominięta akceptacja", "Czy wymagane zatwierdzenie następuje przed zwrotem pieniędzy lub zmianą danych?"],
      ["Zmiana bez śladu", "Agent zgłasza wykonanie zadania. Co faktycznie zapisano w systemie?"],
    ],
    fourWaysNote: "Przykłady testów, nie ustalenia.",
    getEyebrow: "Co otrzymasz",
    getTitle: pl.reviewsTitle,
    get: [
      ["Ustalenia z dowodami", "Każde twierdzenie ma obok swój dowód."],
      ["Niewiadome na piśmie", "Nazywamy to, czego nie udało się ustalić."],
      ["Co naprawić najpierw", "Rekomendacje według priorytetu."],
      ["Raport zostaje u Ciebie", "Raport pisemny i omówienie. Bez logowania."],
    ],
    howEyebrow: "Jak to działa",
    howTitle: "Trzy kroki. Nic się nie dzieje bez Twojej zgody.",
    steps: [
      ["01", "Opisz akcję", "Jedna akcja i systemy, których dotyczy. Bez sekretów."],
      ["02", "Uzgodnij granice", "W podpisanej umowie potwierdzamy zakres, cenę, dostępność zespołu i termin. Nie testujemy bez Twojej pisemnej zgody."],
      ["03", "Otrzymaj ustalenia", "Pokazujemy, które zabezpieczenia zadziałały w teście, które zawiodły i czego nie udało się ustalić."],
    ],
    howNote: "To nie pełny pentest, certyfikacja, naprawa ani monitoring.",
    scopeLabel: "Zobacz pełny zakres",
    scopeHref: "/pl/reviews/agent-action-security-review",
    enquiryEyebrow: "Zapytaj o przegląd",
    enquiryTitle: "Zapytaj o ocenę bezpieczeństwa",
    enquiryLead: "Napisz, jakie to działanie, jakich systemów dotyczy i do kiedy potrzebujesz decyzji.",
    contactLead: "Lub napisz:",
  },
};

/** Compact enquiry form strings used only on the five-section homepage. */
export const HOMEPAGE_CUT_FORM_COPY = {
  en: {
    workflowHelp: "High level only. No secrets, logs or customer data.",
    next: "We'll ask you to confirm your email, then reply about fit.",
    submitBoundary: "This opens a fit check only. It is not a booking, a payment or permission to test.",
  },
  pl: {
    workflowHelp: "Tylko ogólnie. Bez sekretów, logów i danych klientów.",
    next: "Po potwierdzeniu adresu e-mail odpowiemy, czy możemy przetestować opisane działanie.",
    submitBoundary: "To tylko sprawdzenie dopasowania. Nie jest to rezerwacja, płatność ani zgoda na testy.",
  },
} as const;
