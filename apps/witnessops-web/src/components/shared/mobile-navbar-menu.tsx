"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CtaButton } from "./cta-button";

interface MobileNavbarMenuProps {
  links: { label: string; href: string }[];
  cta: { label: string; href: string; variant: string };
  utilityLink?: { label: string; href: string };
  currentPath: string;
  productJourneyNav?: boolean;
  openLabel: string;
  closeLabel: string;
}

export function MobileNavbarMenu({
  links,
  cta,
  utilityLink,
  currentPath,
  productJourneyNav = false,
  openLabel,
  closeLabel,
}: MobileNavbarMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = "witnessops-mobile-menu";

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
    const focusFrame = window.requestAnimationFrame(() => {
      focusableElements()[0]?.focus();
    });

    document.body.style.overflow = "hidden";

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
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="lg:hidden">
      <button
        ref={toggleRef}
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-md border border-surface-border-strong bg-surface-bg text-text-primary transition-all duration-200 hover:-translate-y-px hover:border-brand-accent hover:bg-brand-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent motion-reduce:transform-none"
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
        className={`public-shell absolute top-full right-0 left-0 overflow-hidden border-t border-surface-border bg-surface-bg text-text-primary transition-[max-height,opacity] duration-200 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-content flex-col px-6 py-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={currentPath === link.href ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border-l-2 px-3 py-2 text-sm transition-all duration-200 hover:translate-x-1 hover:border-brand-accent hover:bg-brand-accent/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent motion-reduce:transform-none ${
                currentPath === link.href
                  ? "border-brand-accent bg-surface-inset font-semibold text-text-primary"
                  : "border-transparent bg-transparent text-text-secondary"
              }`}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          {utilityLink ? (
            <Link
              href={utilityLink.href}
              className="mt-1 inline-flex min-h-11 items-center border-t border-surface-border px-3 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              onClick={closeMenu}
            >
              {utilityLink.label}
            </Link>
          ) : null}
          <CtaButton
            label={cta.label}
            href={cta.href}
            variant={(cta.variant as "primary" | "secondary" | "ghost") ?? "primary"}
            className={`mt-2 min-h-11 w-full !rounded-md ${
              productJourneyNav
                ? "!border !border-brand-accent !bg-brand-accent !text-text-inverse !shadow-[0_8px_24px_rgba(242,122,61,0.16)] hover:-translate-y-0.5 hover:!brightness-110 hover:!shadow-[0_12px_30px_rgba(242,122,61,0.28)]"
                : "!bg-text-primary !text-surface-bg !shadow-none hover:!bg-[#2b2b25] hover:!shadow-none"
            } focus-visible:!ring-brand-accent focus-visible:!ring-offset-surface-bg ${
              currentPath === cta.href ? "ring-2 ring-brand-accent" : ""
            }`}
            ariaCurrent={currentPath === cta.href ? "page" : undefined}
            onClick={closeMenu}
          />
        </div>
      </div>
    </div>
  );
}
