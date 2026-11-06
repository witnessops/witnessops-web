"use client";

import { useEffect, useId, useState } from "react";
import styles from "./sovereign-booking-preview.module.css";

type Mode = "disabled" | "unavailable" | "ready";
type MailAcceptance = "not_sent" | "accepted" | "rejected" | "unknown";
type BookingStatus = "insert_started" | "event_recorded" | "released_external_overlap" | "overlap_unknown" | "cancelled" | "cancel_unknown" | "insert_rejected";
type Slot = { id: string; start: string; end: string };
type Draft = { topic: string; stage: "planned" | "live"; name: string; email: string; timezone: string };
export type LiveBookingView = {
  reference: string;
  slot: Slot;
  draft: Draft;
  status: BookingStatus;
  calendarEvent: "not_recorded" | "recorded" | "unknown";
  mail: {
    confirmation: MailAcceptance;
    invite: MailAcceptance;
    cancellationNotice: MailAcceptance;
    cancellationInvite: MailAcceptance;
    delivery: "not_observed";
  };
  googleNotifications: "suppressed_send_updates_none";
  delivery: "not_observed";
  cancelToken?: string;
};

const COPY = {
  en: {
    button: "Scheduling",
    disabledHint: "Not enabled",
    unavailableHint: "Unavailable",
    readyHint: "20 minutes",
    disabled: "Live scheduling is not enabled. No time is held and no message is sent.",
    unavailable: "Live scheduling is unavailable because server configuration is incomplete. No time is held and no message is sent.",
    title: "Schedule a 20-minute fit call",
    boundary: "A fit call is a conversation. Delivery timing per signed SOW.",
    topic: "What should the conversation cover?",
    times: "See open times",
    checking: "Checking the engage calendar…",
    none: "No open times in the next two weeks.",
    contact: "Who should receive the messages?",
    emailHint: "A scheduling code is sent only after you ask for it. Asking does not hold a time.",
    sendCode: "Send scheduling code",
    code: "Scheduling code",
    codeSent: "The mail provider accepted the scheduling code. That is not inbox delivery.",
    codeUnknown: "Acceptance of the scheduling code is unknown. Do not assume it arrived.",
    codeRejected: "The scheduling code was not accepted by the mail provider. No time is held.",
    codeMatched: "The code matched. The mailbox was not independently checked beyond this code.",
    hold: "This time is held, not booked.",
    confirm: "Record this time",
    back: "Back",
    delivery: "Inbox delivery is not observed.",
    google: "Google is asked not to send its own invitation. Google’s API says some mail might still be sent.",
    again: "Check the unfinished step again",
    cancel: "Cancel this calendar event",
    recover: "Cancel with a code",
    close: "Back to chat",
  },
  pl: {
    button: "Termin",
    disabledHint: "Nie jest włączone",
    unavailableHint: "Niedostępne",
    readyHint: "20 minut",
    disabled: "Planowanie na żywo nie jest włączone. Termin nie jest trzymany i wiadomość nie jest wysyłana.",
    unavailable: "Planowanie na żywo jest niedostępne, bo konfiguracja serwera jest niepełna. Termin nie jest trzymany i wiadomość nie jest wysyłana.",
    title: "Umówienie 20-minutowej rozmowy wstępnej",
    boundary: "To rozmowa wstępna. Delivery timing per signed SOW.",
    topic: "Czego ma dotyczyć rozmowa?",
    times: "Pokaż wolne terminy",
    checking: "Sprawdzam kalendarz engage…",
    none: "Brak wolnych terminów w ciągu najbliższych dwóch tygodni.",
    contact: "Kto ma dostać wiadomości?",
    emailHint: "Kod jest wysyłany dopiero na żądanie. Samo żądanie nie trzyma terminu.",
    sendCode: "Wyślij kod",
    code: "Kod",
    codeSent: "Dostawca poczty przyjął kod. To nie jest dostarczenie do skrzynki.",
    codeUnknown: "Nie wiadomo, czy dostawca przyjął kod. Nie zakładaj, że dotarł.",
    codeRejected: "Dostawca poczty nie przyjął kodu. Termin nie jest trzymany.",
    codeMatched: "Kod się zgadza. Skrzynka nie została sprawdzona inaczej niż tym kodem.",
    hold: "Ten termin jest tylko tymczasowo trzymany.",
    confirm: "Zapisz ten termin",
    back: "Wstecz",
    delivery: "Dostarczenie do skrzynki nie jest obserwowane.",
    google: "Google jest proszone, aby nie wysyłało własnego zaproszenia. API Google mówi, że jakaś wiadomość może zostać wysłana.",
    again: "Sprawdź niedokończony krok ponownie",
    cancel: "Anuluj zdarzenie w kalendarzu",
    recover: "Anuluj kodem",
    close: "Wróć do czatu",
  },
} as const;

