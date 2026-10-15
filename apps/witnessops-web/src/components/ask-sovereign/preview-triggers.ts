export type SimFlag = "error" | "handoff" | "slow";

/**
 * Sim triggers follow the explicit preview flag.
 * A production build without that flag ignores them.
 * The preview server is a production `next start` with the flag set, so the triggers stay available there.
 */
export function previewTriggersEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WO_PREVIEW === "1";
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
