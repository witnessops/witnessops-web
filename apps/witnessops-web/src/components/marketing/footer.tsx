"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getSurfaceUrl } from "@witnessops/config";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { WitnessOpsMark } from "@/components/shared/witnessops-mark";
import { isPolishPath } from "@/lib/public-i18n";

/** Apex English how-to path (not the legacy docs.witnessops.com host). */
const DOCS_PUBLIC_HREF = "/docs";
/** Polish buyer docs island on the same apex origin. */
const DOCS_PL_HREF = "/pl/docs";

const LIBRARY_PRIMARY_HREFS = new Set([
  "/library",
  "/pl/library",
  "/docs",
  DOCS_PUBLIC_HREF,
  DOCS_PL_HREF,
  "/review",
  "/review/request",
  "/pl/review/request",
  "/review/sample-cases",
  "/review/sample-report",
  "/verify",
  "/pl/verify",
]);
const LIBRARY_QUIET_HREFS = new Set<string>();
const GITHUB_PROFILE_HREF = "https://github.com/witnessops";
const FOOTER_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-xs font-medium leading-5 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";
const FOOTER_LOW_EMPHASIS_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-xs leading-5 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";
const FOOTER_LEGAL_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-xs leading-5 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";
const FOOTER_MONO_STYLE = {
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.06em",
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
    "Public entry points for docs, reviews, verifier fixtures, explanatory sample cases, and the illustrative sample report.",
  links: [
    { label: "Library", href: "/library" },
    { label: "Docs", href: DOCS_PUBLIC_HREF },
    { label: "Review", href: "/review" },
    { label: "Start a review", href: "/review/request" },
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
    "Publiczne punkty wejścia do dokumentacji, przeglądów, fixture weryfikatora, przykładowych przypadków i ilustracyjnego raportu.",
  links: [
    { label: "Biblioteka", href: "/pl/library" },
    { label: "Dokumentacja", href: DOCS_PL_HREF },
    { label: "Przegląd", href: "/review" },
    { label: "Rozpocznij przegląd", href: "/pl/review/request" },
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
    "Ograniczone zakresowo przeglądy bezpieczeństwa i operacji z odwołaniami do materiałów, jasno wskazanymi ograniczeniami i praktycznym przekazaniem wyniku.",
  links: [
    { label: "Usługi", href: "/pl/catalog" },
    {
      label: "Customer Security Review",
      href: "/pl/customer-security-review",
    },
    { label: "Dlaczego WitnessOps", href: "/pl/why-witnessops" },
    { label: "Weryfikacja", href: "/pl/verify" },
    { label: "Dokumentacja", href: DOCS_PL_HREF },
    { label: "Biblioteka", href: "/pl/library" },
    { label: "Rozpocznij przegląd", href: "/pl/review/request" },
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

function resolveFooterHref(href: string): string {
  const docsResolved = resolveDocsHref(href);
  if (!docsResolved.startsWith("/")) return docsResolved;
  return getSurfaceUrl("witnessops", docsResolved);
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
  const path = pathname || "/";
  const isPolishSurface = isPolishPath(path);
  const librarySurface = isLibraryPath(path);

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
      links: links.map((link) =>
        link.href === "/docs" || link.href.startsWith("/docs/")
          ? { ...link, href: DOCS_PUBLIC_HREF }
          : link,
      ),
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
      ? "Operacje poparte dowodami"
      : "Proof-backed operations";

  function toHref(href: string) {
    if (librarySurface) {
      // Library may use absolute docs host; leave absolute URLs as-is.
      if (href.startsWith("https://") || href.startsWith("http://")) return href;
      return resolveDocsHref(href);
    }
    return resolveFooterHref(href);
  }

  function isExternalHref(href: string) {
    return href.startsWith("https://") || href.startsWith("http://");
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
    const baseStyle = FOOTER_MONO_STYLE;

    if (!librarySurface || !LIBRARY_QUIET_HREFS.has(href)) {
      return baseStyle;
    }

    return { ...baseStyle, color: "var(--color-text-secondary)", opacity: 0.92 };
  }

  const showBuild = isPublicBuildLabel(content.build_label);

  return (
    <footer
      className="public-shell border-t border-surface-border bg-surface-bg"
      data-brand-footer="approved-2026-07-30"
      data-footer-surface={librarySurface ? "library" : isPolishSurface ? "pl-buyer" : "en-buyer"}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-10 sm:py-12">
        <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between md:gap-8">
          <div data-footer-brand-lockup>
            <div className="mb-2 flex min-h-11 items-center gap-3">
              <WitnessOpsMark
                variant="mark"
                size="md"
                tone="current"
                decorative
                className="shrink-0 text-text-primary"
              />
              <p
                className="text-sm font-semibold uppercase tracking-[0.12em] text-text-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {content.brand_line}
              </p>
            </div>
            <span
              className="mb-2 flex items-center gap-2 text-xs leading-5 text-text-secondary"
              style={FOOTER_MONO_STYLE}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal-green" />
              {statusLabel}
            </span>
            <p className="max-w-[320px] text-sm leading-relaxed text-text-secondary">
              {content.subline}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-0 sm:gap-x-6">
            {content.links.map((link) => {
              const href = toHref(link.href);
              const className = getRootLinkClassName(link.href);
              const style = getRootLinkStyle(link.href);
              return isExternalHref(href) ? (
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
        </div>

        <div className="mt-8 max-w-xl [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:rounded-sm [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-brand-accent">
          <PublicContactRoute compact locale={isPolishSurface ? "pl" : "en"} />
        </div>

        <div className="mt-7 flex flex-col items-start justify-between gap-4 border-t border-surface-border pt-5 sm:mt-8 sm:gap-3 sm:pt-6 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-x-4 gap-y-0">
            {content.legal_links.map((link) => {
              const href = toHref(link.href);
              return isExternalHref(href) ? (
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
            className="flex items-center gap-3 text-xs leading-5 text-text-secondary"
            style={FOOTER_MONO_STYLE}
          >
            {showBuild ? (
              <>
                <span>{content.build_label}</span>
                <span className="text-text-muted">·</span>
              </>
            ) : null}
            <span>{content.copyright}</span>
          </div>
        </div>

        <div
          className="mt-5 text-center text-[11px] font-medium leading-5 tracking-[0.08em] text-text-muted sm:mt-6"
          style={FOOTER_MONO_STYLE}
          data-footer-motto="proof-beats-memory"
        >
          {content.motto}
        </div>
      </div>
    </footer>
  );
}
