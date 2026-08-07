export const HOMEPAGE_SYNTHETIC_PREVIEW = {
  sampleHref: "/review/sample-cases/external-exposure-assessment",
  findingId: "F-002",
  priority: "medium",
  evidenceId: "E-001",
  evidenceArtifact: "http-headers.txt",
  evidenceSha256:
    "710a68b96583139f49c28b5b865dad0e670e88652cb94bddb14560e9dcf515bc",
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
      panelLabel: "Synthetic worked example — not customer evidence.",
      priority: "Medium",
      title: "Synthetic transport policy header is absent",
      observedLabel: "Observed",
      observed:
        "The approved response did not contain Strict-Transport-Security.",
      evidenceLabel: "Evidence",
      evidenceRecorded: "SHA-256 recorded",
      whyLabel: "Why it matters",
      impact:
        "On a real HTTPS service this could reduce browser transport enforcement; the fixture intentionally uses HTTP.",
      nextActionLabel: "Next action",
      remediation:
        "For a real HTTPS service, evaluate HSTS after confirming subdomain and preload implications.",
      retestLabel: "Retest plan",
      retest: "Observe the same response headers only; do not reopen discovery.",
      packageLabel: "Your package",
      sampleAction: "Inspect the full synthetic sample →",
    },
    pl: {
      panelLabel: "Syntetyczny przykład roboczy — nie są to materiały klienta.",
      priority: "Średni",
      title: "Brak syntetycznego nagłówka polityki transportowej",
      observedLabel: "Zaobserwowano",
      observed:
        "Zatwierdzona odpowiedź nie zawierała nagłówka Strict-Transport-Security.",
      evidenceLabel: "Materiał",
      evidenceRecorded: "Zapisano SHA-256",
      whyLabel: "Dlaczego to ważne",
      impact:
        "W rzeczywistej usłudze HTTPS mogłoby to osłabić wymuszanie transportu przez przeglądarkę; przykład celowo używa HTTP.",
      nextActionLabel: "Następne działanie",
      remediation:
        "W rzeczywistej usłudze HTTPS oceń HSTS po potwierdzeniu wpływu na subdomeny i preload.",
      retestLabel: "Plan retestu",
      retest:
        "Sprawdź ponownie tylko te same nagłówki odpowiedzi; nie otwieraj ponownie wykrywania.",
      packageLabel: "Twój pakiet",
      sampleAction: "Zobacz pełny syntetyczny przykład →",
    },
  },
} as const;
