"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./ask-sovereign-preview.module.css";
import { advancePlayback, spriteAsset, spriteState, type SovereignSpriteState } from "./sovereign-playback";

const FRAME = 94;

function themeOf(node: Element): "light" | "dark" {
  return node.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function scaleOf(): "@1x" | "@2x" {
  return window.devicePixelRatio >= 1.5 ? "@2x" : "@1x";
}

function assetUrl(name: SovereignSpriteState, theme: "light" | "dark", scale: "@1x" | "@2x", still: boolean): string {
  return `/ask-sovereign/${spriteAsset(name, theme, scale, still)}`;
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
}: {
  state: SovereignSpriteState;
  paused: boolean;
  reduced: boolean;
  armed: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const [hold, setHold] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [stripReady, setStripReady] = useState(false);
  const [stillSrc, setStillSrc] = useState<string | undefined>(undefined);
  const [stripSrc, setStripSrc] = useState<string | undefined>(undefined);
  const capLeft = useRef<number | null>(null);
  const still = paused || reduced || hidden || !armed || !stripReady;
  const spec = spriteState(state);

  useEffect(() => {
    setFrame(0);
    setHold(false);
    capLeft.current = null;
  }, [state, paused, reduced]);

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
    const stillUrl = assetUrl(state, theme, scale, true);
    const stripUrl = assetUrl(state, theme, scale, false);
    setStripReady(false);
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
      setStripReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [state, theme, reduced]);

  useEffect(() => {
    if (!theme) return;
    const scale = scaleOf();
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const handoff: SovereignSpriteState = narrow ? "handoff-mobile" : "handoff-desktop";
    const immediate: SovereignSpriteState[] = reduced
      ? ["greet", "idle", "thinking", "answering", handoff, "error"]
      : ["greet", "idle", "thinking"];
    const later: SovereignSpriteState[] = reduced ? [] : ["answering", handoff, "error"];
    immediate.forEach((name) => {
      void decodeImage(assetUrl(name, theme, scale, reduced));
    });
    let cancel = () => {};
    const warm = () => {
      later.forEach((name) => {
        void decodeImage(assetUrl(name, theme, scale, false));
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
  }, [theme, reduced]);

  useEffect(() => {
    if (still || state === "answering") return;
    let alive = true;
    let index = 0;
    let loops = 0;
    let timer = 0;
    const current = spriteState(state);
    function tick() {
      if (!alive) return;
      const step = current.sequence[index];
      if (!step) return;
      setFrame(step.frame);
      if (step.ms === 0) return;
      timer = window.setTimeout(() => {
        const next = advancePlayback(state, index, loops);
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
  }, [state, still]);

  useEffect(() => {
    const cap = "cap_ms" in spec ? spec.cap_ms : undefined;
    if (!cap || still) return;
    const wait = capLeft.current ?? cap;
    const started = performance.now();
    const timer = window.setTimeout(() => {
      capLeft.current = 0;
      setHold(true);
      setFrame(spec.hold_frame);
    }, wait);
    return () => {
      window.clearTimeout(timer);
      if (capLeft.current !== 0) capLeft.current = Math.max(0, wait - (performance.now() - started));
    };
  }, [spec, still]);

  const shown = still ? stillSrc : stripSrc ?? stillSrc;
  const position = still || state !== "answering" || hold ? `${-frame * FRAME}px 0` : undefined;
  return (
    <div
      className={styles.sprite}
      data-state={state}
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
