"use client";

import { PublicNavigationLink as Link } from "./document-navigation";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { CtaButton } from "./cta-button";

interface MobileNavbarMenuProps {
  loginUrl?: string | null;
  links: { label: string; href: string }[];
  groups?: readonly { label: string; links: readonly { label: string; href: string }[] }[];
  cta: { label: string; href: string; variant: string } | null;
  assistantLink?: { label: string; href: string };
  utilityLink?: { label: string; href: string };
  currentPath: string;
  openLabel: string;
  closeLabel: string;
}

export function MobileNavbarMenu({
  links,
  loginUrl = null,
  groups,
  cta,
  assistantLink,
  utilityLink,
  currentPath,
  openLabel,
  closeLabel,
}: MobileNavbarMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = "witnessops-mobile-menu";

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;

    if (menuOpen) {
      root.setAttribute("data-mobile-nav-open", "true");
    } else {
      root.removeAttribute("data-mobile-nav-open");
    }

    return () => root.removeAttribute("data-mobile-nav-open");
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter(element => element.getClientRects().length > 0);
    const openingWidth = window.innerWidth;
    const toggleIsHidden = () =>
      toggleRef.current !== null &&
      window.getComputedStyle(toggleRef.current).display === "none";
    const toggleWasVisible = !toggleIsHidden();
    const releaseBodyScrollLock = acquireBodyScrollLock();
    const preserveVisibleMenu = () => {
      // WebKit can cross the desktop breakpoint when its scrollbar disappears.
      // In that narrow band, allow background scrolling rather than hide the menu.
      if (toggleWasVisible && window.innerWidth === openingWidth && toggleIsHidden()) {
        releaseBodyScrollLock();
      }
    };
    preserveVisibleMenu();
    let focusAfterLayout = 0;
    const focusFrame = window.requestAnimationFrame(() => {
      preserveVisibleMenu();
      focusAfterLayout = window.requestAnimationFrame(() => {
        focusableElements()[0]?.focus({ preventScroll: true });
        if (menuRef.current) menuRef.current.scrollTop = 0;
      });
    });
    let resizeFrame = 0;
    const handleResize = () => {
      if (window.innerWidth === openingWidth) return;
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        if (toggleIsHidden()) setMenuOpen(false);
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;
      const elements = focusableElements();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.cancelAnimationFrame(focusAfterLayout);
      window.cancelAnimationFrame(resizeFrame);
      releaseBodyScrollLock();
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [menuOpen]);

  return (
    <div className="contents">
      <button
        ref={toggleRef}
        type="button"
        className={`inline-flex size-11 items-center justify-center rounded-md border bg-transparent text-text-secondary transition-colors duration-200 hover:border-surface-border-strong hover:bg-surface-inset hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent lg:hidden ${
          menuOpen
            ? "border-surface-border-strong text-text-primary"
            : "border-surface-border"
        }`}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label={menuOpen ? closeLabel : openLabel}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="sr-only">
          {menuOpen ? closeLabel : openLabel}
        </span>
        <span aria-hidden="true" className="flex flex-col gap-1.5">
          <span
            className={`block h-0.5 w-5 bg-current transition-transform duration-200 ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 bg-current transition-opacity duration-200 ${
              menuOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`block h-0.5 w-5 bg-current transition-transform duration-200 ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      <div
        ref={menuRef}
        id={menuId}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`public-shell absolute inset-x-0 top-full z-50 w-full overflow-y-auto overscroll-contain bg-surface-bg text-text-primary transition-[max-height,opacity] duration-200 lg:hidden ${
          menuOpen
            ? "h-[calc(100dvh-var(--app-navbar-height,72px))] max-h-[calc(100dvh-var(--app-navbar-height,72px))] border-y border-surface-border opacity-100"
            : "pointer-events-none max-h-0 border-t border-transparent opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-content flex-col px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
          {groups && (cta || loginUrl) && <div data-mobile-account-actions className="grid grid-cols-2 gap-3 border-b border-surface-border py-4">
            {cta && <CtaButton label={cta.label} href={cta.href} variant={cta.variant as "primary" | "secondary" | "ghost"} onClick={closeMenu} className="min-h-11" />}
            {loginUrl && <Link href={loginUrl} onClick={closeMenu} className="flex min-h-11 items-center justify-center rounded-md border border-surface-border px-4 text-sm">Log in</Link>}
          </div>}
          {groups?.map((group, index) => <section key={group.label} className="border-b border-surface-border">
            <h2><button type="button" className="flex min-h-16 w-full items-center justify-between px-3 text-left text-base text-text-primary focus-visible:outline-2 focus-visible:outline-brand-accent" aria-expanded={expandedGroup === group.label} aria-controls={`${menuId}-group-${index}`} onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}>{group.label}<span aria-hidden="true" className="text-xl text-text-muted">{expandedGroup === group.label ? "−" : "+"}</span></button></h2>
            <div id={`${menuId}-group-${index}`} hidden={expandedGroup !== group.label} className="pb-3">
              {group.links.map(link => <Link key={link.href} href={link.href} onClick={closeMenu} aria-current={currentPath === link.href ? "page" : undefined} className="flex min-h-11 items-center rounded px-3 text-sm text-text-secondary hover:bg-surface-card focus-visible:outline-2 focus-visible:outline-brand-accent">{link.label}</Link>)}
            </div>
          </section>)}
          {(groups ? [{ label: "Pricing", href: "/pricing" }] : links).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={currentPath === link.href ? "page" : undefined}
              className={`inline-flex h-12 items-center border-l-2 px-3 text-sm transition-colors duration-200 hover:border-brand-accent/60 hover:bg-brand-accent/[0.06] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
                currentPath === link.href
                  ? "border-brand-accent bg-brand-accent/[0.06] font-semibold text-text-primary"
                  : "border-transparent bg-transparent text-text-secondary"
              }`}
              onClick={closeMenu}
            >
              <span className="inline-block -translate-y-px">{link.label}</span>
            </Link>
          ))}
          {assistantLink ? (
            <Link
              href={assistantLink.href}
              data-mobile-assistant-link
              className="inline-flex h-12 items-center border-t border-surface-border px-3 text-sm font-semibold text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              onClick={closeMenu}
            >
              <span className="inline-block -translate-y-px">{assistantLink.label}</span>
            </Link>
          ) : null}
          {utilityLink ? (
            <Link
              href={utilityLink.href}
              className="inline-flex h-12 items-center border-t border-surface-border px-3 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              onClick={closeMenu}
            >
              <span className="inline-block -translate-y-px">{utilityLink.label}</span>
            </Link>
          ) : null}
          {!groups && cta && <CtaButton
            label={cta.label}
            href={cta.href}
            variant={(cta.variant as "primary" | "secondary" | "ghost") ?? "primary"}
            className={`mt-2 h-12 w-full !rounded-md !border !border-brand-accent !bg-brand-accent !text-text-inverse !shadow-[0_8px_24px_rgba(242,122,61,0.16)] hover:!brightness-110 hover:!shadow-[0_12px_30px_rgba(242,122,61,0.24)] focus-visible:!ring-brand-accent focus-visible:!ring-offset-surface-bg ${
              currentPath === cta.href ? "ring-2 ring-brand-accent" : ""
            }`}
            ariaCurrent={currentPath === cta.href ? "page" : undefined}
            onClick={closeMenu}
            labelClassName="inline-block -translate-y-px"
          />}
        </div>
      </div>
    </div>
  );
}
