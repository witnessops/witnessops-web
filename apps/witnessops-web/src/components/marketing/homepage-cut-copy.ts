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
    sub: "For teams launching an AI agent that can refund, change records or grant access. We attack one action and show you what got through, with the evidence.",
    subCompact: "For teams launching an AI agent that can refund, change records or grant access. We attack one action and show you what got through.",
    fee: PUBLIC_AGENT_ACTION_OFFER.price.en,
    cta: en.aiCta,
    exampleLabel: "See an example record",
    exampleHref: "/reviews/agent-action-security-review#example-record",
    fourWaysEyebrow: en.fourWaysEyebrow,
    fourWaysTitle: en.fourWaysTitle,
    fourWays: [
      ["Injected instructions", "A message talks the agent into it."],
      ["Permissions that are too wide", "The account can do more than it needs."],
      ["A skipped approval", "The change goes through without sign-off."],
      ["A change with no record", "Nothing is left for anyone to check."],
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
      ["02", "Agree the boundary", "Fixed fee and scope in a signed SOW. We don't test until you give written authority."],
      ["03", "Get the findings", "Report and readout. If we don't get through, that's a result too."],
    ],
    howNote: "Not a full pentest, certification, fixing or monitoring.",
    scopeLabel: "See the full scope",
    scopeHref: "/reviews/agent-action-security-review",
    enquiryEyebrow: "Request the review",
    enquiryTitle: "Start with a fit check. Don't send secrets.",
    enquiryLead: "Tell us one action, which systems it touches, and when you need to decide.",
    contactLead: en.contactLead,
  },
  // PL copy pending native review (machine-drafted). Listed in src/app/pl/layout.tsx.
  pl: {
    offerName: pl.offerName,
    headline: pl.headline,
    headlineDesktopVisual: pl.headlineDesktopVisual,
    headlineMobile: pl.headlineMobile,
    sub: "Dla zespołów, które wdrażają agenta AI mogącego zwracać pieniądze, zmieniać rekordy lub nadawać dostęp. Atakujemy jedną akcję i pokazujemy, co się przedostało — z dowodami.",
    subCompact: "Dla zespołów, które wdrażają agenta AI mogącego zwracać pieniądze, zmieniać rekordy lub nadawać dostęp. Atakujemy jedną akcję i pokazujemy, co się przedostało.",
    fee: PUBLIC_AGENT_ACTION_OFFER.price.pl,
    cta: pl.aiCta,
    exampleLabel: "Zobacz przykładowy zapis (EN)",
    exampleHref: "/reviews/agent-action-security-review#example-record",
    fourWaysEyebrow: pl.fourWaysEyebrow,
    fourWaysTitle: pl.fourWaysTitle,
    fourWays: [
      ["Wstrzyknięte instrukcje", "Wiadomość namawia agenta do działania."],
      ["Za szerokie uprawnienia", "Konto może więcej, niż potrzeba."],
      ["Pominięta akceptacja", "Zmiana przechodzi bez zatwierdzenia."],
      ["Zmiana bez śladu", "Nie zostaje nic do sprawdzenia."],
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
      ["02", "Uzgodnij granice", "Stała opłata i zakres w podpisanym SOW. Nie testujemy bez Twojej pisemnej zgody."],
      ["03", "Otrzymaj ustalenia", "Raport i omówienie. Jeśli się nie przebijemy, to też jest wynik."],
    ],
    howNote: "To nie pełny pentest, certyfikacja, naprawa ani monitoring.",
    scopeLabel: "Zobacz pełny zakres",
    scopeHref: "/pl/reviews/agent-action-security-review",
    enquiryEyebrow: "Zapytaj o przegląd",
    enquiryTitle: "Zacznij od sprawdzenia dopasowania. Nie wysyłaj sekretów.",
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
    next: "Poprosimy o potwierdzenie e-maila, potem odpowiemy w sprawie dopasowania.",
    submitBoundary: "To tylko sprawdzenie dopasowania. Nie jest to rezerwacja, płatność ani zgoda na testy.",
  },
} as const;
