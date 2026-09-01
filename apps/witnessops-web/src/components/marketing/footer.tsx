"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { WitnessOpsMark } from "@/components/shared/witnessops-mark";
import { buyerPublicOfferRequestHref } from "@/lib/buyer-services";
import { isPolishPath } from "@/lib/public-i18n";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { reviewRequestHrefForLocation } from "@/lib/review-request-context";

/** Apex English how-to path (not the legacy docs.witnessops.com host). */
const DOCS_PUBLIC_HREF = "/docs";
/** Polish buyer docs island on the same apex origin. */
const DOCS_PL_HREF = "/pl/docs";
const PRIMARY_REQUEST_EN = buyerPublicOfferRequestHref("en", PRIMARY_OFFER.id);
const PRIMARY_REQUEST_PL = buyerPublicOfferRequestHref("pl", PRIMARY_OFFER.id);

const LIBRARY_PRIMARY_HREFS = new Set([
  "/library",
  "/pl/library",
  "/docs",
  DOCS_PUBLIC_HREF,
  DOCS_PL_HREF,
  "/review",
  "/review/request",
  "/pl/review/request",
  PRIMARY_REQUEST_EN,
  PRIMARY_REQUEST_PL,
  "/review/sample-cases",
  "/review/sample-report",
  "/verify",
  "/pl/verify",
]);
const LIBRARY_QUIET_HREFS = new Set<string>();
const MEDIA_KIT_HREF = "/media-kit";
const GITHUB_PROFILE_HREF = "https://github.com/witnessops";
const FOOTER_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-sm font-medium leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg";
const FOOTER_LOW_EMPHASIS_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-sm leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg";
const FOOTER_LEGAL_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-xs leading-5 text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg";
const FOOTER_MONO_STYLE = {
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.06em",
};
const FOOTER_NAV_STYLE = {
  fontFamily: "var(--font-sans)",
  letterSpacing: "0",
};
const FOOTER_DISPLAY_STYLE = {
  fontFamily: "var(--font-display)",
};

/** Same motto on every footer surface (EN + PL chrome). No locale variant. */
const FOOTER_MOTTO = "Proof beats memory.";

interface FooterProps {
  brand_line: string;
  subline: string;
  links: { label: string; href: string }[];
  legal_links: { label: string; href: string }[];
  build_label: string;
  copyright: string;
}

type FooterContent = FooterProps & { motto: string };

/** Library surface: /library and /pl/library (not commercial PL buyer chrome). */
export function isLibraryPath(pathname: string): boolean {
  return (
    pathname === "/library" ||
    pathname.startsWith("/library/") ||
    pathname === "/pl/library" ||
    pathname.startsWith("/pl/library/")
  );
}

function isPublicBuildLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  // Operator residue — never show on public footer.
  if (/^build:\s*static$/i.test(t)) return false;
  if (/^wersja:\s*static$/i.test(t)) return false;
  return true;
}

/**
 * Normalize docs links: EN stays `/docs…`, PL stays `/pl/docs…`.
 * Never rewrite Polish docs onto English `/docs`, and never use the legacy host.
 */
function resolveDocsHref(href: string): string {
  if (href === "/pl/docs" || href.startsWith("/pl/docs/")) {
    return href === "/pl/docs/" ? DOCS_PL_HREF : href;
  }
  if (href === "/docs" || href.startsWith("/docs/")) {
    return href === "/docs/" ? DOCS_PUBLIC_HREF : href;
  }
  return href;
}

const LIBRARY_FOOTER_EN: FooterContent = {
  brand_line: "WitnessOps",
  subline:
    "Public entry points for documentation, reviews, verification and synthetic examples.",
  links: [
    { label: "Skills", href: "/library" },
    { label: "Docs", href: DOCS_PUBLIC_HREF },
    { label: "Review", href: "/review" },
    { label: "Start a non-secret fit check", href: PRIMARY_REQUEST_EN },
    { label: "Sample cases", href: "/review/sample-cases" },
    { label: "Sample report", href: "/review/sample-report" },
    { label: "Verify", href: "/verify" },
  ],
  legal_links: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Security", href: "/security" },
  ],
  build_label: "",
  copyright: "© WitnessOps",
  motto: FOOTER_MOTTO,
};

