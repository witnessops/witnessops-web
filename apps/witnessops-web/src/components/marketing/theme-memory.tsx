"use client";

import { useState } from "react";
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
  },
  // PL copy pending native review. Listed in src/app/pl/layout.tsx.
  pl: {
    title: "Motyw na tym urządzeniu",
    dark: "Ciemny",
    light: "Jasny",
    remembered: "Zapamiętany na tym urządzeniu",
    note: "Zapisujemy wybór tylko w tej przeglądarce, dopiero po kliknięciu. WitnessOps nie otrzymuje tego wyboru.",
  },
} as const;

/**
 * Records a theme choice only after a click. The pre-paint script may read
 * wo-theme, and it does not write it.
 */
export function ThemeMemory() {
  const [remembered, setRemembered] = useState<RememberedTheme | null>(null);
  const copy = THEME_MEMORY_COPY[isPolishPath(usePathname() || "/") ? "pl" : "en"];

  function choose(theme: RememberedTheme) {
    localStorage.setItem("wo-theme", theme);
    document.documentElement.dataset.theme = theme;
    setRemembered(theme);
  }

  return (
    <div className="mt-4 max-w-md text-sm leading-6 text-text-muted" data-theme-memory>
      <p className="font-semibold text-text-primary">{copy.title}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="min-h-11 rounded-sm border border-surface-border px-3 text-text-primary"
          onClick={() => choose("dark")}
        >
          {copy.dark}
        </button>
        <button
          type="button"
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
