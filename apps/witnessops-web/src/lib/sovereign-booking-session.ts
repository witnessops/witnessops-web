import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { bookingBusinessFacts } from "./sovereign-booking-business";
import { DemoBookingCalendar, DemoBookingError, slotPeriod, formatDemoSlot, type DemoHold, type DemoBooking } from "@/components/ask-sovereign/demo-booking-calendar";

export const draftSchema = z.object({ topic: z.string().trim().min(5).max(300), stage: z.enum(["planned", "live"]), name: z.string().trim().min(2).max(80), email: z.string().email().max(200), timezone: z.string().max(80).refine((zone) => { try { new Intl.DateTimeFormat("en", { timeZone: zone }); return true; } catch { return false; } }) }).strict();
export const proposalSchema = draftSchema.extend({ slotId: z.string().max(80), revision: z.number().int().nonnegative() }).strict();
export const searchSchema = z.object({ timezone: draftSchema.shape.timezone, day: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/), period: z.enum(["all", "morning", "afternoon"]) }).strict();

export class BookingSession {
  readonly calendar = new DemoBookingCalendar();
  readonly token = randomBytes(32).toString("hex");
  readonly createdAt = Date.now();
  touchedAt = Date.now();
  revision = 0;
  hold: DemoHold | null = null;
  booking: DemoBooking | null = null;
  proposal: (z.infer<typeof draftSchema> & { slotId: string; revision: number }) | null = null;
  lastConfirmed: string | null = null;
  voice: { stop: () => Promise<boolean>; notify: (content: string) => void; status: string; lastHeartbeat: number } | null = null;
  voiceStarting = false;
  voiceGeneration = 0;
  voiceStarts = 0;
  search: Array<{ id: string; label: string }> = [];

  invalidate() { this.revision++; this.calendar.release(this.hold?.id); this.hold = null; this.proposal = null; }
  view() { return { revision: this.revision, hold: this.hold, booking: this.booking, proposal: this.proposal, voice: this.voice?.status ?? "off", search: this.search }; }
  tool(name: string, input: unknown, expectedRevision: number) {
    if (expectedRevision !== this.revision) return { error: "preferences_changed", revision: this.revision, instruction: "Use the latest user request. Previous results are stale." };
    if (name === "get_witnessops_information") {
      const { locale } = z.object({ locale: z.enum(["en", "pl"]) }).strict().parse(input);
      return bookingBusinessFacts(locale);
    }
    if (name === "check_availability") {
      const query = searchSchema.parse(input);
      const slots = this.calendar.available(this.booking?.status === "confirmed" ? this.booking.reference : undefined).filter((slot) => (!query.day || new Intl.DateTimeFormat("en-CA", { timeZone: query.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(slot.start)) === query.day) && (query.period === "all" || slotPeriod(slot, query.timezone) === query.period));
      this.search = slots.slice(0, 12).map((slot) => ({ id: slot.id, label: formatDemoSlot(slot, query.timezone, "en") }));
      return { revision: this.revision, timezone: query.timezone, slots: slots.slice(0, 12).map((slot) => ({ ...slot, label: formatDemoSlot(slot, query.timezone, "en") })), fictional: true, booking: this.booking };
    }
    if (name === "propose_booking") {
      const data = proposalSchema.parse(input);
      if (data.revision !== this.revision) return { error: "preferences_changed", revision: this.revision };
      if (!this.calendar.available(this.booking?.reference).some((slot) => slot.id === data.slotId)) throw new DemoBookingError("unavailable");
      this.invalidate();
      this.proposal = { ...data, revision: this.revision };
      return { proposal: this.proposal, saved: false, instruction: "The application will end voice automatically and open editable contact details. The user must continue to the demo email check, enter the displayed demo code, then review and press Confirm demo booking. Do not direct the user to type while voice is active. Nothing is booked; no real appointment or email is created." };
    }
    return { error: "unsupported_tool" };
  }
}

// Process-local demo data only. Production routes never instantiate this store.
const globalStore = globalThis as typeof globalThis & { sovereignBookingStore?: Map<string, BookingSession> };
export function sessions() { return globalStore.sovereignBookingStore ??= new Map(); }
export function expireSessions() {
  for (const [token, session] of sessions()) {
    if (Date.now() - session.touchedAt > 20 * 60_000) {
      session.voiceGeneration++; void session.voice?.stop(); sessions().delete(token);
    }
  }
}