const LIBRARY_FOOTER_PL: FooterContent = {
  brand_line: "WitnessOps",
  subline:
    "Publiczne punkty wejścia do dokumentacji, przeglądów, weryfikacji i przykładów syntetycznych.",
  links: [
    { label: "Biblioteka", href: "/pl/library" },
    { label: "Dokumentacja", href: DOCS_PL_HREF },
    { label: "Przegląd", href: "/review" },
    {
      label: "Rozpocznij wstępną ocenę bez informacji poufnych",
      href: PRIMARY_REQUEST_PL,
    },
    { label: "Przykładowe przypadki", href: "/review/sample-cases" },
    { label: "Przykładowy raport", href: "/review/sample-report" },
    { label: "Weryfikacja", href: "/pl/verify" },
  ],
  legal_links: [
    { label: "Prywatność", href: "/privacy" },
    { label: "Warunki", href: "/terms" },
    { label: "Bezpieczeństwo", href: "/security" },
  ],
  build_label: "",
  copyright: "© WitnessOps",
  motto: FOOTER_MOTTO,
};

const POLISH_FOOTER: FooterContent = {
  brand_line: "WitnessOps",
  subline:
    "Ograniczone zakresowo przeglądy istotnych działań AI i bezpieczeństwa ze wskazanymi wymaganiami dowodowymi, jasnymi ograniczeniami i praktycznym przekazaniem wyniku.",
  links: [
    { label: "Usługi", href: "/pl/catalog" },
    {
      label: PRIMARY_OFFER.name.pl,
      href: PRIMARY_OFFER.route,
    },
    { label: "Dlaczego WitnessOps", href: "/pl/why-witnessops" },
    { label: "Weryfikacja", href: "/pl/verify" },
    { label: "Dokumentacja", href: DOCS_PL_HREF },
    { label: "Biblioteka", href: "/pl/library" },
    {
      label: "Rozpocznij wstępną ocenę bez informacji poufnych",
      href: PRIMARY_REQUEST_PL,
    },
  ],
  legal_links: [
    { label: "Prywatność", href: "/privacy" },
    { label: "Warunki", href: "/terms" },
    { label: "Bezpieczeństwo", href: "/security" },
  ],
  build_label: "",
  copyright: "© WitnessOps",
  motto: FOOTER_MOTTO,
};

export function resolveFooterHref(href: string): string {
  // Same-app routes must stay path-relative so local, dev, and production
  // previews preserve their current origin. True external destinations pass
  // through unchanged and are rendered as external anchors below.
  return resolveDocsHref(href);
}

