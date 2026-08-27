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

const HOME_NAV_LINKS = [
  { label: "Agent Risk & Control Review", href: "/catalog/workflows" },
  { label: "How it works", href: "/#evidence-questions" },
  { label: "Action receipt", href: "/#agent-action-receipt" },
];

const HOME_NAV_LINKS_PL = [
  { label: "Agent Risk & Control Review", href: "/catalog/workflows" },
  { label: "Jak to działa", href: "/pl#evidence-questions" },
  { label: "Zapis działania", href: "/pl#agent-action-receipt" },
];

const BUYER_NAV_CTA = {
  label: "Start a review",
  href: "/review/request",
  variant: "primary",
};

const HOME_NAV_CTA = {
  label: "Bring one workflow",
  href: "/review/request",
  variant: "primary",
};

const HOME_NAV_CTA_PL = {
  label: "Zgłoś jeden workflow",
  href: "/pl/review/request",
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
  const homeNav = currentPath === "/" || currentPath === "/pl";
  const productJourneyNav = homeNav;

  const logoHref = "/";
  const effectiveLinks = homeNav
    ? polish
      ? HOME_NAV_LINKS_PL
      : HOME_NAV_LINKS
    : polish
      ? [...POLISH_PUBLIC_NAV.links]
      : BUYER_NAV_LINKS;
  const effectiveCta = productJourneyNav
    ? polish
      ? HOME_NAV_CTA_PL
      : HOME_NAV_CTA
    : polish
      ? POLISH_PUBLIC_NAV.cta
      : BUYER_NAV_CTA;
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
      "hidden min-h-11 items-center whitespace-nowrap rounded-md px-4 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg motion-reduce:transform-none lg:inline-flex";

    if (productJourneyNav) {
      return `${baseClassName} border border-brand-accent bg-brand-accent text-text-inverse shadow-[0_8px_24px_rgba(242,122,61,0.16)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_30px_rgba(242,122,61,0.28)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_5px_16px_rgba(242,122,61,0.18)]`;
    }

    if (variant === "secondary") {
      return `${baseClassName} border border-surface-border bg-transparent text-text-primary hover:border-brand-accent/40 hover:bg-surface-card`;
    }

    if (variant === "ghost") {
      return `${baseClassName} text-text-muted hover:bg-surface-bg-alt hover:text-text-primary`;
    }

    return `${baseClassName} bg-text-primary text-surface-bg hover:bg-[#2b2b25] active:bg-[#37372f]`;
  }

  const desktopCtaClassName = `${getDesktopCtaClassName(effectiveCta.variant)} ${
    currentPath === effectiveCta.href
      ? "ring-2 ring-brand-accent ring-offset-2 ring-offset-surface-bg"
      : ""
  }`;

  return (
    <>
      {effectiveAnnouncement.enabled && (
        <div className="public-shell border-b border-brand-accent/20 bg-brand-accent/10">
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
        className="public-shell sticky top-0 z-50 border-b border-surface-border bg-surface-bg text-text-primary"
        data-home-nav={homeNav ? "true" : undefined}
        data-product-journey-nav={productJourneyNav ? "true" : undefined}
      >
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Link
            href={logoHref}
            aria-label={polish ? "WitnessOps — strona główna" : "WitnessOps home"}
            className="group flex min-h-11 shrink-0 items-center gap-2 rounded text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            <WitnessOpsMark
              variant="mark"
              size="sm"
              tone="current"
              decorative
              className="text-text-primary max-md:scale-[0.93]"
            />
            <span
              className="max-[420px]:hidden text-[11px] font-semibold uppercase tracking-[0.14em] leading-none text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
              aria-hidden="true"
            >
              {brandLabel}
            </span>
            {productJourneyNav ? (
              <span
                aria-hidden="true"
                className="ml-2 hidden border-l border-surface-border pl-4 text-[0.68rem] font-medium tracking-[0.04em] text-text-muted transition-colors group-hover:text-text-secondary lg:inline"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Proof beats memory.
              </span>
            ) : null}
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
                    className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md border border-transparent px-3 text-[0.78rem] font-medium text-text-secondary transition-all duration-200 hover:-translate-y-px hover:border-surface-border-strong hover:bg-surface-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent motion-reduce:transform-none"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={currentPath === link.href ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-md border px-3 text-[0.78rem] font-medium transition-all duration-200 hover:-translate-y-px hover:border-surface-border-strong hover:bg-surface-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent motion-reduce:transform-none ${
                      currentPath === link.href
                        ? "border-surface-border-strong bg-surface-inset text-text-primary"
                        : "border-transparent text-text-secondary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <Link
                href={languageLink.href}
                hrefLang={polish ? "en" : "pl"}
                className="inline-flex min-h-11 items-center rounded-md border border-surface-border-strong px-2.5 text-[11px] font-semibold text-text-secondary transition-all duration-200 hover:-translate-y-px hover:border-brand-accent hover:bg-brand-accent/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent motion-reduce:transform-none"
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
              productJourneyNav={productJourneyNav}
              openLabel={polish ? "Otwórz główną nawigację" : "Open primary navigation"}
              closeLabel={polish ? "Zamknij główną nawigację" : "Close primary navigation"}
            />
          </div>
        </div>
      </nav>
    </>
  );
}
