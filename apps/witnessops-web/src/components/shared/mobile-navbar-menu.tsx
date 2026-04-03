"use client";

import Link from "next/link";
import { useState } from "react";
import { CtaButton } from "./cta-button";

interface MobileNavbarMenuProps {
  links: { label: string; href: string }[];
  cta: { label: string; href: string; variant: string };
}

export function MobileNavbarMenu({ links, cta }: MobileNavbarMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = "witnessops-mobile-menu";

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded border border-surface-border bg-surface-card text-text-primary transition-colors hover:bg-surface-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label={menuOpen ? "Close primary navigation" : "Open primary navigation"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="sr-only">
          {menuOpen ? "Close primary navigation" : "Open primary navigation"}
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
        id={menuId}
        className={`absolute top-full right-0 left-0 overflow-hidden border-t border-surface-border bg-surface-bg transition-[max-height,opacity] duration-200 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-content flex-col gap-2 px-6 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-3 text-sm text-text-primary transition-colors hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          <CtaButton
            label={cta.label}
            href={cta.href}
            variant={(cta.variant as "primary" | "secondary" | "ghost") ?? "primary"}
            className="mt-2 w-full"
            onClick={closeMenu}
          />
        </div>
      </div>
    </div>
  );
}
