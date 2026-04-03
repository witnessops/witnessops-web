import Link from "next/link";
import { getSurfaceUrl } from "@public-surfaces/config";

interface FooterProps {
  brand_line: string;
  subline: string;
  links: { label: string; href: string }[];
  legal_links: { label: string; href: string }[];
  build_label: string;
  copyright: string;
}

function resolveFooterHref(href: string): string {
  if (!href.startsWith("/")) return href;
  if (href === "/docs" || href.startsWith("/docs/")) return href;
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
              {brand_line}
            </p>
            <span
              className="flex items-center gap-2 mb-2"
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--color-brand-muted)" }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal-green shadow-[0_0_6px_var(--color-signal-green)]" />
              Proof-backed operations
            </span>
            <p className="max-w-[280px] text-xs leading-relaxed text-text-muted">
              {subline}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={resolveFooterHref(link.href)}
                className="text-xs text-text-muted transition-colors hover:text-text-primary"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom row: legal + copyright */}
        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-surface-border pt-6 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-4">
            {legal_links.map((link) => (
              <Link
                key={link.href}
                href={resolveFooterHref(link.href)}
                className="text-[10px] text-text-muted transition-colors hover:text-text-primary"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div
            className="flex items-center gap-3 text-[10px] text-text-muted"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
          >
            <span>{build_label}</span>
            <span style={{ color: "var(--color-surface-border)" }}>·</span>
            <span>{copyright}</span>
          </div>
        </div>

        {/* Motto */}
        <div
          className="mt-6 text-center"
          style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "var(--color-surface-border)" }}
        >
          Respect the penguin. Bring receipts.
        </div>
      </div>
    </footer>
  );
}
