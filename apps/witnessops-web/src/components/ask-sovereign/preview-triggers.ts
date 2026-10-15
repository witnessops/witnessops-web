import { thinkingWaitMs } from "./sovereign-playback";

export type SimFlag = "error" | "handoff" | "slow";

/** Preview triggers are live only for an explicit non-production preview build. */
export function previewTriggersEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_WO_PREVIEW === "1";
}

export function simFlag(search: string): SimFlag | null {
  if (!previewTriggersEnabled()) return null;
  const value = new URLSearchParams(search).get("sim");
  if (value === "error" || value === "handoff" || value === "slow") return value;
  return null;
}

export function simErrorAtLoad(search: string): boolean {
  if (simFlag(search) !== "error") return false;
  return new URLSearchParams(search).get("at") === "load";
}

export function previewChip(flag: SimFlag | null): string | null {
  if (flag === "error") return "Preview · simulated error";
  if (flag === "handoff") return "Preview · simulated handoff";
  if (flag === "slow") return "Preview · simulated slow";
  return null;
}

export const SLOW_THINKING_MS = 6000;

export function thinkingDurationMs(flag: SimFlag | null, unitRandom: number): number {
  if (flag === "slow") return SLOW_THINKING_MS;
  return Math.max(400, thinkingWaitMs(unitRandom));
}
