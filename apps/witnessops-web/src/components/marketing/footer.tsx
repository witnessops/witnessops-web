"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getSurfaceUrl } from "@witnessops/config";

const LIBRARY_PRIMARY_HREFS = new Set([
  "/library",
  "/docs",
  "/review",
  "/review/request",
  "/review/sample-report",
  "/verify",
]);
const LIBRARY_QUIET_HREFS = new Set<string>();
const GITHUB_PROFILE_HREF = "https://github.com/witnessops";

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
    "Structured writing on proof systems, trust boundaries, and verification reasoning.",
  links: [
    { label: "Library", href: "/library" },
    { label: "Docs", href: "/docs" },
    { label: "Review", href: "/review" },
    { label: "Request review", href: "/review/request" },
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
  motto: "Making reasoning inspectable.",
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
            motto: "Respect the penguin. Bring receipts.",
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
      return "text-xs text-text-muted transition-colors hover:text-text-primary";
    }

    if (LIBRARY_PRIMARY_HREFS.has(href)) {
      return "text-xs text-text-primary transition-colors hover:text-text-primary";
    }

    return "text-xs text-text-muted transition-colors hover:text-text-primary";
  }

  function getRootLinkStyle(href: string) {
    const baseStyle = {
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.06em",
    };

    if (
      !isLibrarySurface ||
      !LIBRARY_QUIET_HREFS.has(href)
    ) {
      return baseStyle;
    }

    return { ...baseStyle, color: "var(--color-brand-muted)", opacity: 0.82 };
  }

  return (
    <footer className="border-t border-surface-border bg-surface-bg">
      <div className="mx-auto max-w-[1200px] px-6 py-12">

        {/* Top row: brand lockup + links */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

          {/* Brand lockup */}
          <div>
            <p
              className="text-sm font-semibold uppercase tracking-[0.12em] text-text-primary mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {content.brand_line}
            </p>
            <span
              className="flex items-center gap-2 mb-2"
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--color-brand-muted)" }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal-green shadow-[0_0_6px_var(--color-signal-green)]" />
              {isLibrarySurface ? "Reading library" : "Proof-backed operations"}
            </span>
            <p className="max-w-[280px] text-xs leading-relaxed text-text-muted">
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
                  className="text-[10px] text-text-muted transition-colors hover:text-text-primary"
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={href}
                  className="text-[10px] text-text-muted transition-colors hover:text-text-primary"
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
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
              className="text-[10px] text-text-muted transition-colors hover:text-text-primary"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
            >
              GitHub
            </a>
          </div>
          <div
            className="flex items-center gap-3 text-[10px] text-text-muted"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
          >
            <span>{content.build_label}</span>
            <span style={{ color: "var(--color-surface-border)" }}>·</span>
            <span>{content.copyright}</span>
          </div>
        </div>

        {/* Motto */}
        <div
          className="mt-6 text-center"
          style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "var(--color-surface-border)" }}
        >
          {content.motto}
        </div>
      </div>
    </footer>
  );
}
