"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { docsPathsMatch } from "@/lib/docs-host-routing";

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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Status color for section bullets */
function sectionBulletColor(id: string): string {
  if (id === "concepts" || id === "architecture") return "bg-signal-green";
  if (id === "tasks" || id === "orientation") return "border-signal-amber";
  return "border-surface-border";
}

const desktopSidebarStyle = {
  top: "var(--app-navbar-height, 72px)",
  height: "calc(100dvh - var(--app-navbar-height, 72px))",
} as React.CSSProperties;

export function DocsSidebar({ sections }: DocsSidebarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [footerClearance, setFooterClearance] = useState(0);
  const drawerRef = useRef<HTMLElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const drawerSearchRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const drawerId = "witnessops-docs-mobile-drawer";

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setSearchQuery("");
  }, [pathname]);

  useEffect(() => {
    const activeSection = sections.find((s) => isSectionActive(s));
    if (activeSection && !expandedSections.has(activeSection.id)) {
      setExpandedSections((prev) => new Set(prev).add(activeSection.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const releaseBodyScrollLock = acquireBodyScrollLock();

    const focusFrame = window.requestAnimationFrame(() => {
      const drawer = drawerRef.current;
      const initialFocus = drawer?.querySelector<HTMLElement>(
        "[data-docs-drawer-initial-focus]",
      );
      initialFocus?.focus();

      const activeLink = drawer?.querySelector<HTMLElement>(
        "[data-active-link='true']",
      );
      activeLink?.scrollIntoView({ block: "nearest" });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      releaseBodyScrollLock();
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [drawerOpen]);

  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(
      "footer[data-brand-footer]",
    );
    if (!footer) return;

    let frame = 0;
    const visualViewport = window.visualViewport;
    const updateFooterClearance = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const viewportBottom = visualViewport
          ? visualViewport.offsetTop + visualViewport.height
          : window.innerHeight;
        const overlap = Math.max(
          0,
          Math.ceil(viewportBottom - footer.getBoundingClientRect().top),
        );
        setFooterClearance(overlap);
      });
    };

    const resizeObserver = new ResizeObserver(updateFooterClearance);
    resizeObserver.observe(footer);
    window.addEventListener("resize", updateFooterClearance);
    window.addEventListener("scroll", updateFooterClearance, { passive: true });
    visualViewport?.addEventListener("resize", updateFooterClearance);
    visualViewport?.addEventListener("scroll", updateFooterClearance);
    updateFooterClearance();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFooterClearance);
      window.removeEventListener("scroll", updateFooterClearance);
      visualViewport?.removeEventListener("resize", updateFooterClearance);
      visualViewport?.removeEventListener("scroll", updateFooterClearance);
    };
  }, []);

  // Keyboard: / to focus the search field for the currently visible sidebar.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        const searchInput = drawerOpen
          ? drawerSearchRef.current
          : desktopSearchRef.current;
        if (!searchInput || searchInput.offsetParent === null) return;
        e.preventDefault();
        searchInput.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  const handleDrawerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeDrawer();
      return;
    }

    if (e.key !== "Tab") return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      (element) =>
        !element.hasAttribute("disabled") &&
        element.getAttribute("aria-hidden") !== "true" &&
        element.offsetParent !== null,
    );

    if (focusable.length === 0) {
      e.preventDefault();
      drawer.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!drawer.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, [closeDrawer]);

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isActive(href: string) {
    return docsPathsMatch(pathname, href);
  }
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

  const renderSidebarContent = (mobile: boolean) => (
    <nav
      aria-label="Documentation navigation"
      className="sidebar-kb"
      data-docs-nav-surface="sidebar"
    >
      {/* Search */}
      <div className="sidebar-kb-search">
        <input
          ref={mobile ? drawerSearchRef : desktopSearchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="/ search…"
          autoComplete="off"
          spellCheck={false}
          className="sidebar-kb-search-input"
          style={mobile ? { fontSize: "16px" } : undefined}
          aria-label="Filter documentation navigation"
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
        className="fixed z-40 flex items-center gap-2 rounded border border-surface-border bg-surface-bg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-primary shadow-lg transition-colors hover:border-brand-accent hover:text-brand-accent lg:hidden"
        style={{
          bottom: `calc(max(1rem, env(safe-area-inset-bottom)) + ${footerClearance}px)`,
          left: "max(1rem, env(safe-area-inset-left))",
        }}
        onClick={() => setDrawerOpen(true)}
        aria-label="Open documentation menu"
        aria-controls={drawerId}
        aria-expanded={drawerOpen}
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
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] h-[100dvh] max-h-[100dvh] overflow-hidden bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeDrawer}
          onKeyDown={handleDrawerKeyDown}
        >
          <aside
            ref={drawerRef}
            id={drawerId}
            className="absolute inset-y-0 left-0 flex h-[100dvh] max-h-[100dvh] w-72 max-w-full flex-col overflow-hidden border-r border-surface-border bg-surface-bg pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="docs-mobile-drawer-title"
            tabIndex={-1}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3">
              <span
                id="docs-mobile-drawer-title"
                className="text-sm font-semibold text-text-primary"
              >
                Navigation
              </span>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                onClick={closeDrawer}
                aria-label="Close navigation"
                data-docs-drawer-initial-focus
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sidebar-kb-scroll">
              {renderSidebarContent(true)}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
