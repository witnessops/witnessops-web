"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { WitnessOpsMark } from "@/components/shared/witnessops-mark";
import { isPolishPath } from "@/lib/public-i18n";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { reviewRequestHrefForLocation } from "@/lib/review-request-context";

const DOCS_PUBLIC_HREF = "/docs";
const DOCS_PL_HREF = "/pl/docs";
const MEDIA_KIT_HREF = "/media-kit";
const GITHUB_PROFILE_HREF = "https://github.com/witnessops";
const FOOTER_MOTTO = "Proof beats memory.";
const FOOTER_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-sm font-medium leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg";
const FOOTER_LEGAL_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-xs leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg";
const FOOTER_NAV_STYLE = { fontFamily: "var(--font-sans)", letterSpacing: "0" };
const FOOTER_DISPLAY_STYLE = { fontFamily: "var(--font-display)" };

type FooterLink = { label: string; href: string };

interface FooterProps {
  brand_line: string;
  subline: string;
  links: FooterLink[];
  legal_links: FooterLink[];
  build_label: string;
  copyright: string;
}

const POLISH_FOOTER = {
  subline: "Przeglądy bezpieczeństwa i weryfikacja AI, automatyzacji i systemów operacyjnych. Jasne ustalenia, materiały źródłowe i praktyczne kolejne kroki.",
  links: [
    { label: "Usługi", href: "/pl/catalog" },
    { label: "Naprawa i przekazanie", href: "/pl/catalog/automation-repair" },
    { label: "Podejście", href: "/pl/why-witnessops" },
    { label: "Sprawdź zapis", href: "/pl/verify" },
    { label: "Dokumentacja", href: DOCS_PL_HREF },
    { label: "Biblioteka", href: "/pl/library" },
    { label: "Więcej przykładów (EN)", href: "/review/sample-cases" },
  ],
  legal_links: [
    { label: "Prywatność", href: "/privacy" },
    { label: "Warunki", href: "/terms" },
    { label: "Bezpieczeństwo", href: "/security" },
  ],
};

const SERVICE_NAV_HREFS = new Set([
  "/catalog/automation-repair",
  "/pl/catalog/automation-repair",
  "/catalog",
  "/pl/catalog",
  PRIMARY_OFFER.route,
  PRIMARY_OFFER.route + "#sample-review",
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
  brand_line,
  subline,
  links,
  legal_links,
  build_label,
  copyright,
}: FooterProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = pathname || "/";
  const isPolishSurface = isPolishPath(path);
  const reviewRequestHref = reviewRequestHrefForLocation(
    isPolishSurface ? "pl" : "en", path, searchParams,
  );
  const content = isPolishSurface ? POLISH_FOOTER : { subline, links, legal_links };
  const navigationLinks = content.links.filter((link) => !isFooterRequestHref(link.href));
  const groups = [
    {
      label: isPolishSurface ? "Usługi" : "Services",
      links: navigationLinks.filter((link) => SERVICE_NAV_HREFS.has(link.href)),
    },
    {
      label: isPolishSurface ? "Zasoby" : "Resources",
      links: navigationLinks.filter((link) => !SERVICE_NAV_HREFS.has(link.href)),
    },
  ];

  function renderLink(link: FooterLink, className: string) {
    const href = resolveFooterHref(link.href);
    return isExternalFooterHref(href) ? (
      <a key={href} href={href} target="_blank" rel="noreferrer"
        className={className} style={FOOTER_NAV_STYLE}>
        {link.label}
      </a>
    ) : (
      <Link key={href} href={href} className={className} style={FOOTER_NAV_STYLE}>
        {link.label}
      </Link>
    );
  }

  return (
    <footer
      id="site-footer"
      className="public-shell public-footer border-t border-surface-border-strong bg-surface-bg"
      data-brand-footer="approved-2026-07-30"
      data-footer-surface={isLibraryPath(path) ? "library" : isPolishSurface ? "pl-buyer" : "en-buyer"}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-6 lg:py-9">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
          <div data-footer-brand-lockup>
            <Link
              href={isPolishSurface ? "/pl" : "/"}
              aria-label={isPolishSurface ? "WitnessOps: strona główna" : "WitnessOps home"}
              className="mb-2 inline-flex min-h-11 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              <WitnessOpsMark variant="mark" size="md" tone="current" decorative
                className="shrink-0 text-text-primary" />
              <span className="text-sm font-semibold uppercase tracking-[0.12em] text-text-primary"
                style={FOOTER_DISPLAY_STYLE}>
                {brand_line}
              </span>
            </Link>
            <p className="max-w-[320px] text-sm leading-relaxed text-text-secondary">
              {content.subline}
            </p>
          </div>

          <div className="order-3 grid grid-cols-2 gap-x-5 lg:order-2">
            {groups.map((group) => (
              <nav key={group.label} aria-label={group.label}>
                <p className="mb-1 text-sm font-semibold text-text-primary"
                  style={FOOTER_DISPLAY_STYLE}>
                  {group.label}
                </p>
                <div className="flex flex-col items-start">
                  {group.links.map((link) => renderLink(link, FOOTER_LINK_CLASS))}
                </div>
              </nav>
            ))}
          </div>

          <div className="order-2 min-w-0 lg:order-3">
            <PublicContactRoute compact locale={isPolishSurface ? "pl" : "en"}
              primaryHref={reviewRequestHref} />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start justify-between gap-2 border-t border-surface-border pt-3 md:flex-row md:items-center md:pr-32 lg:mt-7">
          <div className="flex flex-wrap gap-x-4">
            {content.legal_links.map((link) => renderLink(link, FOOTER_LEGAL_LINK_CLASS))}
            {!isPolishSurface ? (
              <Link href={MEDIA_KIT_HREF} className={FOOTER_LEGAL_LINK_CLASS}
                style={FOOTER_NAV_STYLE}>Media kit</Link>
            ) : null}
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
            <span>{copyright}</span>
            <span aria-hidden="true">·</span>
            <span data-footer-motto="proof-beats-memory">{FOOTER_MOTTO}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
