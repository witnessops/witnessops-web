"use client";

import { PublicNavigationLink as Link } from "./document-navigation";
import { usePathname } from "next/navigation";
import { usesPublicPresentation } from "@/lib/public-presentation";
import { useLayoutEffect, useRef } from "react";
import { DesktopNavbarMenu } from "./desktop-navbar-menu";
import { PUBLIC_NAV_GROUPS } from "./public-nav-groups";
import { MobileNavbarMenu } from "./mobile-navbar-menu";
import { ThemeToggle } from "./theme-toggle";
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

export function Navbar({ announcement, signupUrl: _signupUrl = null, appUrl = null }: NavbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const currentPath = pathname || "/";
  const polish = isPolishPath(currentPath);
  const logoHref = polish ? "/pl" : "/";
  const effectiveLinks = polish ? [...POLISH_PUBLIC_NAV.links] : [
    { label: "How the app works", href: "/early-access" },
    { label: "Reviews", href: "/reviews" },
    { label: "Pricing", href: "/pricing" },
    { label: "Tool · not a review", href: "/check" },
    { label: "Docs", href: "/docs" },
  ];
  const effectiveCta = polish ? {
    label: POLISH_PUBLIC_NAV.cta.label,
    href: POLISH_PUBLIC_NAV.cta.href,
    variant: POLISH_PUBLIC_NAV.cta.variant,
  } : {
    label: "Request an agent review",
    href: "/review/request",
    variant: "primary",
  };
  const loginHref = appUrl ? new URL("/login", appUrl).href : null;
  const effectiveAnnouncement = announcement;

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
      "hidden min-h-11 items-center whitespace-nowrap rounded-sm px-4 text-sm font-semibold uppercase tracking-[0.12em] transition-all duration-200 motion-reduce:transform-none lg:inline-flex lg:px-2 lg:tracking-[0.04em] xl:px-4 xl:tracking-[0.12em]";

    if (variant === "secondary") {
      return `${baseClassName} border border-surface-border bg-transparent text-text-primary hover:border-brand-accent/40 hover:bg-surface-card`;
    }

    if (variant === "ghost") {
      return `${baseClassName} text-text-muted hover:bg-surface-bg-alt hover:text-text-primary`;
    }

    return `${baseClassName} border border-brand-accent bg-brand-accent text-text-inverse hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98]`;
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
              className="flex items-center justify-center gap-2 py-2 text-xs text-brand-accent hover:underline"
            >
              <span className="font-medium">{effectiveAnnouncement.text}</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      )}
      <nav
        data-public-presentation={usesPublicPresentation(currentPath) ? "quiet" : undefined}
        ref={navRef}
        aria-label={polish ? "Nawigacja główna" : "Primary navigation"}
        className="mobile-brand-navbar public-shell simple-public-navbar sticky top-0 z-50 border-b border-surface-border bg-surface-bg pt-[env(safe-area-inset-top)] text-text-primary lg:pt-0"
      >
        <div className="wo-navbar-bar mx-auto flex max-w-[1320px] flex-wrap items-center justify-between px-4 sm:px-6 lg:flex-nowrap">
          <Link
            href={logoHref}
            aria-label={polish ? "WitnessOps: strona główna" : "WitnessOps home"}
            className="mobile-brand-lockup group flex min-h-11 shrink-0 items-center gap-0 rounded-xs text-text-primary transition-colors"
          >
            {/* Canonical SVG master. next/image would re-encode it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/witnessops-logo-system-v1/svg/witnessops-horizontal-black.svg"
              alt="WitnessOps"
              width={1500}
              height={420}
              className="wo-lockup wo-lockup--black"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/witnessops-logo-system-v1/svg/witnessops-horizontal-white.svg"
              alt=""
              width={1500}
              height={420}
              className="wo-lockup wo-lockup--white"
            />
          </Link>

          <div className="contents lg:flex lg:items-center lg:gap-3">
            <div className={polish ? "hidden items-center gap-4 lg:flex lg:gap-1.5 xl:gap-5" : "hidden items-center gap-4 lg:flex lg:gap-1 xl:gap-5"}>
              {!polish ? <DesktopNavbarMenu /> : effectiveLinks.map((link) =>
                isExternalHref(link.href) ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-sm border border-transparent px-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:-translate-y-px hover:border-surface-border-strong hover:bg-surface-card hover:text-text-primary motion-reduce:transform-none xl:px-3"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={currentPath === link.href ? "page" : undefined}
                    className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-sm border px-2 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:border-surface-border-strong hover:bg-surface-card hover:text-text-primary motion-reduce:transform-none xl:px-3 ${
                      currentPath === link.href
                        ? "border-surface-border-strong bg-surface-inset text-text-primary"
                        : "border-transparent text-text-secondary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <ThemeToggle locale={polish ? "pl" : "en"} />
              {loginHref ? <a href={loginHref} className="hidden min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-sm text-text-secondary lg:inline-flex xl:px-3">{polish ? "Zaloguj się" : "Log in"}</a> : null}
              {effectiveCta && (isExternalHref(effectiveCta.href) ? (
                <a
                  href={effectiveCta.href}
                  data-public-primary-cta
                  aria-current={currentPath === effectiveCta?.href ? "page" : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`${desktopCtaClassName}${polish ? " lg:px-2 xl:px-4" : ""}`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {effectiveCta.label}
                </a>
              ) : (
                <Link
                  href={effectiveCta.href}
                  data-public-primary-cta
                  aria-current={currentPath === effectiveCta?.href ? "page" : undefined}
                  className={`${desktopCtaClassName}${polish ? " lg:px-2 xl:px-4" : ""}`}
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
