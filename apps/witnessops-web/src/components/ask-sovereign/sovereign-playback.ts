import manifest from "./sprites.json";

export const SPRITE_CSS_PX = { width: 94, height: 102 } as const;

export const CONTRACT_SPRITE_STATES = ["IDLE", "GREETING", "PROCESSING", "COMPOSING", "HANDOFF", "ERROR"] as const;

export type SovereignSpriteState = (typeof CONTRACT_SPRITE_STATES)[number];

export type SpriteViewport = "desktop" | "mobile";

export type PlaybackStep = {
  frame: number;
  waitMs: number | null;
  finished: boolean;
};

type PlayableState = {
  sequence: { frame: number; ms: number }[];
  hold_frame: number;
  loop_count: number;
  cap_ms?: number;
  file: Record<"light" | "dark", Record<"@1x" | "@2x", { webp: string; png: string }>>;
  reduced_motion_still: Record<"light" | "dark", Record<"@1x" | "@2x", { webp: string; png: string }>>;
};

const COMPOSING_STEPS = 4;

export function spriteRecord(name: SovereignSpriteState, viewport: SpriteViewport = "desktop"): PlayableState {
  if (name === "HANDOFF") return manifest.states.HANDOFF.viewports[viewport] as PlayableState;
  return manifest.states[name] as PlayableState;
}

export function spriteState(name: SovereignSpriteState, viewport: SpriteViewport = "desktop") {
  return spriteRecord(name, viewport);
}

/** One pass of a state's sequence. Greeting is 1080 ms. */
export function stateDurationMs(name: SovereignSpriteState, viewport: SpriteViewport = "desktop"): number {
  return spriteRecord(name, viewport).sequence.reduce((sum, step) => sum + step.ms, 0);
}

/** One step of the sprites.json sequence. Composing is even, so CSS steps() owns it. */
export function playbackStep(name: SovereignSpriteState, index: number, viewport: SpriteViewport = "desktop"): PlaybackStep {
  const state = spriteRecord(name, viewport);
  if (name === "COMPOSING") {
    return { frame: index < COMPOSING_STEPS ? index : state.hold_frame, waitMs: index < COMPOSING_STEPS ? 140 : null, finished: index >= COMPOSING_STEPS };
  }
  if (index >= state.sequence.length) {
    return { frame: state.hold_frame, waitMs: null, finished: true };
  }
  const step = state.sequence[index];
  if (step.ms === 0) return { frame: step.frame, waitMs: null, finished: true };
  return { frame: step.frame, waitMs: step.ms, finished: false };
}

export function advancePlayback(name: SovereignSpriteState, index: number, loops: number, viewport: SpriteViewport = "desktop"): { index: number; loops: number; finished: boolean } {
  const state = spriteRecord(name, viewport);
  const nextIndex = index + 1;
  if (nextIndex < state.sequence.length) return { index: nextIndex, loops, finished: false };
  const nextLoops = loops + 1;
  if (state.loop_count > 0 && nextLoops >= state.loop_count) {
    return { index: nextIndex, loops: nextLoops, finished: true };
  }
  return { index: 0, loops: nextLoops, finished: false };
}

export function spriteAsset(name: SovereignSpriteState, theme: "light" | "dark", scale: "@1x" | "@2x", still: boolean, viewport: SpriteViewport = "desktop"): string {
  const file = still ? spriteRecord(name, viewport).reduced_motion_still : spriteRecord(name, viewport).file;
  return file[theme][scale].webp;
}
