import { BUYER_SERVICES, type BuyerService } from "@/lib/buyer-services";

export const ASK_EVENTS = ["opened", "answered", "offer_selected", "contact_started", "mailbox_confirmed", "feedback"] as const;
export type AskEvent = (typeof ASK_EVENTS)[number];
export type AskEventProperties = {
  surface?: "widget" | "page" | "inline";
  service_id?: BuyerService["id"];
  outcome?: "generated" | "guide" | "unavailable";
  feedback?: "helpful" | "not_helpful";
};

/** Fixed categories only. Never accept a question, email, URL or visitor ID. */
export function normalizeAskEvent(value: unknown): ({ event: AskEvent } & AskEventProperties) | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["event", "surface", "service_id", "outcome", "feedback"].includes(key))) return null;
  if (!ASK_EVENTS.includes(record.event as AskEvent)) return null;
  if (record.surface !== undefined && !["widget", "page", "inline"].includes(record.surface as string)) return null;
  if (record.service_id !== undefined && !BUYER_SERVICES.some((service) => service.id === record.service_id)) return null;
  if (record.outcome !== undefined && !["generated", "guide", "unavailable"].includes(record.outcome as string)) return null;
  if (record.feedback !== undefined && !["helpful", "not_helpful"].includes(record.feedback as string)) return null;
  if ((record.event === "feedback") !== (record.feedback !== undefined)) return null;
  if (record.outcome !== undefined && record.event !== "answered") return null;
  return { ...record } as { event: AskEvent } & AskEventProperties;
}

export function trackAskEvent(event: AskEvent, properties: AskEventProperties = {}): void {
  if (typeof window === "undefined" || navigator.doNotTrack === "1" ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  const telemetry = normalizeAskEvent({ event, ...properties });
  if (!telemetry) return;
  // Existing same-origin endpoint and log collection; no cookie or tracking SDK.
  // Measurement is best-effort and must never block the buyer's next step.
  void fetch("/api/ask-witnessops", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-WitnessOps-Event": "1" },
    body: JSON.stringify({ telemetry }),
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
  }).catch(() => undefined);
}
