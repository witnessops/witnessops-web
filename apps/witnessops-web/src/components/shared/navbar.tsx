"use client";

import { PublicNavigationLink as Link } from "./document-navigation";
import { usePathname } from "next/navigation";
import { usesPublicPresentation } from "@/lib/public-presentation";
import { useLayoutEffect, useRef } from "react";
import { DesktopNavbarMenu } from "./desktop-navbar-menu";
import { PUBLIC_NAV_GROUPS } from "./public-nav-groups";
import { MobileNavbarMenu } from "./mobile-navbar-menu";
import { WitnessOpsMark } from "./witnessops-mark";
import {
  isPolishPath,
  POLISH_PUBLIC_NAV,
} from "@/lib/public-i18n";


interface NavbarProps {
  signupUrl?: string | null;
  appUrl?: string | null;
  links: { label: string; href: string }[];
  cta: { label: string; href: string; variant: string };
  announcement: { enabled: boolean; text: string; href: string };
}

export function Navbar({ announcement, signupUrl = null, appUrl = null }: NavbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const currentPath = pathname || "/";
  const polish = isPolishPath(currentPath);
  const logoHref = polish ? "/pl" : "/";
  const effectiveLinks = polish ? [...POLISH_PUBLIC_NAV.links] : [
    { label: "How the app works", href: "/early-access" },
    { label: "Expert help", href: "/catalog" },
    { label: "Price", href: "/pricing" },
    { label: "Free check", href: "/check" },
    { label: "Docs", href: "/docs" },
  ];
  const effectiveCta = polish ? {
    label: signupUrl ? "Sign up" : "Free check",
    href: signupUrl || "/check",
    variant: "primary",
  } : signupUrl ? {
    label: "Sign up",
    href: signupUrl,
    variant: "secondary",
  } : null;
  const effectiveAnnouncement = announcement;
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
      "hidden min-h-11 items-center whitespace-nowrap rounded-md px-4 text-sm font-semibold uppercase tracking-[0.12em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg motion-reduce:transform-none lg:inline-flex";

    if (variant === "secondary") {
      return `${baseClassName} border border-surface-border bg-transparent text-text-primary hover:border-brand-accent/40 hover:bg-surface-card`;
    }

    if (variant === "ghost") {
      return `${baseClassName} text-text-muted hover:bg-surface-bg-alt hover:text-text-primary`;
    }

    return `${baseClassName} border border-brand-accent bg-brand-accent text-text-inverse shadow-[0_8px_24px_rgba(242,122,61,0.16)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_30px_rgba(242,122,61,0.28)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_5px_16px_rgba(242,122,61,0.18)]`;
  }

  const desktopCtaClassName = `${getDesktopCtaClassName(effectiveCta?.variant ?? "secondary")} ${
    currentPath === effectiveCta?.href
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
        data-public-signup-variant={polish ? undefined : "secondary"}
        data-public-presentation={usesPublicPresentation(currentPath) ? "quiet" : undefined}
        ref={navRef}
        aria-label={polish ? "Nawigacja główna" : "Primary navigation"}
        className="mobile-brand-navbar public-shell simple-public-navbar sticky top-0 z-50 border-b border-surface-border bg-surface-bg pt-[env(safe-area-inset-top)] text-text-primary lg:pt-0"
      >
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between px-4 py-2 sm:px-6 lg:flex-nowrap lg:py-4">
          <Link
            href={logoHref}
            aria-label={polish ? "WitnessOps: strona główna" : "WitnessOps home"}
            className="mobile-brand-lockup group flex min-h-11 shrink-0 items-center gap-1.5 rounded text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            <WitnessOpsMark
              variant="mark"
              size="sm"
              tone="current"
              decorative
              className="text-text-primary"
            />
            <span
              className="text-xs font-medium uppercase leading-none tracking-[0.18em] text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
              aria-hidden="true"
            >
              {brandLabel}
            </span>
          </Link>

          <div className="contents lg:flex lg:items-center lg:gap-3">
            <div className="hidden items-center gap-4 lg:flex lg:gap-2 xl:gap-5">
              {!polish ? <DesktopNavbarMenu loginUrl={appUrl ? new URL("/login", appUrl).href : null} /> : effectiveLinks.map((link) =>
                isExternalHref(link.href) ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md border border-transparent px-3 text-sm font-medium text-text-secondary transition-all duration-200 hover:-translate-y-px hover:border-surface-border-strong hover:bg-surface-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent motion-reduce:transform-none"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={currentPath === link.href ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:border-surface-border-strong hover:bg-surface-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent motion-reduce:transform-none ${
                      currentPath === link.href
                        ? "border-surface-border-strong bg-surface-inset text-text-primary"
                        : "border-transparent text-text-secondary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              {effectiveCta && (isExternalHref(effectiveCta.href) ? (
                <a
                  href={effectiveCta.href}
                  data-public-primary-cta
                  aria-current={currentPath === effectiveCta?.href ? "page" : undefined}
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
                  data-public-primary-cta
                  aria-current={currentPath === effectiveCta?.href ? "page" : undefined}
                  className={desktopCtaClassName}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {effectiveCta.label}
                </Link>
              ))}
            </div>
            <MobileNavbarMenu
              loginUrl={appUrl ? new URL("/login", appUrl).href : null}
              links={effectiveLinks}
              groups={polish ? undefined : PUBLIC_NAV_GROUPS}
              cta={effectiveCta}
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
