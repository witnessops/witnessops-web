/**
 * Offer URLs that stay in the repo but are no longer served.
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
  "/customer-security-review",
  "/pl/customer-security-review",
  "/catalog/workflows",
] as const;

/** Sample pages for withdrawn offers. They stay reachable, with noindex. */
export const HISTORICAL_WITHDRAWN_SAMPLE_PATHS = [
  "/review/sample-cases/local-server-security-review",
  "/review/sample-cases/launch-readiness-review",
  "/review/sample-cases/custody-wallet-ops-review",
  "/review/sample-cases/incident-readiness-review",
  "/review/sample-cases/customer-security-review-sprint",
] as const;

const WITHDRAWN_OFFER_PATH_SET = new Set<string>(WITHDRAWN_OFFER_PATHS);

export const SITEMAP_OMITTED_ROUTES = new Set<string>([
  ...WITHDRAWN_OFFER_PATHS,
  ...HISTORICAL_WITHDRAWN_SAMPLE_PATHS,
]);

export function normalizeOfferPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isWithdrawnOfferPath(pathname: string): boolean {
  return WITHDRAWN_OFFER_PATH_SET.has(normalizeOfferPath(pathname));
}

export function isPolishOfferPath(pathname: string): boolean {
  return normalizeOfferPath(pathname).startsWith("/pl/");
}

export function withdrawnOfferCopy(polish: boolean) {
  return polish
    ? {
        title: "Ta oferta została wycofana",
        body: "WitnessOps nie oferuje już tego przeglądu. Aktualne przeglądy i kontakt są poniżej.",
        links: [
          ["/pl/reviews/agent-action-security-review", "Agent Action Security Review"],
          ["/pl/reviews/external-attack-surface-review", "External Attack Surface Review"],
          ["/pl/contact", "Kontakt"],
        ] as const,
      }
    : {
        title: "This offer has been withdrawn",
        body: "WitnessOps no longer offers this review. The current reviews and contact are below.",
        links: [
          ["/reviews/agent-action-security-review", "Agent Action Security Review"],
          ["/reviews/external-attack-surface-review", "External Attack Surface Review"],
          ["/contact", "Contact"],
        ] as const,
      };
}
