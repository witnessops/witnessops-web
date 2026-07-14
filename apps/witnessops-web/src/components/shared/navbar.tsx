"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { MobileNavbarMenu } from "./mobile-navbar-menu";
import { WitnessOpsMark } from "./witnessops-mark";
import {
  isPolishPath,
  localizedPath,
  POLISH_PUBLIC_NAV,
} from "@/lib/public-i18n";

const BUYER_NAV_LINKS = [
  { label: "Services", href: "/catalog" },
  { label: "Customer Security Review", href: "/customer-security-review" },
  { label: "Library", href: "/library" },
  { label: "Why WitnessOps", href: "/why-witnessops" },
];

const BUYER_NAV_CTA = {
  label: "Start a Review",
  href: "/review/request",
  variant: "primary",
};

interface NavbarProps {
  links: { label: string; href: string }[];
  cta: { label: string; href: string; variant: string };
  announcement: { enabled: boolean; text: string; href: string };
}

export function Navbar({ announcement }: NavbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const currentPath = pathname || "/";
  const polish = isPolishPath(currentPath);

  const logoHref = "/";
  const effectiveLinks = polish ? [...POLISH_PUBLIC_NAV.links] : BUYER_NAV_LINKS;
  const effectiveCta = polish ? POLISH_PUBLIC_NAV.cta : BUYER_NAV_CTA;
  const effectiveAnnouncement = announcement;
  const languageLink = polish
    ? { label: "EN", href: localizedPath(currentPath, "en") }
    : { label: "PL", href: localizedPath(currentPath, "pl") };
  const brandLabel = "WitnessOps";

  useLayoutEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const updateNavbarHeight = () => {
      const measuredHeight = navElement.offsetHeight;
      document.documentElement.style.setProperty(
        "--app-navbar-height",
        `${measuredHeight}px`,
      );
    };

    updateNavbarHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateNavbarHeight();
    });
    resizeObserver.observe(navElement);
    window.addEventListener("resize", updateNavbarHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateNavbarHeight);
    };
  }, [pathname, effectiveAnnouncement.enabled]);

  function isExternalHref(href: string) {
    return href.startsWith("https://") || href.startsWith("http://");
  }

  function getDesktopCtaClassName(variant: string) {
    const baseClassName =
      "hidden min-h-11 items-center whitespace-nowrap rounded-sm px-4 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:inline-flex";

    if (variant === "secondary") {
      return `${baseClassName} border border-surface-border bg-transparent text-text-primary hover:border-brand-accent/40 hover:bg-surface-card`;
    }

    if (variant === "ghost") {
      return `${baseClassName} text-text-muted hover:bg-white/[0.03] hover:text-text-primary`;
    }

    return `${baseClassName} bg-white text-black hover:bg-neutral-200 active:bg-neutral-300`;
  }

  const desktopCtaClassName = `${getDesktopCtaClassName(effectiveCta.variant)} ${
    currentPath === effectiveCta.href
      ? "ring-2 ring-brand-accent ring-offset-2 ring-offset-black"
      : ""
  }`;

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
      <nav
        ref={navRef}
        className="sticky top-0 z-50 border-b border-white/15 bg-black text-white"
      >
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Link
            href={logoHref}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <WitnessOpsMark variant="hex" size="sm" className="max-md:scale-[0.93]" />
            <span
              className="max-[420px]:hidden text-[11px] font-semibold uppercase tracking-[0.14em] leading-none text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {brandLabel}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-4 lg:flex lg:gap-6 xl:gap-8">
              {effectiveLinks.map((link) =>
                isExternalHref(link.href) ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center whitespace-nowrap rounded px-2 text-[0.78rem] font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={currentPath === link.href ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded px-2 text-[0.78rem] font-medium transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      currentPath === link.href
                        ? "bg-white/15 text-white"
                        : "text-white/75"
                    }`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <Link
                href={languageLink.href}
                hrefLang={polish ? "en" : "pl"}
                className="inline-flex min-h-11 items-center rounded border border-white/30 px-2 text-[11px] font-semibold text-white/80 hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {languageLink.label}
              </Link>
              {isExternalHref(effectiveCta.href) ? (
                <a
                  href={effectiveCta.href}
                  aria-current={currentPath === effectiveCta.href ? "page" : undefined}
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
                  aria-current={currentPath === effectiveCta.href ? "page" : undefined}
                  className={desktopCtaClassName}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {effectiveCta.label}
                </Link>
              )}
            </div>
            <MobileNavbarMenu
              links={effectiveLinks}
              cta={effectiveCta}
              utilityLink={languageLink}
              currentPath={currentPath}
              openLabel={polish ? "Otwórz główną nawigację" : "Open primary navigation"}
              closeLabel={polish ? "Zamknij główną nawigację" : "Close primary navigation"}
            />
          </div>
        </div>
      </nav>
    </>
  );
}
