export const HOMEPAGE_SYNTHETIC_PREVIEW = {
  sampleHref: "/review/sample-cases/external-exposure-assessment",
  findingId: "F-003",
  priority: "informational",
  evidenceId: "E-003",
  evidenceArtifact: "http-headers.txt",
  evidenceSha256:
    "4d3d6cc26e1ccec0fa6ccdd3a353481ed5e014bce2ff90bcfbc5197f96979781",
  packageArtifacts: [
    {
      path: "exposure-map.json",
      label: { en: "Exposure map", pl: "Mapa ekspozycji" },
    },
    {
      path: "findings.json",
      label: { en: "Findings", pl: "Ustalenia" },
    },
    {
      path: "evidence-register.json",
      label: { en: "Evidence register", pl: "Rejestr materiałów" },
    },
    {
      path: "focused-retest-result.md",
      label: { en: "Focused retest", pl: "Ukierunkowany retest" },
    },
  ],
  localized: {
    en: {
      panelLabel: "Synthetic example — not customer evidence",
      priority: "Informational",
      title: "Synthetic public metadata marker is exposed",
      observedLabel: "Observed",
      observed:
        "The fixture returned the deliberate X-Synthetic-Exposure header.",
      evidenceLabel: "Evidence",
      nextActionLabel: "Next",
      remediation:
        "Remove demonstration-only public metadata in a real deployment.",
      sampleAction: "View the full sample →",
    },
    pl: {
      panelLabel: "Syntetyczny przykład — nie są to materiały klienta",
      priority: "Informacyjne",
      title: "Ujawniono syntetyczny znacznik publicznych metadanych",
      observedLabel: "Zaobserwowano",
      observed:
        "Przykład zwrócił celowo dodany nagłówek X-Synthetic-Exposure.",
      evidenceLabel: "Materiał",
      nextActionLabel: "Dalej",
      remediation:
        "W rzeczywistym wdrożeniu usuń publiczne metadane służące wyłącznie do demonstracji.",
      sampleAction: "Zobacz pełny przykład →",
    },
  },
} as const;
