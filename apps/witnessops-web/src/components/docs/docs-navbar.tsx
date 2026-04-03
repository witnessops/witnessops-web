"use client";

import { useEffect, useState } from "react";
import { getDocsUrl, getSurfaceUrl } from "@witnessops/config";
import { DocsSearch } from "./docs-search";
import { OffsecMark } from "@/components/shared/witnessops-mark";

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
}

export function DocsNavbar({ docs }: DocsNavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K opens search
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
      <nav className="sticky top-0 z-50 border-b border-surface-border bg-surface-bg/95 backdrop-blur-sm after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-brand-accent/20 after:to-transparent">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 lg:px-6">
          {/* Logo mark + WitnessOps label */}
          <a
            href={getSurfaceUrl("witnessops")}
            className="flex items-center gap-2.5 no-underline"
            aria-label="WITNESSOPS home"
          >
            <OffsecMark variant="hex" size="sm" />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted"
              style={{ fontFamily: "var(--font-display)" }}
            >
              WitnessOps
            </span>
          </a>

          <div className="h-4 w-px bg-surface-border" aria-hidden="true" />

          <a
            href={getDocsUrl("witnessops")}
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text-primary"
          >
            Docs
          </a>

          <div className="flex-1" />

          {/* Engagement CTA */}
          <a
            href={getSurfaceUrl("witnessops", "/contact")}
            className="flex h-8 items-center px-5 bg-brand-accent text-text-inverse text-[11px] font-semibold uppercase tracking-[0.14em] transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,107,53,0.35)] active:scale-[0.97]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Engage
          </a>
        </div>
      </nav>

      {searchOpen && (
        <DocsSearch docs={docs} onClose={() => setSearchOpen(false)} />
      )}
    </>
  );
}