function formatSlot(slot: Slot, timeZone: string, locale: "en" | "pl"): string {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "shortOffset",
  }).format(new Date(slot.start));
}

function mailLine(locale: "en" | "pl", label: string, value: MailAcceptance): string {
  const names = locale === "pl"
    ? { not_sent: "niewysłane", accepted: "przyjęte przez dostawcę", rejected: "odrzucone", unknown: "wynik nieznany" }
    : { not_sent: "not sent", accepted: "accepted by the mail provider", rejected: "rejected", unknown: "acceptance unknown" };
  return `${label}: ${names[value]}.`;
}

export function liveBookingStatusLines(locale: "en" | "pl", booking: LiveBookingView): string[] {
  const en = locale === "en";
  const lines = [en ? `Calendar event: ${booking.calendarEvent}.` : `Zdarzenie kalendarza: ${booking.calendarEvent}.`, mailLine(locale, en ? "Confirmation" : "Potwierdzenie", booking.mail.confirmation), mailLine(locale, en ? "Invitation" : "Zaproszenie", booking.mail.invite), COPY[locale].delivery, COPY[locale].google];
  switch (booking.status) {
    case "insert_started":
    case "overlap_unknown":
    case "cancel_unknown":
      lines.unshift(en ? "The calendar result is unknown. This is not a completed scheduling result." : "Wynik kalendarza jest nieznany. To nie jest zakończone planowanie.");
      break;
    case "event_recorded":
      lines.unshift(en ? "A calendar event was recorded. Mail acceptance is separate from that event." : "Zdarzenie kalendarza zostało zapisane. Przyjęcie poczty jest osobne od tego zdarzenia.");
      break;
    case "released_external_overlap":
      lines.unshift(en ? "The time overlapped another calendar event, so this event was not kept." : "Termin pokrywał się z innym zdarzeniem, więc to zdarzenie nie zostało zachowane.");
      break;
    case "insert_rejected":
      lines.unshift(en ? "The calendar rejected the event. Nothing was kept." : "Kalendarz odrzucił zdarzenie. Nic nie zostało zachowane.");
      break;
    case "cancelled":
      lines.unshift(en ? "Cancellation was recorded. This is not an active calendar event." : "Anulowanie zostało zapisane. To nie jest aktywne zdarzenie kalendarza.");
      lines.push(mailLine(locale, en ? "Cancellation notice" : "Informacja o anulowaniu", booking.mail.cancellationNotice));
      lines.push(mailLine(locale, en ? "Cancellation invitation" : "Odwołanie zaproszenia", booking.mail.cancellationInvite));
      break;
    default: {
      const unreachable: never = booking.status;
      return [String(unreachable)];
    }
  }
  return lines;
}

async function postJson(body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch("/api/live-booking", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "unavailable");
  return data;
}

export function LiveBookingOffer({ locale, pending, onOpen }: { locale: "en" | "pl"; pending: boolean; onOpen: (mode: Mode) => void }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const copy = COPY[locale];
  useEffect(() => {
    let active = true;
    void fetch("/api/live-booking", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { mode?: string }) => {
        if (!active) return;
        setMode(body.mode === "ready" || body.mode === "disabled" || body.mode === "unavailable" ? body.mode : "unavailable");
      })
      .catch(() => { if (active) setMode("unavailable"); });
    return () => { active = false; };
  }, []);
  if (mode !== "ready") return null;
  return <button type="button" onClick={() => onOpen(mode)} disabled={pending}>{copy.button}<small>{copy.readyHint}</small></button>;
}

export function LiveBookingResult({ locale, booking }: { locale: "en" | "pl"; booking: LiveBookingView }) {
  return <div data-live-booking-status={booking.status} data-calendar-event={booking.calendarEvent} data-mail-delivery={booking.delivery}>
    {liveBookingStatusLines(locale, booking).map((line) => <p key={line}>{line}</p>)}
    <p>Reference {booking.reference}</p>
  </div>;
}

