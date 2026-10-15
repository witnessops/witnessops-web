"use client";

import { useState } from "react";

type RememberedTheme = "dark" | "light";

/**
 * Records a theme choice only after a click. It does not read storage on load
 * and does not switch the public palette.
 */
export function ThemeMemory() {
  const [remembered, setRemembered] = useState<RememberedTheme | null>(null);

  function choose(theme: RememberedTheme) {
    localStorage.setItem("wo-theme", theme);
    document.documentElement.dataset.theme = theme;
    setRemembered(theme);
  }

  return (
    <div className="mt-4 max-w-md text-sm leading-6 text-text-muted" data-theme-memory>
      <p className="font-semibold text-text-primary">Theme on this device</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="min-h-11 rounded-sm border border-surface-border px-3 text-text-primary"
          onClick={() => choose("dark")}
        >
          Dark
        </button>
        <button
          type="button"
          className="min-h-11 rounded-sm border border-surface-border px-3 text-text-primary"
          onClick={() => choose("light")}
        >
          Light
        </button>
      </div>
      {remembered ? <p className="mt-2">Remembered on this device</p> : null}
      <p className="mt-2">
        Saved in this browser only after you choose. WitnessOps does not receive this choice.
      </p>
    </div>
  );
}
