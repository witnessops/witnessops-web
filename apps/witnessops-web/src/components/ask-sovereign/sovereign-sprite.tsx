"use client";

import { useEffect, useState } from "react";

import styles from "./ask-sovereign-preview.module.css";
import "./sovereign-idle-fallback.css";
import { advancePlayback, spriteAsset, spriteRecord, type SovereignSpriteState, type SpriteViewport } from "./sovereign-playback";

const FRAME = 94;
/** Transparent rows above the error ink. The held and still face starts at y=40. */
const ERROR_FRAME_TOP = [15, 26, 40] as const;

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
  const [topSrc, setTopSrc] = useState<string | undefined>(undefined);
  const [faceReady, setFaceReady] = useState(false);
  const still = paused || reduced || hidden || !armed || !stripReady || hold;

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
    const wantsStill = reduced || paused;
    const url = assetUrl(state, theme, scale, wantsStill, viewport);
    setStripReady(false);
    setTopSrc(undefined);
    setFaceReady(false);
    void decodeImage(url).then((ok) => {
      if (cancelled) return;
      if (ok) {
        setTopSrc(url);
        setFaceReady(true);
      } else {
        setTopSrc(undefined);
        setFaceReady(false);
      }
      setStripReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [state, theme, reduced, paused, viewport]);

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
    if (still) return;
    const cap = spriteRecord(state, viewport).cap_ms;
    if (!cap) return;
    const timer = window.setTimeout(() => {
      setFrame(spriteRecord(state, viewport).hold_frame);
      setHold(true);
    }, cap);
    return () => window.clearTimeout(timer);
  }, [state, still, viewport]);

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

  const frozen = paused || reduced || !armed;
  const errorTop = state === "ERROR" ? (frozen ? 40 : ERROR_FRAME_TOP[frame] ?? 40) : 0;
  const position = `${frozen ? 0 : -frame * FRAME}px ${errorTop ? -errorTop : 0}px`;
  return (
    <div className={`${styles.sprite} sv-fallback`} data-face-ready={faceReady ? "" : undefined} role="presentation" aria-hidden="true">
      {topSrc ? (
        <div
          className={styles.spriteFace}
          data-state={state}
          data-viewport={state === "HANDOFF" ? viewport : undefined}
          data-still={frozen ? "1" : undefined}
          data-hold={hold && !frozen ? "1" : undefined}
          style={{
            backgroundImage: `url("${topSrc}")`,
            backgroundPosition: frozen || hold || state !== "COMPOSING" ? position : undefined,
            backgroundSize: state === "ERROR" && !frozen ? "auto 102px" : undefined,
          }}
        />
      ) : null}
    </div>
  );
}
