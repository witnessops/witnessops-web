/** Offer URLs that stay in the repo but are no longer served. */
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
] as const;

const WITHDRAWN_OFFER_PATH_SET = new Set<string>(WITHDRAWN_OFFER_PATHS);

export function normalizeOfferPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isWithdrawnOfferPath(pathname: string): boolean {
  return WITHDRAWN_OFFER_PATH_SET.has(normalizeOfferPath(pathname));
}

/**
 * /reviews is not a page yet. Point at the two current offer locations and contact.
 */
function continuationLinks(polish: boolean): string {
  const links = polish
    ? [
        ["/pl/catalog#agent-action-security-review", "Agent Action Security Review"],
        ["/pl/catalog/offsec-external-exposure", "External Attack Surface Review"],
        ["/pl/contact", "Kontakt"],
      ]
    : [
        ["/catalog#agent-action-security-review", "Agent Action Security Review"],
        ["/catalog/offsec-external-exposure", "External Attack Surface Review"],
        ["/contact", "Contact"],
      ];
  return links
    .map(
      ([href, label]) =>
        `<li><a href="${href}">${label}</a></li>`,
    )
    .join("");
}

export function withdrawnOfferDocument(pathname: string): string {
  const polish = normalizeOfferPath(pathname).startsWith("/pl/");
  const title = polish ? "Ta oferta została wycofana" : "This offer has been withdrawn";
  const body = polish
    ? "WitnessOps nie oferuje już tego przeglądu. Aktualne przeglądy i kontakt są poniżej."
    : "WitnessOps no longer offers this review. The current reviews and contact are below.";
  const home = polish ? "/pl" : "/";

  return `<!DOCTYPE html>
<html lang="${polish ? "pl" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; background: #0b0c0b; color: #f5f1e8; font-family: Inter, system-ui, sans-serif; }
    main { max-width: 42rem; margin: 0 auto; padding: 4rem 1.5rem 5rem; }
    a { color: #b89b62; }
    .mark { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; }
    h1 { font-size: 2.4rem; line-height: 1.05; letter-spacing: -0.03em; font-weight: 600; }
    p { color: #c3bfb6; line-height: 1.7; }
    ul { padding: 0; list-style: none; }
    li { margin: 0.75rem 0; }
  </style>
</head>
<body>
  <main id="main-content">
    <p class="mark"><a href="${home}">WitnessOps</a></p>
    <h1>${title}</h1>
    <p>${body}</p>
    <ul>${continuationLinks(polish)}</ul>
  </main>
</body>
</html>`;
}