export function SovereignLiveBooking({ locale, onClose }: { locale: "en" | "pl"; onClose: () => void }) {
  const copy = COPY[locale];
  const id = useId();
  const [mode, setMode] = useState<Mode | "loading">("loading");
  const [step, setStep] = useState<"topic" | "times" | "contact" | "code" | "review" | "result">("topic");
  const [draft, setDraft] = useState<Draft>({ topic: "", stage: "planned", name: "", email: "", timezone: "Europe/Warsaw" });
  const [token, setToken] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState("");
  const [code, setCode] = useState("");
  const [codeNote, setCodeNote] = useState("");
  const [holdId, setHoldId] = useState("");
  const [booking, setBooking] = useState<LiveBookingView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoverReference, setRecoverReference] = useState("");
  const [recoverCode, setRecoverCode] = useState("");

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) setDraft((value) => ({ ...value, timezone: zone }));
    void fetch("/api/live-booking", { cache: "no-store" }).then((response) => response.json()).then((body: { mode?: Mode }) => {
      setMode(body.mode === "ready" || body.mode === "disabled" ? body.mode : "unavailable");
    }).catch(() => setMode("unavailable"));
  }, []);

  async function ensureToken(): Promise<string> {
    if (token) return token;
    const started = await postJson({ action: "start" });
    const next = String(started.token ?? "");
    setToken(next);
    return next;
  }

  async function showTimes() {
    setBusy(true);
    setError("");
    try {
      const current = await ensureToken();
      const data = await postJson({ action: "availability", token: current });
      setSlots((data.slots as Slot[]) ?? []);
      setStep("times");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(idempotencyKey: string) {
    setBusy(true);
    setError("");
    try {
      const current = await ensureToken();
      const data = await postJson({ action: "request-code", token: current, email: draft.email, idempotencyKey: idempotencyKey || `code-${crypto.randomUUID()}` });
      const acceptance = data.acceptance;
      setCodeNote(acceptance === "accepted" ? copy.codeSent : acceptance === "unknown" ? copy.codeUnknown : copy.codeRejected);
      setStep("code");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function matchCode() {
    setBusy(true);
    setError("");
    try {
      const current = await ensureToken();
      const matched = await postJson({ action: "check-code", token: current, email: draft.email, code });
      if (matched.code !== "matched") {
        setError(String(matched.code));
        return;
      }
      const prepared = await postJson({ action: "prepare", token: current, slotId, draft });
      const hold = prepared.hold as { id: string };
      setHoldId(hold.id);
      setCodeNote(copy.codeMatched);
      setStep("review");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const current = await ensureToken();
      const data = await postJson({ action: "confirm", token: current, holdId, idempotencyKey: `confirm-${holdId}` });
      setBooking(data.booking as LiveBookingView);
      setStep("result");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function cancelCurrent() {
    if (!booking) return;
    setBusy(true);
    try {
      const data = token
        ? await postJson({ action: "cancel", token, reference: booking.reference })
        : await postJson({ action: "cancel-with-code", cancelToken: booking.cancelToken, reference: booking.reference });
      setBooking(data.booking as LiveBookingView);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function recover() {
    setBusy(true);
    setError("");
    try {
      const data = await postJson({ action: "cancel-with-code", cancelToken: recoverCode, reference: recoverReference });
      setBooking(data.booking as LiveBookingView);
      setStep("result");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "unavailable");
    } finally {
      setBusy(false);
    }
  }

  const selected = slots.find((slot) => slot.id === slotId);

  return <section className={styles.panel} data-live-booking="" aria-labelledby={`${id}-title`}>
    <p className={styles.badge}>{mode === "ready" ? copy.readyHint : mode === "disabled" ? copy.disabledHint : copy.unavailableHint}</p>
    <h3 id={`${id}-title`}>{copy.title}</h3>
    {mode === "loading" ? <p role="status">{copy.checking}</p> : null}
    {mode === "disabled" ? <p role="status">{copy.disabled}</p> : null}
    {mode === "unavailable" ? <p role="status">{copy.unavailable}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {mode === "ready" && step === "topic" ? <form onSubmit={(event) => { event.preventDefault(); void showTimes(); }}>
      <label htmlFor={`${id}-topic`}>{copy.topic}</label>
      <textarea id={`${id}-topic`} required minLength={5} maxLength={300} value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} />
      <button className={styles.primary} type="submit" disabled={busy || draft.topic.trim().length < 5}>{copy.times}</button>
    </form> : null}
    {mode === "ready" && step === "times" ? <div>
      <div className={styles.slots} aria-busy={busy}>{busy ? <p>{copy.checking}</p> : slots.length === 0 ? <p>{copy.none}</p> : slots.slice(0, 8).map((slot) => <button type="button" key={slot.id} aria-pressed={slotId === slot.id} onClick={() => setSlotId(slot.id)}>{formatSlot(slot, draft.timezone, locale)}</button>)}</div>
      <button type="button" onClick={() => setStep("topic")}>{copy.back}</button>
      <button className={styles.primary} type="button" disabled={!selected || busy} onClick={() => setStep("contact")}>{copy.contact}</button>
    </div> : null}
    {mode === "ready" && step === "contact" ? <form onSubmit={(event) => { event.preventDefault(); void sendCode(""); }}>
      <label htmlFor={`${id}-name`}>Name</label>
      <input id={`${id}-name`} required minLength={2} maxLength={80} autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <label htmlFor={`${id}-email`}>Email</label>
      <input id={`${id}-email`} type="email" required maxLength={200} autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className={styles.note}>{copy.emailHint}</p>
      <button type="button" onClick={() => setStep("times")}>{copy.back}</button>
      <button className={styles.primary} type="submit" disabled={busy}>{copy.sendCode}</button>
    </form> : null}
    {mode === "ready" && step === "code" ? <form onSubmit={(event) => { event.preventDefault(); void matchCode(); }}>
      {codeNote ? <p role="status">{codeNote}</p> : null}
      <label htmlFor={`${id}-code`}>{copy.code}</label>
      <input id={`${id}-code`} inputMode="numeric" autoComplete="one-time-code" required pattern="\d{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
      <button type="button" onClick={() => setStep("contact")}>{copy.back}</button>
      <button className={styles.primary} type="submit" disabled={busy || code.length !== 6}>{copy.code}</button>
    </form> : null}
    {mode === "ready" && step === "review" && selected ? <div>
      <p className={styles.note}>{copy.hold}</p>
      <p>{copy.codeMatched}</p>
      <p>{formatSlot(selected, draft.timezone, locale)}</p>
      <p>{draft.name}<br />{draft.email}</p>
      <p>{draft.topic}</p>
      <p>{copy.boundary}</p>
      <p>{copy.delivery}</p>
      <button type="button" onClick={() => setStep("times")}>{copy.back}</button>
      <button className={styles.primary} type="button" disabled={busy} onClick={() => void confirm()}>{copy.confirm}</button>
    </div> : null}
    {step === "result" && booking ? <div>
      <LiveBookingResult locale={locale} booking={booking} />
      {booking.cancelToken ? <p>Cancellation code {booking.cancelToken}</p> : null}
      {booking.status === "insert_started" || booking.status === "overlap_unknown" || booking.status === "cancel_unknown" || (booking.status === "event_recorded" && (booking.mail.confirmation !== "accepted" || booking.mail.invite !== "accepted")) ? <button type="button" disabled={busy} onClick={() => void confirm()}>{copy.again}</button> : null}
      {booking.status === "event_recorded" || booking.status === "overlap_unknown" || booking.status === "cancel_unknown" || booking.status === "insert_started" ? <button type="button" disabled={busy} onClick={() => void cancelCurrent()}>{copy.cancel}</button> : null}
    </div> : null}
    {mode === "ready" ? <form onSubmit={(event) => { event.preventDefault(); void recover(); }}>
      <p>{copy.recover}</p>
      <label htmlFor={`${id}-reference`}>Reference</label>
      <input id={`${id}-reference`} value={recoverReference} onChange={(event) => setRecoverReference(event.target.value.trim())} />
      <label htmlFor={`${id}-recover`}>Code</label>
      <input id={`${id}-recover`} value={recoverCode} onChange={(event) => setRecoverCode(event.target.value.trim())} autoComplete="off" />
      <button type="submit" disabled={busy}>{copy.recover}</button>
    </form> : null}
    <button type="button" onClick={onClose}>{copy.close}</button>
  </section>;
}
