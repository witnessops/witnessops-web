"use client";

import { PublicNavigationLink as Link } from "@/components/shared/document-navigation";
import { usePathname, useSearchParams } from "next/navigation";
import {
  COMPANY_DETAILS,
  COMPANY_DETAILS_HREF,
  COMPANY_LEGAL_LINE,
} from "@/lib/company-details";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_SALES_REVIEW_EMAIL, salesReviewMailto } from "@/lib/public-contact";
import { isPolishPath, localizedHref } from "@/lib/public-i18n";
import { reviewRequestHrefForLocation } from "@/lib/review-request-context";

const DOCS_PUBLIC_HREF = "/docs";
const DOCS_PL_HREF = "/pl/docs";
const GITHUB_PROFILE_HREF = "https://github.com/witnessops";
const GITHUB_ICON_PATH = "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z";

/*
 * "Tested on agents built with" marks (footer bundle B, Design 2026-11-13).
 * Paths are unchanged from the sources; only the fill is currentColor so the marks can sit in muted ivory.
 * - xAI mark: the swoosh from the https://x.ai homepage SVG (viewBox 40 0 2176 831).
 * - Codex mark: https://agents.md/logos/codex.svg
 *   (also https://github.com/agentsmd/agents.md/blob/main/public/logos/codex.svg), original fill #0D0D0D.
 * Nominative use only: no partnership, endorsement or sponsorship is claimed.
 */
const XAI_HREF = "https://x.ai";
const CODEX_HREF = "https://openai.com/codex/";
const XAI_MARK_PATH = "M352 522 57 305H308L490 436Q417 478 352 522ZM766 831 545 668Q619 612 670 576L1018 831ZM294 831H40L70 803Q208 668 450.5 506.5Q693 345 1145.5 190Q1598 35 2216 0Q1995 19 1684.5 88.5Q1374 158 989 339Q604 520 294 831Z";
const CODEX_MARK_PATHS = [
  { d: "M16.0005 13.5992C16.4972 13.5995 16.9007 14.0029 16.9009 14.4996C16.9009 14.9965 16.4974 15.3997 16.0005 15.4H13.0005C12.5035 15.4 12.1002 14.9967 12.1002 14.4996C12.1004 14.0027 12.5036 13.5992 13.0005 13.5992H16.0005Z" },
  { d: "M8.03765 8.72811C8.46377 8.47284 9.01638 8.61074 9.27203 9.03671L10.6177 11.2789C10.8836 11.7221 10.8834 12.277 10.6177 12.7203L9.27203 14.9625C9.01633 15.3887 8.46385 15.5267 8.03765 15.2711C7.61143 15.0153 7.47333 14.4629 7.72906 14.0367L8.95074 11.9996L7.72906 9.96249C7.47341 9.53628 7.61146 8.98382 8.03765 8.72811Z" },
  { d: "M9.3316 2.03768C11.1644 1.54688 13.0268 2.04668 14.356 3.20174C16.0859 2.86512 17.9511 3.36418 19.2935 4.70663C20.6356 6.04882 21.1326 7.91288 20.7964 9.64217C21.9527 10.9716 22.4534 12.8349 21.9625 14.6685C21.4711 16.5025 20.1051 17.8657 18.439 18.439C17.8658 20.1047 16.503 21.47 14.6695 21.9615C12.8356 22.4528 10.9727 21.9519 9.64312 20.7955C7.91371 21.1319 6.04993 20.635 4.70757 19.2926C3.36558 17.9505 2.86659 16.0866 3.20269 14.357C2.04693 13.0273 1.54757 11.1638 2.03863 9.33065C2.52997 7.49759 3.89436 6.13282 5.56011 5.55917C6.13382 3.8935 7.49837 2.52891 9.3316 2.03768ZM13.2623 4.63534C12.3606 3.80149 11.067 3.4361 9.79742 3.77596C8.52745 4.11626 7.58924 5.0796 7.22515 6.25253C7.08145 6.71575 6.71753 7.07928 6.25445 7.22323C5.08133 7.58702 4.11844 8.52622 3.77789 9.79647C3.43759 11.0667 3.80148 12.3606 4.63531 13.2623C4.96467 13.6184 5.09776 14.1154 4.99078 14.5885C4.71939 15.7864 5.05109 17.0891 5.98101 18.0191C6.91085 18.949 8.21345 19.2801 9.41168 19.0084L9.58941 18.9791C9.94695 18.9432 10.3065 19.0397 10.5982 19.2496L10.7378 19.3639L10.9117 19.5142C11.8015 20.2407 13.0127 20.5413 14.2037 20.2223C15.4733 19.8818 16.4111 18.9191 16.775 17.7457C16.9189 17.2824 17.2832 16.9186 17.7466 16.775L17.9634 16.6998C19.0376 16.2923 19.9051 15.3936 20.2242 14.2027C20.5641 12.9328 20.1989 11.6385 19.3648 10.7369C19.0353 10.3806 18.9021 9.88399 19.0093 9.41073L19.0533 9.18514C19.2372 8.0514 18.8917 6.85176 18.0201 5.98006C17.0901 5.05003 15.7865 4.71826 14.5884 4.98983C14.1153 5.09712 13.6186 4.96467 13.2623 4.63534Z", evenOdd: true },
] as const;

