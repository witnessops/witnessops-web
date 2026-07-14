"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getSurfaceUrl } from "@witnessops/config";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { isPolishPath } from "@/lib/public-i18n";

const LIBRARY_PRIMARY_HREFS = new Set([
  "/library",
  "/docs",
  "/review",
  "/review/request",
  "/review/sample-cases",
  "/review/sample-report",
  "/verify",
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

interface FooterProps {
  brand_line: string;
  subline: string;
  links: { label: string; href: string }[];
  legal_links: { label: string; href: string }[];
  build_label: string;
  copyright: string;
}

const LIBRARY_FOOTER: FooterProps & { motto: string } = {
  brand_line: "WitnessOps",
  subline:
    "Public entry points for docs, security-workflow review, verifier fixtures, explanatory sample cases, and the illustrative sample report.",
  links: [
    { label: "Library", href: "/library" },
    { label: "Docs", href: "/docs" },
    { label: "Review", href: "/review" },
    { label: "Package Security Workflow", href: "/review/request" },
    { label: "Sample cases", href: "/review/sample-cases" },
    { label: "Sample report", href: "/review/sample-report" },
    { label: "Verify", href: "/verify" },
  ],
  legal_links: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Security", href: "/security" },
  ],
  build_label: "Build: STATIC",
  copyright: "© WitnessOps",
  motto: "Make boundaries legible. Bring receipts.",
};

const POLISH_FOOTER: FooterProps & { motto: string } = {
  brand_line: "WitnessOps",
  subline:
    "Pakiety dowodowe o jasno określonym zakresie dla działań technicznych wymagających zaufania.",
  links: [
    { label: "Usługi", href: "/pl/catalog" },
    {
      label: "Przegląd bezpieczeństwa klienta",
      href: "/pl/customer-security-review",
    },
    { label: "Dlaczego WitnessOps", href: "/pl/why-witnessops" },
    { label: "Weryfikacja", href: "/pl/verify" },
    { label: "Dokumentacja", href: "/pl/docs" },
    { label: "Biblioteka", href: "/pl/library" },
    { label: "Rozpocznij zgłoszenie", href: "/pl/review/request" },
  ],
  legal_links: [
    { label: "Prywatność", href: "/privacy" },
    { label: "Warunki", href: "/terms" },
    { label: "Bezpieczeństwo", href: "/security" },
  ],
  build_label: "Wersja: STATIC",
  copyright: "© WitnessOps",
  motto: "Szanuj granice. Przedstaw potwierdzenia.",
};

function resolveFooterHref(href: string): string {
  if (!href.startsWith("/")) return href;
  return getSurfaceUrl("witnessops", href);
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
  const isPolishSurface = isPolishPath(pathname || "/");

  const LIBRARY_ROUTES = ["/library"];
  const isLibrarySurface =
    LIBRARY_ROUTES.some((r) =>
      r === "/" ? pathname === "/" : (pathname?.startsWith(r) ?? false),
    );

  const content = useMemo(
    () =>
      isLibrarySurface
        ? LIBRARY_FOOTER
        : isPolishSurface
          ? POLISH_FOOTER
        : {
            brand_line,
            subline,
            links,
            legal_links,
            build_label,
            copyright,
            motto: "Respect the boundary. Bring receipts.",
          },
    [
      brand_line,
      subline,
      links,
      legal_links,
      build_label,
      copyright,
      isLibrarySurface,
      isPolishSurface,
    ],
  );

  const statusLabel = isLibrarySurface
    ? "Public entry points"
    : isPolishSurface
      ? "Operacje oparte na dowodach"
      : "Proof-backed operations";

  function toHref(href: string) {
    return isLibrarySurface ? href : resolveFooterHref(href);
  }

  function isExternalHref(href: string) {
    return href.startsWith("https://") || href.startsWith("http://");
  }

  function getRootLinkClassName(href: string) {
    if (!isLibrarySurface) {
      return FOOTER_LINK_CLASS;
    }

    if (LIBRARY_PRIMARY_HREFS.has(href)) {
      return "inline-flex min-h-11 items-center rounded-sm text-xs font-medium text-text-primary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";
    }

    return FOOTER_LOW_EMPHASIS_LINK_CLASS;
  }

  function getRootLinkStyle(href: string) {
    const baseStyle = FOOTER_MONO_STYLE;

    if (
      !isLibrarySurface ||
      !LIBRARY_QUIET_HREFS.has(href)
    ) {
      return baseStyle;
    }

    return { ...baseStyle, color: "var(--color-text-secondary)", opacity: 0.92 };
  }

  return (
    <footer className="border-t border-surface-border bg-surface-bg">
      <div className="mx-auto max-w-[1200px] px-6 py-10 sm:py-12">

        {/* Top row: brand lockup + links */}
        <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between md:gap-8">

          {/* Brand lockup */}
          <div>
            <p
              className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {content.brand_line}
            </p>
            <span
              className="mb-2 flex items-center gap-2 text-xs leading-5 text-text-secondary"
              style={FOOTER_MONO_STYLE}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal-green shadow-[0_0_6px_var(--color-signal-green)]" />
              {statusLabel}
            </span>
            <p className="max-w-[320px] text-sm leading-relaxed text-text-secondary">
              {content.subline}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-5 gap-y-0 sm:gap-x-6">
            {content.links.map((link) => {
              const href = toHref(link.href);
              const className = getRootLinkClassName(link.href);
              const style = getRootLinkStyle(link.href);
              return isExternalHref(href) ? (
                <a
                  key={link.href}
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
                  key={link.href}
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

        {/* Bottom row: legal + copyright */}
        <div className="mt-7 flex flex-col items-start justify-between gap-4 border-t border-surface-border pt-5 sm:mt-8 sm:gap-3 sm:pt-6 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-x-4 gap-y-0">
            {content.legal_links.map((link) => {
              const href = toHref(link.href);
              return isExternalHref(href) ? (
                <a
                  key={link.href}
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
                  key={link.href}
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
            <span>{content.build_label}</span>
            <span className="text-text-muted">·</span>
            <span>{content.copyright}</span>
          </div>
        </div>

        {/* Motto */}
        <div
          className="mt-5 text-center text-xs leading-5 text-text-secondary sm:mt-6"
          style={FOOTER_MONO_STYLE}
        >
          {content.motto}
        </div>
      </div>
    </footer>
  );
}
