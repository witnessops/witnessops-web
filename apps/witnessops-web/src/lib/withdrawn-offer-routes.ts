/**
 * Withdrawn offer URLs remain recognized for 410 responses even when their
 * page implementations have been retired.
 * Path list and withdrawal copy reused from cursor/withdrawn-offer-410-c2e3
 * (1c715e92), plus /customer-security-review and its Polish twin (A6).
 */
export const WITHDRAWN_OFFER_PATHS = [
  "/catalog/offsec-local-audit",
  "/pl/catalog/offsec-local-audit",
  "/catalog/offsec-launch-ready",
  "/pl/catalog/offsec-launch-ready",
  "/catalog/offsec-custody-ops",
  "/pl/catalog/offsec-custody-ops",
  "/catalog/offsec-incident-ready",
  "/pl/catalog/offsec-incident-ready",
  "/catalog/automation-repair",
  "/pl/catalog/automation-repair",
  "/catalog/professional-public-footprint-audit",
  "/pl/catalog/professional-public-footprint-audit",
  "/customer-security-review",
  "/pl/customer-security-review",
  "/catalog/workflows",
] as const;

/** Retired samples outside the Agent Action Security Review. These return 410. */
export const WITHDRAWN_SAMPLE_PATHS = [
  "/review/sample-cases/external-exposure-assessment",
  "/pl/review/sample-cases/external-exposure-assessment",
  "/review/sample-cases/access-removed-proof",
  "/pl/review/sample-cases/access-removed-proof",
  "/review/sample-cases/sbom-cisa-2026-minimum-elements",
  "/pl/review/sample-cases/sbom-cisa-2026-minimum-elements",
  "/review/sample-cases/local-server-security-review",
  "/pl/review/sample-cases/local-server-security-review",
  "/review/sample-cases/launch-readiness-review",
  "/pl/review/sample-cases/launch-readiness-review",
  "/review/sample-cases/custody-wallet-ops-review",
  "/pl/review/sample-cases/custody-wallet-ops-review",
  "/review/sample-cases/incident-readiness-review",
  "/pl/review/sample-cases/incident-readiness-review",
  "/review/sample-cases/customer-security-review-sprint",
  "/pl/review/sample-cases/customer-security-review-sprint",
] as const;

const WITHDRAWN_PATH_SET = new Set<string>([
  ...WITHDRAWN_OFFER_PATHS,
  ...WITHDRAWN_SAMPLE_PATHS,
]);
const WITHDRAWN_SAMPLE_PATH_SET = new Set<string>(WITHDRAWN_SAMPLE_PATHS);

export const SITEMAP_OMITTED_ROUTES = new Set<string>(WITHDRAWN_PATH_SET);

export function normalizeOfferPath(pathname: string): string {
  const withoutTrailingSlash =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return withoutTrailingSlash.toLowerCase();
}

export function isWithdrawnOfferPath(pathname: string): boolean {
  return WITHDRAWN_PATH_SET.has(normalizeOfferPath(pathname));
}

export function isWithdrawnSamplePath(pathname: string): boolean {
  return WITHDRAWN_SAMPLE_PATH_SET.has(normalizeOfferPath(pathname));
}

export function isPolishOfferPath(pathname: string): boolean {
  return normalizeOfferPath(pathname).startsWith("/pl/");
}

export function withdrawnOfferCopy(polish: boolean) {
  return polish
    ? {
        title: "Ta oferta została wycofana",
        body: "WitnessOps nie oferuje już tego przeglądu. Aktualny przegląd i kontakt są poniżej.",
        links: [
          ["/pl/reviews/agent-action-security-review", "Agent Action Security Review"],
          ["/pl/contact", "Kontakt"],
        ] as const,
      }
    : {
        title: "This offer has been withdrawn",
        body: "WitnessOps no longer offers this review. The current review and contact are below.",
        links: [
          ["/reviews/agent-action-security-review", "Agent Action Security Review"],
          ["/contact", "Contact"],
        ] as const,
      };
}

export function withdrawnSampleCopy(polish: boolean) {
  return polish
    ? {
        title: "Ten przykład został wycofany",
        body: "Ten przykład nie należy już do publicznego katalogu przykładów. Poniżej znajdziesz przykłady działań agenta oraz aktualny przegląd.",
        links: [
          ["/review/sample-cases", "Przykłady działań agenta (EN)"],
          ["/pl/reviews/agent-action-security-review", "Agent Action Security Review"],
        ] as const,
      }
    : {
        title: "This sample has been retired",
        body: "This example is no longer part of the public sample collection. Explore the agent-action examples or the current review below.",
        links: [
          ["/review/sample-cases", "Agent-action examples"],
          ["/reviews/agent-action-security-review", "Agent Action Security Review"],
        ] as const,
      };
}