type FooterLink = { label: string; href: string };
type FooterGroup = { id: string; label: string; links: FooterLink[] };

/**
 * Footer after the 2026-11-13 cleanup and footer bundle B: one review, one request
 * action, company links (About became Docs), a "Tested on agents built with" strip
 * and a legal line. Dark only, so there is no theme control. Press material lives
 * on the Company details page.
 */
const FOOTER_COPY = {
  en: {
    subline: "We try to break one AI agent action, then show you what got through and the evidence.",
    cta: "Request a break test",
    emailLead: "or email",
    groups: [
      { id: "footer-review-heading", label: "The review", links: [
        { label: PUBLIC_AGENT_ACTION_OFFER.name.en, href: "/reviews/agent-action-security-review" },
        { label: "How it works", href: "/how-it-works" },
        { label: "Examples", href: "/review/sample-cases" },
      ] },
      { id: "footer-company-heading", label: "Company", links: [
        { label: "Docs", href: "/docs" },
        { label: "Security", href: "/security" },
        { label: COMPANY_DETAILS.en.heading, href: COMPANY_DETAILS_HREF.en },
      ] },
    ] satisfies FooterGroup[],
    legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
    home: "WitnessOps home",
    language: "Language",
    github: "WitnessOps on GitHub (opens in a new tab)",
    testedWith: "Tested on agents built with",
    xai: "xAI",
    codex: "OpenAI Codex",
  },
  // Przegląd, Firma, Dokumentacja, Testujemy agentów zbudowanych na and the CTA lead are new PL strings pending native review.
  pl: {
    subline: "Jedno ważne działanie agenta. Pisemny raport i jasno opisane ograniczenia.",
    cta: "Poproś o test przełamania",
    emailLead: "Lub napisz:",
    groups: [
      { id: "footer-review-heading", label: "Przegląd", links: [
        { label: PUBLIC_AGENT_ACTION_OFFER.name.pl, href: "/pl/reviews/agent-action-security-review" },
        { label: "Podejście", href: "/pl/why-witnessops" },
        { label: "Przykłady (EN)", href: "/review/sample-cases" },
      ] },
      { id: "footer-company-heading", label: "Firma", links: [
        { label: "Dokumentacja", href: "/pl/docs" },
        { label: "Bezpieczeństwo", href: "/pl/security" },
        { label: COMPANY_DETAILS.pl.heading, href: COMPANY_DETAILS_HREF.pl },
      ] },
    ] satisfies FooterGroup[],
    legal: [
      { label: "Prywatność", href: "/pl/privacy" },
      { label: "Warunki", href: "/pl/terms" },
    ],
    home: "WitnessOps: strona główna",
    language: "Język",
    github: "WitnessOps na GitHub (otwiera nową kartę)",
    testedWith: "Testujemy agentów zbudowanych na",
    xai: "xAI",
    codex: "OpenAI Codex",
  },
} as const;

