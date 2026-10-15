"use client";

import { useEffect, useState } from "react";

import styles from "./ask-sovereign-preview.module.css";
import { advancePlayback, spriteAsset, spriteRecord, type SovereignSpriteState, type SpriteViewport } from "./sovereign-playback";

const FRAME = 94;

function themeOf(node: Element): "light" | "dark" {
  return node.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function scaleOf(): "@1x" | "@2x" {
  return window.devicePixelRatio >= 1.5 ? "@2x" : "@1x";
}

function assetUrl(name: SovereignSpriteState, theme: "light" | "dark", scale: "@1x" | "@2x", still: boolean, viewport: SpriteViewport): string {
  return `/ask-sovereign/${spriteAsset(name, theme, scale, still, viewport)}`;
}

function decodeImage(src: string): Promise<boolean> {
  const image = new Image();
  image.src = src;
  const ok = () => true;
  const fail = () => false;
  if (typeof image.decode === "function") return image.decode().then(ok, fail);
  return new Promise((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
}

export function SovereignSprite({
  state,
  paused,
  reduced,
  armed,
  viewport = "desktop",
}: {
  state: SovereignSpriteState;
  paused: boolean;
  reduced: boolean;
  armed: boolean;
  viewport?: SpriteViewport;
}) {
  const [frame, setFrame] = useState(0);
  const [hold, setHold] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [stripReady, setStripReady] = useState(false);
  const [stillSrc, setStillSrc] = useState<string | undefined>(undefined);
  const [stripSrc, setStripSrc] = useState<string | undefined>(undefined);
  const still = paused || reduced || hidden || !armed || !stripReady;

  useEffect(() => {
    setFrame(0);
    setHold(false);
  }, [state, paused, reduced, viewport]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(themeOf(root));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!theme) return;
    let cancelled = false;
    const scale = scaleOf();
    const idleStill = assetUrl("IDLE", theme, scale, true, "desktop");
    const stillUrl = assetUrl(state, theme, scale, true, viewport);
    const stripUrl = assetUrl(state, theme, scale, false, viewport);
    setStripReady(false);
    setStripSrc(undefined);
    setStillSrc(idleStill);
    void decodeImage(stillUrl).then((ok) => {
      if (!cancelled && ok) setStillSrc(stillUrl);
    });
    if (reduced) {
      setStripReady(true);
      return () => {
        cancelled = true;
      };
    }
    void decodeImage(stripUrl).then((ok) => {
      if (cancelled) return;
      if (ok) setStripSrc(stripUrl);
      else setStillSrc(idleStill);
      setStripReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [state, theme, reduced, viewport]);

  useEffect(() => {
    if (!theme) return;
    const scale = scaleOf();
    const immediate: SovereignSpriteState[] = reduced
      ? ["GREETING", "IDLE", "PROCESSING", "COMPOSING", "HANDOFF", "ERROR"]
      : ["GREETING", "IDLE", "PROCESSING"];
    const later: SovereignSpriteState[] = reduced ? [] : ["COMPOSING", "HANDOFF", "ERROR"];
    immediate.forEach((name) => {
      void decodeImage(assetUrl(name, theme, scale, reduced, name === "HANDOFF" ? viewport : "desktop"));
    });
    let cancel = () => {};
    const warm = () => {
      later.forEach((name) => {
        void decodeImage(assetUrl(name, theme, scale, false, name === "HANDOFF" ? viewport : "desktop"));
      });
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm);
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(warm, 400);
      cancel = () => window.clearTimeout(id);
    }
    return cancel;
  }, [theme, reduced, viewport]);

  useEffect(() => {
    if (still || state === "COMPOSING") return;
    let alive = true;
    let index = 0;
    let loops = 0;
    let timer = 0;
    const current = spriteRecord(state, viewport);
    function tick() {
      if (!alive) return;
      const step = current.sequence[index];
      if (!step) return;
      setFrame(step.frame);
      if (step.ms === 0) return;
      timer = window.setTimeout(() => {
        const next = advancePlayback(state, index, loops, viewport);
        index = next.index;
        loops = next.loops;
        if (next.finished) {
          setFrame(current.hold_frame);
          setHold(true);
          return;
        }
        tick();
      }, step.ms);
    }
    tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [state, still, viewport]);

  const shown = still ? stillSrc : stripSrc ?? stillSrc;
  const position = still || state !== "COMPOSING" || hold ? `${-frame * FRAME}px 0` : undefined;
  return (
    <div
      className={styles.sprite}
      data-state={state}
      data-viewport={state === "HANDOFF" ? viewport : undefined}
      data-still={still ? "1" : undefined}
      data-hold={!still && hold ? "1" : undefined}
      style={{
        backgroundImage: shown ? `url("${shown}")` : undefined,
        backgroundPosition: still ? "0 0" : position,
      }}
      role="presentation"
      aria-hidden="true"
    />
  );
}
