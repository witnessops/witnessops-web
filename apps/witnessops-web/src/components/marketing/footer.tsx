"use client";

import { PublicNavigationLink as Link } from "@/components/shared/document-navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { ThemeMemory } from "@/components/marketing/theme-memory";
import {
  COMPANY_COPYRIGHT,
  COMPANY_DETAILS,
  COMPANY_DETAILS_HREF,
} from "@/lib/company-details";
import { buyerServiceById, buyerServiceRequestHref } from "@/lib/buyer-services";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { isPolishPath } from "@/lib/public-i18n";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { reviewRequestHrefForLocation } from "@/lib/review-request-context";
import { sovereignAssistantPublished } from "@/lib/sovereign-release";

const DOCS_PUBLIC_HREF = "/docs";
const DOCS_PL_HREF = "/pl/docs";
const MEDIA_KIT_HREF = { en: "/media-kit", pl: "/pl/media-kit" } as const;
const GITHUB_PROFILE_HREF = "https://github.com/witnessops";
const AGENT_ACTION_REVIEW = buyerServiceById(PUBLIC_AGENT_ACTION_REVIEW_ID);

function lockedOfferFooterLinks(locale: "en" | "pl"): FooterLink[] {
  return [
    {
      label: PUBLIC_AGENT_ACTION_OFFER.name[locale],
      href: buyerServiceRequestHref(locale, AGENT_ACTION_REVIEW),
    },
    {
      label: EXTERNAL_ATTACK_SURFACE_OFFER.name[locale],
      href: locale === "pl"
        ? "/pl/reviews/external-attack-surface-review"
        : "/reviews/external-attack-surface-review",
    },
  ];
}

const POLISH_SERVICE_LINKS = lockedOfferFooterLinks("pl");
const ENGLISH_SERVICE_LINKS = lockedOfferFooterLinks("en");
const FOOTER_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-xs text-sm font-medium leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline ";
const FOOTER_LEGAL_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-xs text-xs leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline ";
const FOOTER_NAV_STYLE = { fontFamily: "var(--font-sans)", letterSpacing: "0" };
const PREMIUM_FOOTER_SUBLINE = "Proof other people can check.";

type FooterLink = { label: string; href: string };

export function footerResourceLinks(): FooterLink[] {
  return [
    { label: "Sample work", href: "/review/sample-cases" },
    { label: "Research", href: "/research" },
    ...(sovereignAssistantPublished() ? [{ label: "Ask Sovereign", href: "/docs/assistant" }] : []),
    { label: "Verify a receipt", href: "/verify" },
  ];
}

interface FooterProps {
  appUrl?: string | null;
  brand_line: string;
  subline: string;
  links: FooterLink[];
  legal_links: FooterLink[];
  build_label: string;
  copyright: string;
}

const POLISH_FOOTER = {
  subline: "Weryfikacja bezpieczeństwa z jasnymi ustaleniami, materiałami źródłowymi i praktycznymi kolejnymi krokami.",
  links: [
    { label: "Podejście", href: "/pl/why-witnessops" },
    { label: "Badania i artykuły (EN)", href: "/research" },
    { label: "Przykładowe prace", href: "/review/sample-cases" },
    { label: "Dokumentacja", href: DOCS_PL_HREF },
    { label: "Sprawdź zapis", href: "/pl/verify" },
  ],
  legal_links: [
    { label: "Prywatność", href: "/pl/privacy" },
    { label: "Warunki", href: "/pl/terms" },
    { label: "Bezpieczeństwo", href: "/pl/security" },
  ],
};

const SERVICE_NAV_HREFS = new Set([
  "/why-witnessops",
  "/pl/why-witnessops",
]);

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

