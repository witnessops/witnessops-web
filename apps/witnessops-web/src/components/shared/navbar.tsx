"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNavbarMenu } from "./mobile-navbar-menu";
import { WitnessOpsMark } from "./witnessops-mark";

const LIBRARY_NAV_LINKS = [
  { label: "Start here", href: "/library/start-here" },
  { label: "Notes", href: "/library/notes" },
  { label: "Reviews", href: "/library/reviews" },
  { label: "Frameworks", href: "/library/frameworks" },
  { label: "Docs", href: "/docs" },
];

const LIBRARY_NAV_CTA = {
  label: "Verify",
  href: "/verify",
  variant: "secondary",
};

interface NavbarProps {
  links: { label: string; href: string }[];
  cta: { label: string; href: string; variant: string };
  announcement: { enabled: boolean; text: string; href: string };
}

export function Navbar({ links, cta, announcement }: NavbarProps) {
  const pathname = usePathname();

  const isDocsRoute = pathname?.startsWith("/docs") ?? false;
  const LIBRARY_ROUTES = ["/library"];
  const isLibrarySurface =
    !isDocsRoute &&
    LIBRARY_ROUTES.some((r) =>
      r === "/" ? pathname === "/" : (pathname?.startsWith(r) ?? false),
    );

  const logoHref = "/";
  const effectiveLinks = isLibrarySurface ? LIBRARY_NAV_LINKS : links;
  const effectiveCta = isLibrarySurface ? LIBRARY_NAV_CTA : cta;
  const effectiveAnnouncement = isLibrarySurface
    ? { enabled: false, text: "", href: "" }
    : announcement;
  const brandLabel = "WitnessOps";

  function isExternalHref(href: string) {
    return href.startsWith("https://") || href.startsWith("http://");
  }

  function getDesktopCtaClassName(variant: string) {
    const baseClassName =
      "hidden h-8 items-center px-5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg md:inline-flex";

    if (variant === "secondary") {
      return `${baseClassName} border border-surface-border bg-transparent text-text-primary hover:border-brand-accent/40 hover:bg-surface-card`;
    }

    if (variant === "ghost") {
      return `${baseClassName} text-text-muted hover:bg-white/[0.03] hover:text-text-primary`;
    }

    return `${baseClassName} bg-brand-accent text-text-inverse hover:opacity-90 active:opacity-80`;
  }

  const desktopCtaClassName = getDesktopCtaClassName(effectiveCta.variant);

  return (
    <>
      {effectiveAnnouncement.enabled && (
        <div className="bg-brand-accent/10 border-b border-brand-accent/20">
          <div className="mx-auto max-w-content px-6">
            <a
              href={effectiveAnnouncement.href}
              className="flex items-center justify-center gap-2 py-2 text-xs text-brand-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
            >
              <span className="font-medium">{effectiveAnnouncement.text}</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      )}
      <nav className="sticky top-0 z-50 border-b border-surface-border/50 bg-surface-bg/95 backdrop-blur supports-[backdrop-filter]:bg-surface-bg/80 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-brand-accent/20 after:to-transparent">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Link
            href={logoHref}
            className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
          >
            <WitnessOpsMark variant="hex" size="sm" />
            <span
              className="max-[420px]:hidden text-[11px] font-semibold uppercase tracking-[0.14em] leading-none text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {brandLabel}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-8 md:flex">
              {effectiveLinks.map((link) =>
                isExternalHref(link.href) ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full px-3 py-1.5 text-[0.82rem] font-medium tracking-[0.04em] text-text-muted transition-colors hover:bg-white/[0.03] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full px-3 py-1.5 text-[0.82rem] font-medium tracking-[0.04em] text-text-muted transition-colors hover:bg-white/[0.03] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                  >
                    {link.label}
                  </Link>
                ),
              )}
              {isExternalHref(effectiveCta.href) ? (
                <a
                  href={effectiveCta.href}
                  target="_blank"
                  rel="noreferrer"
                  className={desktopCtaClassName}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {effectiveCta.label}
                </a>
              ) : (
                <Link
                  href={effectiveCta.href}
                  className={desktopCtaClassName}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {effectiveCta.label}
                </Link>
              )}
            </div>
            <MobileNavbarMenu links={effectiveLinks} cta={effectiveCta} />
          </div>
        </div>
      </nav>
    </>
  );
}
