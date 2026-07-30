"use client";

import { useEffect, useState } from "react";

interface Props {
  compact?: boolean;
}

const DOTS = [0, 1, 2, 3];

export function DocsAssistantLoadingStatus({ compact = false }: Props) {
  const [activeDotCount, setActiveDotCount] = useState(1);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    const interval = window.setInterval(() => {
      setActiveDotCount((current) => (current % DOTS.length) + 1);
    }, 280);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Assembling bounded public answer"
      aria-atomic="true"
      className={`inline-flex items-center gap-2 rounded border border-surface-border bg-surface-bg text-text-muted ${
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
      }`}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-accent opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-accent" />
      </span>
      <span className="inline-flex items-baseline" aria-hidden="true">
        <span>Assembling bounded public answer</span>
        <span className="ml-0.5 inline-grid w-[4ch] grid-cols-4 text-brand-accent">
          {DOTS.map((dot) => (
            <span
              key={dot}
              data-loading-dot="true"
              className={`text-center transition-opacity duration-150 motion-reduce:opacity-100 ${
                dot < activeDotCount ? "opacity-100" : "opacity-0"
              }`}
            >
              .
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
