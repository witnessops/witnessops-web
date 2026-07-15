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
  openLabel: string;
  closeLabel: string;
}

export function MobileNavbarMenu({
  links,
  cta,
  utilityLink,
  currentPath,
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
        className="inline-flex size-11 items-center justify-center rounded border border-white/30 bg-black text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
        className={`absolute top-full right-0 left-0 overflow-hidden border-t border-white/15 bg-black text-white transition-[max-height,opacity] duration-200 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-content flex-col px-6 py-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={currentPath === link.href ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border-l-2 px-3 py-2 text-sm transition-colors hover:border-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                currentPath === link.href
                  ? "border-white bg-transparent font-semibold text-white"
                  : "border-transparent bg-transparent text-white/75"
              }`}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          {utilityLink ? (
            <Link
              href={utilityLink.href}
              className="mt-1 inline-flex min-h-11 items-center border-t border-white/15 px-3 py-2 text-sm font-semibold text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={closeMenu}
            >
              {utilityLink.label}
            </Link>
          ) : null}
          <CtaButton
            label={cta.label}
            href={cta.href}
            variant={(cta.variant as "primary" | "secondary" | "ghost") ?? "primary"}
            className={`mt-2 min-h-11 w-full !rounded-sm !bg-white !text-black !shadow-none hover:!bg-neutral-200 hover:!shadow-none focus-visible:!ring-white focus-visible:!ring-offset-black ${
              currentPath === cta.href ? "ring-2 ring-white" : ""
            }`}
            ariaCurrent={currentPath === cta.href ? "page" : undefined}
            onClick={closeMenu}
          />
        </div>
      </div>
    </div>
  );
}
