"use client";

import { PublicNavigationLink as Link } from "@/components/shared/document-navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { ThemeMemory } from "@/components/marketing/theme-memory";
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
const X_PROFILE_HREF = "https://x.com/witnessops";
const GITHUB_ICON_PATH = "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z";
const X_ICON_PATH = "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z";

type FooterLink = { label: string; href: string };
type FooterGroup = { id: string; label: string; links: FooterLink[] };

/**
 * Footer after the 2026-11-13 cleanup: one review, one request action, company
 * links and a legal line; press material moved to /about.
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
        { label: "About", href: "/about" },
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
    x: "WitnessOps on X (@witnessops, opens in a new tab)",
  },
  // Przegląd, Firma, O nas (EN) and the CTA lead are new PL strings pending native review.
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
        { label: "O nas (EN)", href: "/about" },
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
    x: "WitnessOps na X (@witnessops, otwiera nową kartę)",
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
      data-footer-version="cleanup-2026-11-13"
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
            <ThemeMemory compact />
            <div className="inline-flex">
              <a href={GITHUB_PROFILE_HREF} target="_blank" rel="noopener noreferrer" aria-label={copy.github} title={copy.github} className={FOOTER_ICON_CLASS}>
                <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={GITHUB_ICON_PATH} /></svg>
              </a>
              <a href={X_PROFILE_HREF} target="_blank" rel="noopener noreferrer" aria-label={copy.x} title={copy.x} className={FOOTER_ICON_CLASS}>
                <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={X_ICON_PATH} /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
