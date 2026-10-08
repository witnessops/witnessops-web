/**
 * English homepage presentation from the founder-approved 2026-10-08 copy handoff.
 * These strings do not select an intake identity or amend offer contracts.
 * Polish strings are the existing homepage copy. No Polish translation of that
 * handoff is approved.
 */
export const HOMEPAGE_TWO_OFFER_COPY = {
  en: {
    headline: "Proof other people can check.",
    support:
      "WitnessOps reviews AI agents and internet-facing systems, with written findings, supporting evidence and clear limits.",
    aiQuestion: "What can your AI agent actually do in production?",
    aiHeadline: "What can your AI agent actually do in production?",
    aiDescription:
      "Review one action’s permissions, approvals and execution evidence. Receive an action map, findings with sources, prioritised recommendations and a readout.",
    // Approved homepage display. Matches the public agent-action price label.
    aiPrice: "€2,500 fixed · excluding VAT",
    aiCta: "Scope an AI review",
    externalQuestion: "What can the internet see that you didn’t mean to expose?",
    externalHeadline: "What can the internet see that you didn’t mean to expose?",
    externalDescription:
      "Review one authorised internet-facing system. Receive an external attack-surface map, findings with supporting evidence, remediation priorities and one focused retest.",
    // Approved homepage display. The registry label stays "€1,900 · excluding VAT".
    externalPrice: "€1,900 fixed · excluding VAT",
    externalScopeNote:
      "Low-impact, unauthenticated checks within the agreed scope. This is not a penetration test. One focused retest of reported findings is included within 30 calendar days of initial report handover.",
    externalCta: "Scope an external review",
    evidenceHeadline: "Evidence survives the dashboard.",
    contactLead: "Discuss a review:",
    reviewsEyebrow: "Two paid reviews",
    reviewsTitle: "One agent action or one internet-facing system.",
    reviewsBody: "The free hostname check stays a separate tool, not a third review.",
    freeLabel: "Free check — not a review",
    freeTitle: "Free check",
    freeBody: "A public hostname snapshot. No account needed. Not a review.",
    freeCta: "Start a free check",
    compareCta: "Compare these two reviews",
    fitCta: "Ask about fit",
  },
  pl: {
    headline: "Poznaj, co potrafią Twoi agenci i co ujawniają Twoje systemy.",
    support:
      "WitnessOps prowadzi konkretne przeglądy bezpieczeństwa agentów AI i systemów dostępnych z internetu. Otrzymasz pisemne ustalenia, materiały do sprawdzenia i jasne priorytety kolejnych kroków.",
    aiHeadline: "Sprawdź, do czego sięga Twój agent AI — zanim na nim polegasz.",
    aiCta: "Omów przegląd agenta AI",
    externalHeadline: "Zobacz, co ujawnia Twój system dostępny z internetu — i co wymaga uwagi.",
    externalCta: "Omów przegląd ekspozycji",
    reviewsEyebrow: "Dwa płatne przeglądy",
    reviewsTitle: "Jedno działanie agenta albo jeden system dostępny z internetu.",
    reviewsBody: "Bezpłatne sprawdzenie nazwy hosta zostaje osobnym narzędziem, nie trzecim przeglądem.",
    freeLabel: "Bezpłatne sprawdzenie — to nie jest przegląd",
    freeTitle: "Bezpłatne sprawdzenie",
    freeBody: "Publiczny podgląd nazwy hosta. Bez konta. To nie jest przegląd.",
    freeCta: "Zacznij bezpłatne sprawdzenie",
    compareCta: "Porównaj te dwa przeglądy",
    fitCta: "Zapytaj o dopasowanie",
  },
} as const;
