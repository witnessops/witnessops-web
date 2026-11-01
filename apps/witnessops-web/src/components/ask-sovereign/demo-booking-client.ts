import { DEMO_EMAIL_CODE, DemoBookingError, type BookingDraft, type DemoHold, type DemoBooking, type DemoSlot } from "./demo-booking-calendar";

export class DemoBookingRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "DemoBookingRequestError"; }
}

export function bookingConnectionError(reason: unknown, locale: "en" | "pl") {
  const pl = locale === "pl";
  if (reason instanceof DemoBookingRequestError) {
    if (reason.status === 429) return pl ? "Wersja demonstracyjna jest zajęta. Poczekaj chwilę i spróbuj ponownie." : "The demo is busy. Wait a moment, then try again.";
    if (reason.status === 401) return pl ? "Sesja demonstracyjna wygasła. Odśwież stronę, aby zacząć ponownie." : "This demo session expired. Reload the page to start again.";
    if (reason.status === 410) return pl ? "Rezerwacje nie są tutaj włączone." : "Booking isn’t enabled here.";
  }
  if (reason instanceof Error && reason.name === "TimeoutError") return pl ? "Kalendarz nie odpowiedział na czas. Spróbuj ponownie." : "The demo calendar took too long to respond. Try again.";
  if (reason instanceof TypeError) return pl ? "Nie udało się połączyć z kalendarzem. Spróbuj ponownie." : "Couldn’t connect to the demo calendar. Try again.";
  return pl ? "Nie udało się ukończyć żądania rezerwacji. Spróbuj ponownie." : "The booking request couldn’t be completed. Try again.";
}

export type BookingView = { revision: number; hold: DemoHold | null; booking: DemoBooking | null; proposal: (BookingDraft & { slotId: string; revision: number }) | null; voice: string; search: Array<{ id: string; label: string }> };
export class DemoBookingClient {
  token = "";
  voiceAvailable = false;
  private starting?: Promise<void>;
  private pending = Promise.resolve();
  async ready() {
    this.starting ??= this.request<{ token: string; voiceAvailable: boolean }>("start").then((data) => { this.token = data.token; this.voiceAvailable = data.voiceAvailable; }).catch((reason) => { this.starting = undefined; throw reason; });
    return this.starting;
  }
  async request<T = Record<string, unknown>>(action: string, data = {}): Promise<T> {
    const response = await fetch("/api/sovereign-booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(this.token ? { token: this.token } : {}), ...data }), signal: AbortSignal.timeout(action === "voice-start" ? 45_000 : 15_000), cache: "no-store" });
    const result = await response.json();
    if (!response.ok) { if (["expired", "unavailable", "invalid"].includes(result.error)) throw new DemoBookingError(result.error); throw new DemoBookingRequestError(result.error ?? "preview_unavailable", response.status); }
    return result;
  }
  async available() { await this.ready(); await this.pending; return (await this.request<{ slots: DemoSlot[] }>("availability")).slots; }
  async prepare(slotId: string, draft: BookingDraft, replaces?: string) { await this.ready(); await this.pending; return (await this.request<{ hold: DemoHold }>("prepare", { slotId, draft, replaces, code: DEMO_EMAIL_CODE })).hold; }
  release() { this.pending = this.pending.catch(() => {}).then(async () => { await this.ready(); await this.request("release"); }); return this.pending; }
  async confirm(holdId: string) { await this.pending; return (await this.request<{ booking: DemoBooking }>("confirm", { holdId })).booking; }
  async cancel(reference: string) { await this.pending; return (await this.request<{ booking: DemoBooking }>("cancel", { reference })).booking; }
  async simulateConflict() { await this.request("conflict"); }
  async expire() { await this.request("expire"); }
  async state() { return this.request<BookingView>("read"); }
  unload() { if (this.token) navigator.sendBeacon("/api/sovereign-booking", new Blob([JSON.stringify({ action: "end", token: this.token })], { type: "application/json" })); }
}
