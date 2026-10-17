export type SimFlag = "error" | "handoff" | "slow" | "timeout" | "typing";

/**
 * ?sim is dev-only. Next replaces NODE_ENV with "production" in every
 * `next build`, including preview deployments, so these switches are not
 * available there. They work only under `next dev`.
 */
export function previewTriggersEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_WO_PREVIEW === "1";
}

export function simFlag(search: string): SimFlag | null {
  if (!previewTriggersEnabled()) return null;
  const value = new URLSearchParams(search).get("sim");
  if (value === "error" || value === "handoff" || value === "slow" || value === "timeout" || value === "typing") return value;
  return null;
}

export function simErrorAtLoad(search: string): boolean {
  if (simFlag(search) !== "error") return false;
  return new URLSearchParams(search).get("at") === "load";
}

/** A non-breaking space before "·" keeps the separator on the previous word. */
const MIDDOT = "\u00A0· ";

/** One caption for a simulated sovereign turn. A handoff replaces the generic label. */
export function sovereignPreviewCaption(
  locale: "en" | "pl",
  simulatedLabel: string,
  handoff: boolean,
  simulated: boolean,
): string | null {
  if (!simulated) return null;
  if (handoff) return previewChip("handoff", locale);
  return simulatedLabel;
}

export function previewChip(flag: SimFlag | null, locale: "en" | "pl" = "en"): string | null {
  if (locale === "pl" && flag === "error") return `Podgląd${MIDDOT}symulowany błąd`;
  if (locale === "pl" && flag === "handoff") return `Podgląd${MIDDOT}symulowane przekazanie`;
  if (flag === "error") return `Preview${MIDDOT}simulated error`;
  if (flag === "handoff") return `Preview${MIDDOT}simulated handoff`;
  if (flag === "slow") return `Preview${MIDDOT}simulated slow`;
  if (flag === "timeout") return `Preview${MIDDOT}simulated timeout`;
  if (flag === "typing") return `Preview${MIDDOT}simulated typing`;
  return null;
}