export function isExternalFooterHref(href: string): boolean {
  return href.startsWith("https://") || href.startsWith("http://");
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
  const librarySurface = isLibraryPath(path);
  const reviewRequestHref = reviewRequestHrefForLocation(
    isPolishSurface ? "pl" : "en",
    path,
    searchParams,
  );

  const content = useMemo((): FooterContent => {
    if (librarySurface) {
      return isPolishSurface ? LIBRARY_FOOTER_PL : LIBRARY_FOOTER_EN;
    }
    if (isPolishSurface) {
      return POLISH_FOOTER;
    }
    // Buyer EN: rewrite Docs to canonical host; suppress STATIC build label.
    return {
      brand_line,
      subline,
      links: links.map((link) => {
        if (link.href === PRIMARY_OFFER.route) {
          return { ...link, label: PRIMARY_OFFER.name.en };
        }
        if (link.href === "/docs" || link.href.startsWith("/docs/")) {
          return { ...link, href: DOCS_PUBLIC_HREF };
        }
        return link;
      }),
      legal_links,
      build_label: isPublicBuildLabel(build_label) ? build_label : "",
      copyright,
      motto: FOOTER_MOTTO,
    };
  }, [
    brand_line,
    subline,
    links,
    legal_links,
    build_label,
    copyright,
    librarySurface,
    isPolishSurface,
  ]);

  const statusLabel = librarySurface
    ? isPolishSurface
      ? "Publiczne punkty wejścia"
      : "Public entry points"
    : isPolishSurface
      ? "Ograniczona rekonstrukcja"
      : "Bounded reconstruction";

  function toHref(href: string) {
    if (librarySurface) {
      // Library may use absolute docs host; leave absolute URLs as-is.
      if (href.startsWith("https://") || href.startsWith("http://")) return href;
      return resolveDocsHref(href);
    }
    return resolveFooterHref(href);
  }

  function getRootLinkClassName(href: string) {
    if (!librarySurface) {
      return FOOTER_LINK_CLASS;
    }

    if (LIBRARY_PRIMARY_HREFS.has(href)) {
      return "inline-flex min-h-11 items-center rounded-sm text-xs font-medium text-text-primary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";
    }

    return FOOTER_LOW_EMPHASIS_LINK_CLASS;
  }

  function getRootLinkStyle(href: string) {
    const baseStyle = FOOTER_NAV_STYLE;

    if (!librarySurface || !LIBRARY_QUIET_HREFS.has(href)) {
      return baseStyle;
    }

    return { ...baseStyle, color: "var(--color-text-secondary)", opacity: 0.92 };
  }

  const showBuild = isPublicBuildLabel(content.build_label);
  const navigationLinks = content.links.filter(
    (link) =>
      link.href !== "/review/request" && link.href !== "/pl/review/request",
  );
  const navigationLabel = isPolishSurface ? "Przejdź do" : "Explore";

  return (
    <footer
      className="public-shell public-footer border-t border-surface-border-strong bg-surface-bg"
      data-brand-footer="approved-2026-07-30"
      data-footer-surface={librarySurface ? "library" : isPolishSurface ? "pl-buyer" : "en-buyer"}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-5 sm:py-7 lg:py-9">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(280px,3fr)] lg:gap-8">
          <div data-footer-brand-lockup>
            <div className="mb-2 flex items-center gap-3">
              <WitnessOpsMark
                variant="mark"
                size="md"
                tone="current"
                decorative
                className="shrink-0 text-text-primary"
              />
              <p
                className="text-sm font-semibold uppercase tracking-[0.12em] text-text-primary"
                style={FOOTER_DISPLAY_STYLE}
              >
                {content.brand_line}
              </p>
            </div>
            <span
              className="mb-2 flex items-center gap-2 text-xs leading-5 text-text-secondary"
              style={FOOTER_MONO_STYLE}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted" />
              {statusLabel}
            </span>
            <p className="max-w-[320px] text-sm leading-relaxed text-text-secondary">
              {content.subline}
            </p>
          </div>

          <nav aria-label={navigationLabel}>
            <p
              className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-text-primary"
              style={FOOTER_DISPLAY_STYLE}
            >
              {navigationLabel}
            </p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-0">
              {navigationLinks.map((link) => {
                const href = toHref(link.href);
                const className = getRootLinkClassName(link.href);
                const style = getRootLinkStyle(link.href);
                return isExternalFooterHref(link.href) ? (
                  <a
                    key={`${link.label}:${link.href}`}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                    style={style}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={`${link.label}:${link.href}`}
                    href={href}
                    className={className}
                    style={style}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="min-w-0">
            <PublicContactRoute
              compact
              locale={isPolishSurface ? "pl" : "en"}
              primaryHref={reviewRequestHref}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start justify-between gap-1.5 border-t border-surface-border pt-4 sm:mt-6 sm:gap-2 sm:pt-5 md:flex-row md:items-center md:pr-32 lg:mt-7">
          <div className="flex flex-wrap gap-x-4 gap-y-0">
            {content.legal_links.map((link) => {
              const href = toHref(link.href);
              return isExternalFooterHref(link.href) ? (
                <a
                  key={`${link.label}:${link.href}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={FOOTER_LEGAL_LINK_CLASS}
                  style={FOOTER_MONO_STYLE}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={`${link.label}:${link.href}`}
                  href={href}
                  className={FOOTER_LEGAL_LINK_CLASS}
                  style={FOOTER_MONO_STYLE}
                >
                  {link.label}
                </Link>
              );
            })}
            {!isPolishSurface ? (
              <Link
                href={toHref(MEDIA_KIT_HREF)}
                className={FOOTER_LEGAL_LINK_CLASS}
                style={FOOTER_MONO_STYLE}
              >
                Media kit
              </Link>
            ) : null}
            <a
              href={GITHUB_PROFILE_HREF}
              target="_blank"
              rel="noreferrer"
              aria-label="WitnessOps on GitHub (opens in a new tab)"
              className={FOOTER_LEGAL_LINK_CLASS}
              style={FOOTER_MONO_STYLE}
            >
              GitHub
            </a>
          </div>
          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs leading-5 text-text-secondary"
            style={FOOTER_MONO_STYLE}
          >
            {showBuild ? (
              <>
                <span>{content.build_label}</span>
                <span className="text-text-muted">·</span>
              </>
            ) : null}
            <span>{content.copyright}</span>
            <span aria-hidden="true" className="text-text-muted">·</span>
            <span data-footer-motto="proof-beats-memory">
              {content.motto}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
