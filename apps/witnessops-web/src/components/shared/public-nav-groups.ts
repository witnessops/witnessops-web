export type PublicNavGroup = {
  id: string;
  label: string;
  description: string;
  links: readonly { label: string; description: string; href: string }[];
};

/** Current destinations, grouped for the click-to-expand public navigation. */
export const PUBLIC_NAV_GROUPS: readonly PublicNavGroup[] = [
  {
    id: "review",
    label: "The review",
    description: "One action. Clear findings.",
    links: [
      { label: "Agent Action Security Review", href: "/reviews/agent-action-security-review", description: "What the review covers and delivers." },
      { label: "How it works", href: "/how-it-works", description: "From the first conversation to the findings." },
      { label: "Examples", href: "/review/sample-cases", description: "Published samples and their evidence." },
      { label: "Request a break test", href: "/review/request", description: "Tell us about your agent and its action." },
    ],
  },
  {
    id: "explore",
    label: "Explore",
    description: "Stories, ideas and the people behind them.",
    links: [
      { label: "The Sovereign Chronicles", href: "/chronicles", description: "Stories from the WitnessOps desk. Read or listen." },
      { label: "Research & articles", href: "/research", description: "Ideas, observations and longer reads." },
      { label: "Company details", href: "/company", description: "Who we are and how to reach us." },
      { label: "Security", href: "/security", description: "Security practices and disclosure." },
    ],
  },
];

export const PUBLIC_NAV_LINKS = [{ label: "Docs", href: "/docs" }] as const;

/** New Polish group copy retains the existing native-review boundary. */
export const POLISH_NAV_GROUPS: readonly PublicNavGroup[] = [
  {
    id: "review",
    label: "Przegląd",
    description: "Jedno działanie. Jasne ustalenia.",
    links: [
      { label: "Agent Action Security Review", href: "/pl/reviews/agent-action-security-review", description: "Zakres przeglądu i materiały, które otrzymasz." },
      { label: "Podejście", href: "/pl/why-witnessops", description: "Od pierwszej rozmowy do ustaleń." },
      { label: "Przykłady (EN)", href: "/review/sample-cases", description: "Opublikowane przykłady i materiały do sprawdzenia." },
      { label: "Poproś o test przełamania", href: "/pl/review/request", description: "Opisz agenta i jego działanie." },
    ],
  },
  {
    id: "explore",
    label: "Odkrywaj",
    description: "Historie, artykuły i ludzie stojący za WitnessOps.",
    links: [
      { label: "The Sovereign Chronicles (EN)", href: "/chronicles", description: "Historie z biurka WitnessOps. Czytaj lub słuchaj." },
      { label: "Artykuły i analizy (EN)", href: "/research", description: "Pomysły, obserwacje i dłuższe teksty." },
      { label: "Dane firmy", href: "/pl/company", description: "Kim jesteśmy i jak się z nami skontaktować." },
      { label: "Bezpieczeństwo", href: "/pl/security", description: "Zasady bezpieczeństwa i zgłaszanie podatności." },
    ],
  },
];

export const POLISH_NAV_LINKS = [{ label: "Dokumentacja", href: "/pl/docs" }] as const;
