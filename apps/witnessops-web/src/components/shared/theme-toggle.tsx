"use client";

import { useEffect, useState } from "react";

type ThemeName = "light" | "dark";

/** Writes wo-theme only after a click. The label follows the theme already on the document. */
export function ThemeToggle({ className = "hidden lg:inline-flex" }: { className?: string }) {
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
  return (
    <button
      type="button"
      data-theme-toggle
      aria-pressed={theme === "dark"}
      aria-label={next === "dark" ? "Switch to dark theme" : "Switch to light theme"}
      className={`min-h-11 min-w-11 items-center justify-center rounded-sm border border-surface-border px-3 text-sm text-text-primary ${className}`}
      onClick={() => choose(next)}
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
