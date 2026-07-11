"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getSurfaceUrl } from "@witnessops/config";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";

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
  "text-xs font-medium text-text-secondary transition-colors hover:text-text-primary";
const FOOTER_LOW_EMPHASIS_LINK_CLASS =
  "text-xs text-text-secondary transition-colors hover:text-text-primary";
const FOOTER_LEGAL_LINK_CLASS =
  "text-[11px] text-text-secondary transition-colors hover:text-text-primary";
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

  const LIBRARY_ROUTES = ["/library"];
  const isLibrarySurface =
    LIBRARY_ROUTES.some((r) =>
      r === "/" ? pathname === "/" : (pathname?.startsWith(r) ?? false),
    );

  const content = useMemo(
    () =>
      isLibrarySurface
        ? LIBRARY_FOOTER
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
    ],
  );

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
      return "text-xs font-medium text-text-primary transition-colors hover:text-text-primary";
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
      <div className="mx-auto max-w-[1200px] px-6 py-12">

        {/* Top row: brand lockup + links */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

          {/* Brand lockup */}
          <div>
            <p
              className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {content.brand_line}
            </p>
            <span
              className="mb-2 flex items-center gap-2 text-text-secondary"
              style={{ ...FOOTER_MONO_STYLE, fontSize: 11 }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal-green shadow-[0_0_6px_var(--color-signal-green)]" />
              {isLibrarySurface ? "Public entry points" : "Proof-backed operations"}
            </span>
            <p className="max-w-[320px] text-sm leading-relaxed text-text-secondary">
              {content.subline}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
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

        <div className="mt-8 max-w-xl">
          <PublicContactRoute compact />
        </div>

        {/* Bottom row: legal + copyright */}
        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-surface-border pt-6 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-4">
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
            className="flex items-center gap-3 text-[11px] text-text-secondary"
            style={FOOTER_MONO_STYLE}
          >
            <span>{content.build_label}</span>
            <span className="text-text-muted">·</span>
            <span>{content.copyright}</span>
          </div>
        </div>

        {/* Motto */}
        <div
          className="mt-6 text-center text-[11px] text-text-secondary"
          style={FOOTER_MONO_STYLE}
        >
          {content.motto}
        </div>
      </div>
    </footer>
  );
}