/** Every footer link and button keeps a 44×44 tap target. */
const FOOTER_LINK_CLASS =
  "inline-flex min-h-11 min-w-11 items-center rounded-xs text-sm font-medium leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline";
const FOOTER_LEGAL_LINK_CLASS =
  "inline-flex min-h-11 min-w-11 items-center rounded-xs text-xs leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline";
const FOOTER_ICON_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xs text-text-secondary transition-colors hover:text-text-primary";
const FOOTER_NAV_STYLE = { fontFamily: "var(--font-sans)", letterSpacing: "0" };

interface FooterProps {
  appUrl?: string | null;
  brand_line: string;
  subline: string;
  links: FooterLink[];
  legal_links: FooterLink[];
  build_label: string;
  copyright: string;
}

export function isLibraryPath(pathname: string): boolean {
  return pathname === "/library" || pathname.startsWith("/library/") ||
    pathname === "/pl/library" || pathname.startsWith("/pl/library/");
}

function isPublicBuildLabel(label: string): boolean {
  const value = label.trim();
  return Boolean(value) && !/^(?:build|wersja):\s*static$/i.test(value);
}

/** Keep local links on the current origin and preserve the Polish docs island. */
export function resolveFooterHref(href: string): string {
  if (href === "/docs/") return DOCS_PUBLIC_HREF;
  if (href === "/pl/docs/") return DOCS_PL_HREF;
  return href;
}

export function isExternalFooterHref(href: string): boolean {
  return href.startsWith("https://") || href.startsWith("http://");
}

