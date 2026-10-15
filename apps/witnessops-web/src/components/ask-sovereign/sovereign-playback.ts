import manifest from "./sprites.json";

export const SPRITE_CSS_PX = { width: 94, height: 102 } as const;

export type SovereignSpriteState = keyof typeof manifest.states;

export type PlaybackStep = {
  frame: number;
  waitMs: number | null;
  finished: boolean;
};

const ANSWERING_STEPS = 4;

export function spriteState(name: SovereignSpriteState) {
  return manifest.states[name];
}

/** One pass of a state's sequence. Greet is 1080 ms. */
export function stateDurationMs(name: SovereignSpriteState): number {
  return manifest.states[name].sequence.reduce((sum, step) => sum + step.ms, 0);
}

/** One step of the sprites.json sequence. Answering is even, so CSS steps() owns it. */
export function playbackStep(name: SovereignSpriteState, index: number): PlaybackStep {
  const state = manifest.states[name];
  if (name === "answering") {
    return { frame: index < ANSWERING_STEPS ? index : state.hold_frame, waitMs: index < ANSWERING_STEPS ? 140 : null, finished: index >= ANSWERING_STEPS };
  }
  if (index >= state.sequence.length) {
    return { frame: state.hold_frame, waitMs: null, finished: true };
  }
  const step = state.sequence[index];
  if (step.ms === 0) return { frame: step.frame, waitMs: null, finished: true };
  return { frame: step.frame, waitMs: step.ms, finished: false };
}

export function advancePlayback(name: SovereignSpriteState, index: number, loops: number): { index: number; loops: number; finished: boolean } {
  const state = manifest.states[name];
  const nextIndex = index + 1;
  if (nextIndex < state.sequence.length) return { index: nextIndex, loops, finished: false };
  const nextLoops = loops + 1;
  if (state.loop_count > 0 && nextLoops >= state.loop_count) {
    return { index: nextIndex, loops: nextLoops, finished: true };
  }
  return { index: 0, loops: nextLoops, finished: false };
}

export function thinkingWaitMs(unitRandom: number): number {
  const span = Math.min(1, Math.max(0, unitRandom));
  return 600 + Math.round(span * 600);
}

export function revealWaitMs(text: string): number {
  return Math.min(5000, Math.max(140, Math.ceil(text.length / 40) * 100));
}

export function spriteAsset(name: SovereignSpriteState, theme: "light" | "dark", scale: "@1x" | "@2x", still: boolean): string {
  const file = still ? manifest.states[name].reduced_motion_still : manifest.states[name].file;
  return file[theme][scale].webp;
}
