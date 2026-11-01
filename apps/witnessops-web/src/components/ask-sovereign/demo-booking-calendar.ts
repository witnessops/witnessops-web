/** Fictional, session memory only. Never a real calendar or authorization service. */
export const DEMO_HOLD_MS = 2 * 60_000;
export const DEMO_EMAIL_CODE = "314159";
export type BookingDraft = { topic: string; stage: "planned" | "live"; name: string; email: string; timezone: string };
export type DemoSlot = { id: string; start: string; end: string };
export type DemoBooking = { reference: string; slot: DemoSlot; details: BookingDraft; revision: number; status: "confirmed" | "cancelled" };
export type DemoHold = { id: string; slot: DemoSlot; details: BookingDraft; expiresAt: number; replaces?: string };
export type BookingError = "unavailable" | "expired" | "invalid";

export class DemoBookingError extends Error {
  constructor(public readonly code: BookingError) { super(code); }
}

export function validDraft(draft: BookingDraft): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: draft.timezone }); } catch { return false; }
  return draft.topic.trim().length >= 5 && draft.topic.length <= 300 && draft.name.trim().length >= 2 && draft.name.length <= 80
    && draft.email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)
    && (draft.stage === "planned" || draft.stage === "live");
}

export function formatDemoSlot(slot: DemoSlot, timezone: string, locale: "en" | "pl"): string {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    timeZone: timezone, weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "shortOffset",
  }).format(new Date(slot.start));
}

export function slotPeriod(slot: DemoSlot, timezone: string): "morning" | "afternoon" {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(new Date(slot.start)));
  return hour < 12 ? "morning" : "afternoon";
}

export class DemoBookingCalendar {
  private slots: DemoSlot[] = [];
  private blocked = new Set<string>();
  private holds = new Map<string, DemoHold>();
  private bookings = new Map<string, DemoBooking>();
  private completed = new Map<string, string>();
  private sequence = 0;

  constructor(private readonly now: () => number = Date.now) {
    const today = new Date(now());
    // A rolling fictional weekday calendar; UTC instants avoid ambiguous DST times.
    for (let day = 1; day <= 14; day++) {
      for (const hour of [9, 12, 15]) {
        const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + day, hour));
        if ([0, 6].includes(start.getUTCDay())) continue;
        const id = start.toISOString();
        this.slots.push({ id, start: id, end: new Date(start.getTime() + 20 * 60_000).toISOString() });
      }
    }
    // Existing fictional appointments make the sample calendar non-empty.
    this.slots.filter((_, index) => index % 5 === 1).forEach((slot) => this.blocked.add(slot.id));
  }

  available(replaces?: string): DemoSlot[] {
    return this.slots.filter((slot) => this.isAvailable(slot.id, replaces)).map((slot) => ({ ...slot }));
  }

  private isAvailable(slotId: string, replaces?: string, ownHold?: string): boolean {
    const slot = this.slots.find((candidate) => candidate.id === slotId);
    if (!slot || Date.parse(slot.start) <= this.now() || this.blocked.has(slotId)) return false;
    for (const booking of this.bookings.values()) {
      if (booking.reference !== replaces && booking.status === "confirmed" && booking.slot.id === slotId) return false;
    }
    for (const hold of this.holds.values()) {
      if (hold.id !== ownHold && hold.slot.id === slotId && hold.expiresAt > this.now()) return false;
    }
    return true;
  }

  prepare(slotId: string, details: BookingDraft, replaces?: string): DemoHold {
    if (!validDraft(details)) throw new DemoBookingError("invalid");
    if (!this.isAvailable(slotId, replaces)) throw new DemoBookingError("unavailable");
    if (replaces && this.bookings.get(replaces)?.status !== "confirmed") throw new DemoBookingError("invalid");
    const hold: DemoHold = {
      id: `hold-${++this.sequence}`, slot: { ...this.slots.find((slot) => slot.id === slotId)! },
      details: { ...details, topic: details.topic.trim(), name: details.name.trim(), email: details.email.trim().toLowerCase() },
      expiresAt: this.now() + DEMO_HOLD_MS, replaces,
    };
    this.holds.set(hold.id, hold);
    return structuredClone(hold);
  }

  release(holdId?: string) { if (holdId) this.holds.delete(holdId); }

  confirm(holdId: string): DemoBooking {
    const prior = this.completed.get(holdId);
    if (prior) return structuredClone(this.bookings.get(prior)!);
    const hold = this.holds.get(holdId);
    if (!hold || hold.expiresAt <= this.now()) { this.release(holdId); throw new DemoBookingError("expired"); }
    if (!this.isAvailable(hold.slot.id, hold.replaces, holdId)) { this.release(holdId); throw new DemoBookingError("unavailable"); }
    const previous = hold.replaces ? this.bookings.get(hold.replaces) : undefined;
    if (hold.replaces && previous?.status !== "confirmed") throw new DemoBookingError("invalid");
    const booking: DemoBooking = {
      reference: previous?.reference ?? `DEMO-${String(++this.sequence).padStart(4, "0")}`,
      slot: { ...hold.slot }, details: { ...hold.details }, revision: (previous?.revision ?? 0) + 1, status: "confirmed",
    };
    this.bookings.set(booking.reference, booking);
    this.completed.set(holdId, booking.reference);
    this.release(holdId);
    return structuredClone(booking);
  }

  cancel(reference: string): DemoBooking {
    const booking = this.bookings.get(reference);
    if (!booking) throw new DemoBookingError("invalid");
    if (booking.status !== "cancelled") { booking.status = "cancelled"; booking.revision++; }
    for (const hold of this.holds.values()) if (hold.replaces === reference) this.release(hold.id);
    return structuredClone(booking);
  }

  /** Preview controls only, to demonstrate a race or expired confirmation. */
  simulateConflict(slotId: string) { this.blocked.add(slotId); }
  expire(holdId: string) { const hold = this.holds.get(holdId); if (hold) hold.expiresAt = this.now() - 1; }
}
