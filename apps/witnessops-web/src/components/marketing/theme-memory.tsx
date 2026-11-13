"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { isPolishPath } from "@/lib/public-i18n";

type RememberedTheme = "dark" | "light";

const THEME_MEMORY_COPY = {
  en: {
    title: "Theme on this device",
    dark: "Dark",
    light: "Light",
    remembered: "Remembered on this device",
    note: "Saved in this browser only after you choose. WitnessOps does not receive this choice.",
    group: "Theme",
  },
  // PL copy pending native review. Listed in src/app/pl/layout.tsx.
  pl: {
    title: "Motyw na tym urządzeniu",
    dark: "Ciemny",
    light: "Jasny",
    remembered: "Zapamiętany na tym urządzeniu",
    note: "Zapisujemy wybór tylko w tej przeglądarce, dopiero po kliknięciu. WitnessOps nie otrzymuje tego wyboru.",
    group: "Motyw",
  },
} as const;

/**
 * Records a theme choice only after a click. The pre-paint script may read
 * wo-theme, and it does not write it.
 */
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): RememberedTheme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeMemory({ compact = false }: { compact?: boolean } = {}) {
  const [remembered, setRemembered] = useState<RememberedTheme | null>(null);
  // Reads the applied theme only; nothing is written until a click.
  const active = useSyncExternalStore(subscribeToTheme, readTheme, () => null);
  const copy = THEME_MEMORY_COPY[isPolishPath(usePathname() || "/") ? "pl" : "en"];

  function choose(theme: RememberedTheme) {
    localStorage.setItem("wo-theme", theme);
    document.documentElement.dataset.theme = theme;
    setRemembered(theme);
  }

  if (compact) {
    // Footer bottom row: a small Dark/Light pair. The storage note lives in Privacy.
    const buttonClass = "min-h-11 min-w-14 rounded-sm border border-surface-border px-3 text-text-primary";
    return (
      <div role="group" aria-label={copy.group} className="inline-flex gap-1" data-theme-memory="compact">
        <button type="button" data-theme-choice="dark" aria-pressed={active === "dark"} className={buttonClass} onClick={() => choose("dark")}>
          {copy.dark}
        </button>
        <button type="button" data-theme-choice="light" aria-pressed={active === "light"} className={buttonClass} onClick={() => choose("light")}>
          {copy.light}
        </button>
        {remembered ? <span className="sr-only" role="status">{copy.remembered}</span> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 max-w-md text-sm leading-6 text-text-muted" data-theme-memory>
      <p className="font-semibold text-text-primary">{copy.title}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          data-theme-choice="dark"
          className="min-h-11 rounded-sm border border-surface-border px-3 text-text-primary"
          onClick={() => choose("dark")}
        >
          {copy.dark}
        </button>
        <button
          type="button"
          data-theme-choice="light"
          className="min-h-11 rounded-sm border border-surface-border px-3 text-text-primary"
          onClick={() => choose("light")}
        >
          {copy.light}
        </button>
      </div>
      {remembered ? <p className="mt-2">{copy.remembered}</p> : null}
      <p className="mt-2">{copy.note}</p>
    </div>
  );
}