/** The enquiry belongs to the single footer action, including selected-offer URLs. */
export function isFooterRequestHref(href: string): boolean {
  const path = href.split(/[?#]/)[0];
  return path === "/review/request" || path === "/pl/review/request";
}

/** Footer navigation for a locale (exported for tests). */
export function footerGroups(locale: "en" | "pl"): readonly FooterGroup[] {
  return FOOTER_COPY[locale].groups;
}

export function Footer({ build_label }: FooterProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = pathname || "/";
  const locale = isPolishPath(path) ? "pl" : "en";
  const copy = FOOTER_COPY[locale];
  const reviewRequestHref = reviewRequestHrefForLocation(locale, path, searchParams);
  // Keep the query on paired pages so a selected-offer or fit-call request survives the switch.
  const search = searchParams?.toString() ?? "";
  const englishHref = localizedHref(path, search, "en");
  const polishHref = localizedHref(path, search, "pl");

  return (
    <footer
      id="site-footer"
      className="public-shell public-footer border-t border-surface-border bg-surface-bg simple-public-footer"
      data-brand-footer="approved-2026-07-30"
      data-footer-version="bundle-b-2026-11-13"
      data-footer-surface={isLibraryPath(path) ? "library" : locale === "pl" ? "pl-buyer" : "en-buyer"}
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="footer-main">
          <div data-footer-brand-lockup>
            <Link
              href={locale === "pl" ? "/pl" : "/"}
              aria-label={copy.home}
              className="mb-2 inline-flex min-h-11 items-center gap-0 rounded-xs"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/witnessops-logo-system-v1/svg/witnessops-horizontal-black.svg"
                alt="WitnessOps"
                width={1500}
                height={420}
                className="wo-lockup wo-lockup--footer wo-lockup--black"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/witnessops-logo-system-v1/svg/witnessops-horizontal-white.svg"
                alt=""
                width={1500}
                height={420}
                className="wo-lockup wo-lockup--footer wo-lockup--white"
              />
            </Link>
            <p className="footer-subline">{copy.subline}</p>
            <Link href={reviewRequestHref} prefetch={false} className="footer-cta" data-footer-review-cta>
              {copy.cta}
            </Link>
            <p className="footer-email" data-footer-email>
              {copy.emailLead}{" "}
              <a href={salesReviewMailto()} className="footer-email-link">{PUBLIC_SALES_REVIEW_EMAIL}</a>
            </p>
          </div>

          {copy.groups.map((group) => (
            <nav key={group.id} aria-labelledby={group.id} className="footer-column">
              <h2 id={group.id} className="footer-heading">{group.label}</h2>
              <ul className="flex flex-col items-start">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={resolveFooterHref(link.href)}
                      prefetch={false}
                      className={FOOTER_LINK_CLASS}
                      style={FOOTER_NAV_STYLE}
                      data-company-details-link={link.href === COMPANY_DETAILS_HREF[locale] ? locale : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer-tested" data-footer-tested>
          <p className="footer-tested-label">{copy.testedWith}</p>
          <ul className="footer-tested-marks">
            <li>
              <a href={XAI_HREF} target="_blank" rel="noopener noreferrer" aria-label={copy.xai} title={copy.xai} className="footer-tested-link" data-footer-tested-mark="xai">
                <svg aria-hidden="true" focusable="false" viewBox="40 0 2176 831" fill="currentColor" className="footer-tested-xai"><path d={XAI_MARK_PATH} /></svg>
              </a>
            </li>
            <li>
              <a href={CODEX_HREF} target="_blank" rel="noopener noreferrer" aria-label={copy.codex} title={copy.codex} className="footer-tested-link" data-footer-tested-mark="codex">
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" className="footer-tested-codex">
                  {CODEX_MARK_PATHS.map((path) => (
                    <path key={path.d.slice(0, 16)} d={path.d} fill="currentColor" fillRule={"evenOdd" in path ? "evenodd" : undefined} clipRule={"evenOdd" in path ? "evenodd" : undefined} />
                  ))}
                </svg>
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-legal" data-footer-legal>
          <div className="footer-legal-start">
            {copy.legal.map((link) => (
              <Link key={link.href} href={link.href} prefetch={false} className={FOOTER_LEGAL_LINK_CLASS} style={FOOTER_NAV_STYLE}>
                {link.label}
              </Link>
            ))}
            <span data-company-copyright="" data-company-legal-line="">{COMPANY_LEGAL_LINE}</span>
            {isPublicBuildLabel(build_label) ? <span>{build_label}</span> : null}
          </div>
          <div className="footer-legal-end">
            <div role="group" aria-label={copy.language} className="inline-flex items-center" data-footer-language>
              {locale === "pl" ? (
                <span aria-current="true" lang="pl" className={`${FOOTER_LEGAL_LINK_CLASS} justify-center font-semibold text-text-primary`}>PL</span>
              ) : (
                <Link href={polishHref} prefetch={false} hrefLang="pl" lang="pl" aria-label="Polski, wersja polska" className={`${FOOTER_LEGAL_LINK_CLASS} justify-center`}>PL</Link>
              )}
              <span aria-hidden="true" className="text-xs text-text-muted">/</span>
              {locale === "en" ? (
                <span aria-current="true" lang="en" className={`${FOOTER_LEGAL_LINK_CLASS} justify-center font-semibold text-text-primary`}>EN</span>
              ) : (
                <Link href={englishHref} prefetch={false} hrefLang="en" lang="en" aria-label="English version" className={`${FOOTER_LEGAL_LINK_CLASS} justify-center`}>EN</Link>
              )}
            </div>
            <div className="inline-flex">
              <a href={GITHUB_PROFILE_HREF} target="_blank" rel="noopener noreferrer" aria-label={copy.github} title={copy.github} className={FOOTER_ICON_CLASS}>
                <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={GITHUB_ICON_PATH} /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
