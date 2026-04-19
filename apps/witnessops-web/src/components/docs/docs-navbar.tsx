"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DocsSearch } from "./docs-search";

interface DocEntry {
  title: string;
  description: string;
  href: string;
  section: string;
  layerTitle: string;
  sectionTitle: string;
}

interface DocsNavbarProps {
  docs: DocEntry[];
  verifyFirstHref?: string;
}

const CORE_UTILITY_LINKS = [
  { label: "Start Here", href: "/docs/getting-started" },
  { label: "Reference", href: "/docs/reference" },
  { label: "Glossary", href: "/docs/glossary" },
];

function isUtilityLinkActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DocsNavbar({ docs, verifyFirstHref }: DocsNavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const utilityLinks = useMemo(() => {
    if (!verifyFirstHref) {
      return CORE_UTILITY_LINKS;
    }

    return [
      CORE_UTILITY_LINKS[0],
      { label: "Verify First", href: verifyFirstHref },
      ...CORE_UTILITY_LINKS.slice(1),
    ];
  }, [verifyFirstHref]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <nav
        aria-label="Documentation utility navigation"
        className="border-b border-surface-border/80 bg-surface-bg-alt/75"
        data-docs-nav-surface="utility-nav"
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-8 items-center gap-2 border border-surface-border bg-surface-card px-3 text-xs font-medium uppercase tracking-[0.14em] text-text-primary transition-colors hover:border-brand-accent/50 hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
            aria-label="Search docs"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            aria-keyshortcuts="Meta+K Control+K"
          >
            Search
            <kbd
              className="rounded border border-surface-border bg-surface-bg px-1 py-0.5 text-[10px] tracking-[0.08em] text-text-muted"
              aria-hidden="true"
            >
              ⌘K
            </kbd>
          </button>

          {utilityLinks.map((link) => {
            const active = isUtilityLinkActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex h-8 items-center border px-3 text-xs font-medium uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg ${
                  active
                    ? "border-brand-accent/50 bg-brand-accent/10 text-brand-accent"
                    : "border-surface-border bg-transparent text-text-muted hover:border-brand-accent/40 hover:text-text-primary"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {searchOpen && <DocsSearch docs={docs} onClose={() => setSearchOpen(false)} />}
    </>
  );
}
