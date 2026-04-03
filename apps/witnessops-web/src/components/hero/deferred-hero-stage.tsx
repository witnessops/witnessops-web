"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";

type ConnectionLike = {
  saveData?: boolean;
};

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type DeferredHeroStageProps = {
  children: ReactNode;
};

function prefersStaticStage() {
  const connection = (navigator as Navigator & { connection?: ConnectionLike }).connection;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    connection?.saveData === true
  );
}

function scheduleEnhancement(callback: () => void) {
  const idleWindow = window as IdleWindow;

  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 1800 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const timeout = window.setTimeout(callback, 1200);
  return () => window.clearTimeout(timeout);
}

export function DeferredHeroStage({ children }: DeferredHeroStageProps) {
  const [HeroCinematic, setHeroCinematic] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (prefersStaticStage()) {
      return;
    }

    let cancelled = false;
    const cancelSchedule = scheduleEnhancement(async () => {
      const heroModule = await import("./hero-cinematic");

      if (!cancelled) {
        setHeroCinematic(() => heroModule.default);
      }
    });

    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, []);

  return HeroCinematic ? <HeroCinematic /> : <>{children}</>;
}
