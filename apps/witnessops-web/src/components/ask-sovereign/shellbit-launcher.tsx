"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ask-sovereign-widget.module.css";
import type { SovereignSpriteState } from "./sovereign-playback";

// The original Shellbit v3 atlas: 8 columns, 11 rows, 192 × 208 cells.
const CLIPS = {
  idle: { row: 0, frames: 6, ms: 220 },
  right: { row: 1, frames: 8, ms: 90 },
  left: { row: 2, frames: 8, ms: 90 },
  wave: { row: 3, frames: 4, ms: 180 },
  jump: { row: 4, frames: 5, ms: 130 },
  error: { row: 5, frames: 8, ms: 160 },
  waiting: { row: 6, frames: 6, ms: 180 },
  working: { row: 7, frames: 6, ms: 150 },
  review: { row: 8, frames: 6, ms: 180 },
} as const;
type Clip = keyof typeof CLIPS;

export function ShellbitLauncher({ moving, jump, active }: {
  moving: "left" | "right" | null;
  jump: number;
  active: boolean;
}) {
  const [reduced, setReduced] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [pose, setPose] = useState<{ clip: Clip; frame: number }>({ clip: "idle", frame: 0 });
  const consumedJump = useRef(0);
  const greeted = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(media.matches);
    const syncVisibility = () => setHidden(document.hidden);
    syncMotion();
    syncVisibility();
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      media.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    const shouldJump = jump !== consumedJump.current;
    consumedJump.current = jump;
    if (reduced || hidden || !active) {
      setPose({ clip: "idle", frame: 0 });
      return;
    }
    let clip: Clip = moving ?? (shouldJump ? "jump" : !greeted.current ? "wave" : "idle");
    greeted.current = true;
    let frame = 0;
    let timer = 0;
    const tick = () => {
      setPose({ clip, frame });
      timer = window.setTimeout(() => {
        frame += 1;
        if (frame >= CLIPS[clip].frames) {
          frame = 0;
          if (clip === "jump" || clip === "wave") clip = "idle";
        }
        tick();
      }, CLIPS[clip].ms);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [moving, jump, active, reduced, hidden]);

  return <span
    className={styles.character}
    data-shellbit-state={pose.clip}
    data-shellbit-frame={pose.frame}
    aria-hidden="true"
    style={{ backgroundPosition: `${pose.frame / 7 * 100}% ${CLIPS[pose.clip].row / 10 * 100}%` }}
  />;
}

const CHAT_CLIPS: Record<SovereignSpriteState, Clip> = {
  IDLE: "idle", GREETING: "wave", PROCESSING: "waiting",
  COMPOSING: "working", HANDOFF: "review", ERROR: "error",
};

/** A small conversational avatar; motion never competes with reading a reply. */
export function ShellbitChat({ state, paused, reduced, armed, active }: {
  state: SovereignSpriteState;
  paused: boolean;
  reduced: boolean;
  armed: boolean;
  active: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const [hidden, setHidden] = useState(false);
  const clip = CHAT_CLIPS[state];
  const still = paused || reduced || !armed || !active || hidden;

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    setFrame(0);
    if (still) return;
    const animation = CLIPS[clip];
    const cycles = clip === "waiting" || clip === "working" ? 3 : 1;
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      if (step >= animation.frames * cycles) {
        window.clearInterval(timer);
        setFrame(0);
      } else setFrame(step % animation.frames);
    }, animation.ms);
    return () => window.clearInterval(timer);
  }, [clip, still]);

  return <span className={`${styles.character} ${styles.chatCharacter}`}
    data-shellbit-chat={state} data-shellbit-frame={still ? 0 : frame} aria-hidden="true"
    style={{ backgroundPosition: `${(still ? 0 : frame) / 7 * 100}% ${CLIPS[clip].row / 10 * 100}%` }} />;
}