export function Footer({
  links,
  legal_links,
  build_label,
}: FooterProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = pathname || "/";
  const isPolishSurface = isPolishPath(path);
  const reviewRequestHref = reviewRequestHrefForLocation(
    isPolishSurface ? "pl" : "en", path, searchParams,
  );
  const content = isPolishSurface ? POLISH_FOOTER : { subline: PREMIUM_FOOTER_SUBLINE, links, legal_links };
  const navigationLinks = content.links.filter((link) => !isFooterRequestHref(link.href));
  const groups = isPolishSurface ? [
    {
      label: "Usługi",
      links: [
        ...POLISH_SERVICE_LINKS,
        ...navigationLinks.filter((link) => SERVICE_NAV_HREFS.has(link.href)),
      ],
    },
    {
      label: isPolishSurface ? "Zasoby" : "Resources",
      links: navigationLinks.filter((link) => !SERVICE_NAV_HREFS.has(link.href)),
    },
  ] : [
    { label: "Product", links: [
      ...ENGLISH_SERVICE_LINKS,
      { label: "Pricing", href: "/pricing" },
      { label: "How it works", href: "/how-it-works" },
    ] },
    { label: "Resources", links: footerResourceLinks() },
  ];

  function renderLink(link: FooterLink, className: string) {
    const href = resolveFooterHref(link.href);
    return isExternalFooterHref(href) ? (
      <a key={href} href={href} target="_blank" rel="noreferrer"
        className={`${className} max-w-full min-w-0 whitespace-normal`} style={FOOTER_NAV_STYLE}>
        {link.label}
      </a>
    ) : (
      <Link key={href} href={href} prefetch={false} className={`${className} max-w-full min-w-0 whitespace-normal`} style={FOOTER_NAV_STYLE}>
        {link.label}
      </Link>
    );
  }

  return (
    <footer
      id="site-footer"
      className="public-shell public-footer border-t border-surface-border bg-surface-bg simple-public-footer"
      data-brand-footer="approved-2026-07-30"
      data-footer-surface={isLibraryPath(path) ? "library" : isPolishSurface ? "pl-buyer" : "en-buyer"}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-6 lg:py-9">
        <div className="footer-main">
          <div data-footer-brand-lockup>
            <Link
              href={isPolishSurface ? "/pl" : "/"}
              aria-label={isPolishSurface ? "WitnessOps: strona główna" : "WitnessOps home"}
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
            <p className="max-w-[320px] text-sm leading-relaxed text-text-secondary">
              {content.subline}
            </p>
          </div>

          <div className="footer-navigation grid grid-cols-2 gap-x-6 gap-y-8">
            {groups.map((group) => (
              <nav key={group.label} aria-label={group.label}>
                <p className="footer-heading mb-1">
                  {group.label}
                </p>
                <div className="flex flex-col items-start">
                  {group.links.map((link) => renderLink(link, FOOTER_LINK_CLASS))}
                </div>
              </nav>
            ))}
          </div>

          <div className="footer-contact min-w-0">
            <p className="footer-heading">{isPolishSurface ? "Kontakt" : "Contact"}</p>
            <PublicContactRoute compact premium locale={isPolishSurface ? "pl" : "en"}
              primaryHref={reviewRequestHref} />
          </div>

          <div className="footer-theme">
            <ThemeMemory />
          </div>
        </div>

        <div className="footer-legal mt-5 flex flex-col items-start justify-between gap-2 border-t border-surface-border pt-3 md:flex-row md:items-center md:pr-32 lg:mt-7">
          <div className="flex flex-wrap gap-x-4">
            {content.legal_links.map((link) => renderLink(link, FOOTER_LEGAL_LINK_CLASS))}
            <Link
              href={COMPANY_DETAILS_HREF[isPolishSurface ? "pl" : "en"]}
              className={FOOTER_LEGAL_LINK_CLASS}
              style={FOOTER_NAV_STYLE}
              data-company-details-link={isPolishSurface ? "pl" : "en"}
            >
              {COMPANY_DETAILS[isPolishSurface ? "pl" : "en"].heading}
            </Link>
            <Link
              href={MEDIA_KIT_HREF[isPolishSurface ? "pl" : "en"]}
              className={FOOTER_LEGAL_LINK_CLASS}
              style={FOOTER_NAV_STYLE}
            >
              {isPolishSurface ? "Zestaw dla mediów" : "Media kit"}
            </Link>
            <a href={GITHUB_PROFILE_HREF} target="_blank" rel="noreferrer"
              aria-label={isPolishSurface
                ? "WitnessOps na GitHub (otwiera nową kartę)"
                : "WitnessOps on GitHub (opens in a new tab)"}
              className={FOOTER_LEGAL_LINK_CLASS} style={FOOTER_NAV_STYLE}>
              GitHub
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs leading-5 text-text-secondary">
            {isPublicBuildLabel(build_label) ? <span>{build_label}</span> : null}
            <span data-company-copyright="">{COMPANY_COPYRIGHT}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
