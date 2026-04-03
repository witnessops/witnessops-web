"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface DocEntry {
  title: string;
  description: string;
  href: string;
  section: string;
  layerTitle: string;
  sectionTitle: string;
}

interface DocsSearchProps {
  docs: DocEntry[];
  onClose: () => void;
}

function matchScore(query: string, entry: DocEntry): number {
  const q = query.toLowerCase();
  const title = entry.title.toLowerCase();
  const desc = entry.description.toLowerCase();
  const layer = entry.layerTitle.toLowerCase();
  const section = entry.sectionTitle.toLowerCase();

  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (layer.includes(q)) return 45;
  if (section.includes(q)) return 40;
  if (desc.includes(q)) return 30;

  // Fuzzy: check if all chars appear in order
  let ti = 0;
  for (let i = 0; i < q.length; i++) {
    const idx = title.indexOf(q[i], ti);
    if (idx === -1) return 0;
    ti = idx + 1;
  }
  return 15;
}

function groupBySection(entries: DocEntry[]): Map<string, DocEntry[]> {
  const groups = new Map<string, DocEntry[]>();
  for (const entry of entries) {
    const key = entry.layerTitle;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return groups;
}

export function DocsSearch({ docs, onClose }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Escape closes
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Filter results
  const results =
    query.length > 0
      ? docs
          .map((entry) => ({ entry, score: matchScore(query, entry) }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map(({ entry }) => entry)
      : docs.slice(0, 8);

  const grouped = groupBySection(results);
  const flatResults = results;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && flatResults[activeIndex]) {
        e.preventDefault();
        onClose();
        window.location.href = flatResults[activeIndex].href;
      }
    },
    [flatResults, activeIndex, onClose]
  );

  // Scroll active item into view
  useEffect(() => {
    const item = panelRef.current?.querySelector("[data-active='true']");
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
          <svg
            className="shrink-0 text-text-muted"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M11 11L14 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            type="text"
            placeholder="Search docs..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search documentation"
          />
          <kbd className="rounded border border-surface-border bg-surface-bg px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2" ref={panelRef}>
          {flatResults.length === 0 && query.length > 0 && (
            <div className="px-3 py-8 text-center text-sm text-text-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {Array.from(grouped.entries()).map(([sectionTitle, entries]) => (
            <div key={sectionTitle}>
              <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                {sectionTitle}
              </div>
              {entries.map((entry) => {
                flatIndex++;
                const isActive = flatIndex === activeIndex;
                const idx = flatIndex;
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className={`block rounded-lg px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-brand-accent/10 text-text-primary"
                        : "text-text-secondary hover:bg-surface-bg hover:text-text-primary"
                    }`}
                    data-active={isActive}
                    onClick={onClose}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span className="block text-sm font-medium">{entry.title}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                      {entry.sectionTitle}
                    </span>
                    <span className="block mt-0.5 text-xs text-text-muted line-clamp-1">
                      {entry.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-surface-border px-4 py-2 text-[10px] text-text-muted">
          <span>
            <kbd className="rounded border border-surface-border bg-surface-bg px-1 py-0.5">
              &uarr;
            </kbd>{" "}
            <kbd className="rounded border border-surface-border bg-surface-bg px-1 py-0.5">
              &darr;
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="rounded border border-surface-border bg-surface-bg px-1 py-0.5">
              &crarr;
            </kbd>{" "}
            open
          </span>
          <span>
            <kbd className="rounded border border-surface-border bg-surface-bg px-1 py-0.5">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
