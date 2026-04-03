"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDocsUrl, getSurfaceUrl } from "@public-surfaces/config";
import { MobileNavbarMenu } from "./mobile-navbar-menu";
import { OffsecMark } from "./witnessops-mark";

const WITNESSOPS_HOME_URL = getSurfaceUrl("witnessops").replace(/\/$/, "");
const WITNESSOPS_DOCS_URL = getDocsUrl("witnessops");

interface NavbarProps {
  links: { label: string; href: string }[];
  cta: { label: string; href: string; variant: string };
  announcement: { enabled: boolean; text: string; href: string };
}

export function Navbar({ links, cta, announcement }: NavbarProps) {
  const pathname = usePathname();
  const isDocsRoute = pathname?.startsWith("/docs") ?? false;
  const logoHref = isDocsRoute ? WITNESSOPS_HOME_URL : "/";
  const resolvedLinks = isDocsRoute
    ? links.map((link) => ({
        ...link,
        href:
          link.href === "/docs"
            ? WITNESSOPS_DOCS_URL
            : `${WITNESSOPS_HOME_URL}${link.href}`,
      }))
    : links;
  const resolvedCta = isDocsRoute
    ? { ...cta, href: `${WITNESSOPS_HOME_URL}${cta.href}` }
    : cta;

  return (
    <>
      {announcement.enabled && (
        <div className="bg-brand-accent/10 border-b border-brand-accent/20">
          <div className="mx-auto max-w-content px-6">
            <a
              href={announcement.href}
              className="flex items-center justify-center gap-2 py-2 text-xs text-brand-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
            >
              <span className="font-medium">{announcement.text}</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      )}
      <nav className="sticky top-0 z-50 border-b border-surface-border/50 bg-surface-bg/95 backdrop-blur transition-all duration-300 supports-[backdrop-filter]:bg-surface-bg/80 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-brand-accent/20 after:to-transparent">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Link
            href={logoHref}
            className="flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
          >
            <OffsecMark variant="hex" size="sm" />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted"
              style={{ fontFamily: "var(--font-display)" }}
            >
              WitnessOps
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-8 md:flex">
              {resolvedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-1.5 text-[0.82rem] font-medium tracking-[0.04em] text-text-muted transition-colors hover:bg-white/[0.03] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={resolvedCta.href}
                className="hidden h-8 items-center px-5 bg-brand-accent text-text-inverse text-[11px] font-semibold uppercase tracking-[0.14em] transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,107,53,0.35)] active:scale-[0.97] md:inline-flex"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {resolvedCta.label}
              </Link>
            </div>
            <MobileNavbarMenu links={resolvedLinks} cta={resolvedCta} />
          </div>
        </div>
      </nav>
    </>
  );
}
