"use client";

import { useEffect, useState } from "react";

type ThemeName = "light" | "dark";
type ThemeLocale = "en" | "pl";

const THEME_TOGGLE_COPY = {
  en: {
    dark: { label: "Dark", name: "Switch to dark theme" },
    light: { label: "Light", name: "Switch to light theme" },
  },
  // PL copy pending native review. The /pl banner covers these four strings:
  // Ciemny, Jasny, Przełącz na ciemny motyw, Przełącz na jasny motyw.
  pl: {
    dark: { label: "Ciemny", name: "Przełącz na ciemny motyw" },
    light: { label: "Jasny", name: "Przełącz na jasny motyw" },
  },
} as const;

/** Writes wo-theme only after a click. The label follows the theme already on the document. */
export function ThemeToggle({
  className = "hidden lg:inline-flex",
  locale = "en",
}: {
  className?: string;
  locale?: ThemeLocale;
}) {
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function choose(next: ThemeName) {
    localStorage.setItem("wo-theme", next);
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  const next: ThemeName = theme === "light" ? "dark" : "light";
  const copy = THEME_TOGGLE_COPY[locale][next];
  return (
    <button
      type="button"
      data-theme-toggle
      aria-pressed={theme === "dark"}
      aria-label={copy.name}
      title={copy.name}
      className={`min-h-11 min-w-11 shrink-0 items-center justify-center whitespace-nowrap rounded-sm border border-surface-border px-3 text-sm text-text-primary ${className}`}
      onClick={() => choose(next)}
    >
      {copy.label}
    </button>
  );
}
