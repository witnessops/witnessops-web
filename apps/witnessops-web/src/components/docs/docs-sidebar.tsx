"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface NavItem {
  title: string;
  href: string;
  order: number;
}

interface NavSection {
  id: string;
  title: string;
  description: string;
  items: NavItem[];
}

interface DocsSidebarProps {
  sections: NavSection[];
}

/** Status color for section bullets */
function sectionBulletColor(id: string): string {
  if (id === "concepts" || id === "architecture") return "bg-signal-green";
  if (id === "tasks" || id === "orientation") return "border-signal-amber";
  return "border-surface-border";
}

const desktopSidebarStyle = {
  top: "var(--app-navbar-height, 72px)",
  height: "calc(100vh - var(--app-navbar-height, 72px))",
} as React.CSSProperties;

export function DocsSidebar({ sections }: DocsSidebarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const drawerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    const activeSection = sections.find((s) => isSectionActive(s));
    if (activeSection && !expandedSections.has(activeSection.id)) {
      setExpandedSections((prev) => new Set(prev).add(activeSection.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) {
      requestAnimationFrame(() => {
        const activeLink = drawerRef.current?.querySelector("[data-active-link='true']");
        activeLink?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [drawerOpen]);

  // Keyboard: / to focus search, Escape to close drawer
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDrawerOpen(false);
      setSearchQuery("");
    }
  }, []);

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isActive(href: string) { return pathname === href; }
  function isSectionActive(section: NavSection) {
    return section.items.some((item) => isActive(item.href));
  }

  // Filter sections by search, preserving the layer model.
  const filteredSections = (() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return sections;
    }

    return sections
      .map((section) => {
        const layerMatches =
          section.title.toLowerCase().includes(query) ||
          section.description.toLowerCase().includes(query);

        return {
          ...section,
          items: layerMatches
            ? section.items
            : section.items.filter((item) =>
                item.title.toLowerCase().includes(query),
              ),
        };
      })
      .filter((section) => section.items.length > 0);
  })();

  const sidebarContent = (
    <nav
      aria-label="Documentation navigation"
      className="sidebar-kb"
      data-docs-nav-surface="sidebar"
    >
      {/* Search */}
      <div className="sidebar-kb-search">
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="/ search…"
          autoComplete="off"
          spellCheck={false}
          className="sidebar-kb-search-input"
        />
      </div>

      {/* Sections */}
      <div>
        {filteredSections.map((section) => {
          const expanded = expandedSections.has(section.id);
          const active = isSectionActive(section);

          return (
            <div
              key={section.id}
              className="sidebar-kb-section"
              data-docs-layer-context={section.id}
            >
              <button
                type="button"
                className={`sidebar-kb-section-header ${active ? "active" : ""}`}
                onClick={() => toggleSection(section.id)}
                aria-expanded={expanded}
                aria-label={`${expanded ? "Collapse" : "Expand"} ${section.title}`}
              >
                <span
                  className={`sidebar-kb-bullet ${sectionBulletColor(section.id)}`}
                  aria-hidden="true"
                />
                <span>{section.title}</span>
              </button>

              {expanded && (
                <ul className="sidebar-kb-items">
                  {section.items.map((item, idx) => {
                    const itemActive = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`sidebar-kb-item ${itemActive ? "active" : ""}`}
                          aria-current={itemActive ? "page" : undefined}
                          data-active-link={itemActive || undefined}
                        >
                          <span className="sidebar-kb-item-prefix">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-surface-border bg-surface-card px-4 py-2.5 text-sm text-text-secondary shadow-lg transition-colors hover:border-brand-accent/40 hover:text-text-primary lg:hidden"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open documentation menu"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 4.5H16M2 9H12M2 13.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>Menu</span>
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div
          className="sticky overflow-y-auto border-r border-surface-border bg-surface-bg-alt sidebar-kb-scroll"
          style={desktopSidebarStyle}
        >
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          onKeyDown={handleKeyDown}
        >
          <aside
            ref={drawerRef}
            className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-surface-border bg-surface-bg sidebar-kb-scroll"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="Documentation navigation"
          >
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <span className="text-sm font-semibold text-text-primary">Navigation</span>
              <button
                type="button"
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-card hover:text-text-primary"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
