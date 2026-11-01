"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { DemoBookingError, DEMO_EMAIL_CODE, formatDemoSlot, slotPeriod, type BookingDraft, type DemoBooking, type DemoHold, type DemoSlot } from "./demo-booking-calendar";
import { bookingConnectionError, DemoBookingClient, type BookingView } from "./demo-booking-client";
import { BookingVoiceClient, type VoiceStatus } from "./booking-voice-client";
import { previewTriggersEnabled } from "./preview-triggers";
import styles from "./sovereign-booking-preview.module.css";

type Step = "context" | "times" | "contact" | "verify" | "review" | "booked" | "cancel" | "ended";
const COPY = {
  en: {
    start: "Book a fit call", demo: "Fictional calendar · Preview", title: "Let’s find a time to talk.",
    notice: "Fictional 20-minute call. Use made-up details. No real appointment or email; reloading clears this preview.",
    context: "What would you like to discuss?", topic: "One agent or automation action", placeholder: "For example, an agent that approves refunds", stage: "Where is it today?", planned: "Still being built", live: "Already live", times: "Find available times",
    timeTitle: "Choose a time", zone: "Your timezone", period: "Time of day", all: "Any time", morning: "Morning", afternoon: "Afternoon", checking: "Checking the demo calendar…", available: "Available times", more: "More times", none: "No times match. Try another time of day.", select: "Continue with this time", back: "Back to questions", change: "Change details", changeTime: "Change time",
    contact: "Who is the call for?", name: "Name", email: "Email", emailHint: "Demo details only. No message will be sent.", next: "Continue to demo email check", verify: "Try the email check", code: "Demo code", codeHint: "No email was sent. Enter the displayed demo code:", verifyButton: "Check demo code", badCode: "Use the demo code shown above. No real mailbox is being verified.", checked: "Demo email check completed — not a verified mailbox.",
    review: "Review your fit call", confirm: "Confirm demo booking", summary: "What we’ll discuss", duration: "20 minutes", boundary: "A fit call is a conversation. Review scope and delivery timing are agreed separately.", hold: "This demo selection is held for two minutes. Confirm these exact details.",
    booked: "Demo call booked", reference: "Booking reference", local: "Saved in this preview only. No invitation was sent and no meeting link was created.", reschedule: "Reschedule", rescheduling: "Choose a replacement. Your original demo booking stays in place until you confirm.", cancel: "Cancel booking", cancelTitle: "Cancel this demo call?", cancelYes: "Yes, cancel demo booking", keep: "Keep booking", cancelled: "Demo booking cancelled", finish: "Finish preview", finished: "Preview finished", finishHint: "Your microphone is off. You can return to questions or view your demo booking.", view: "View demo booking", again: "Try another booking", controls: "Try a booking problem", conflict: "Make this slot unavailable", expire: "Expire this confirmation", simulated: "Demo condition applied. Try confirming to see the recovery flow.", expired: "That confirmation expired. Choose a time again; nothing new was booked.", unavailable: "That time is no longer available. Choose another; nothing new was booked.", invalid: "Check your details and choose a time again.", contactLink: "Prefer to request a callback?", pending: "Not booked yet", voice: "Fictional demo only. Voice ends before final review.", progress: "Booking progress", detailsStep: "Your topic", timeStep: "Time", contactStep: "Contact", reviewStep: "Confirm",
  },
  pl: {
    start: "Umów rozmowę", demo: "Fikcyjny kalendarz · Podgląd", title: "Znajdźmy czas na rozmowę.",
    notice: "Fikcyjna rozmowa, 20 minut. Użyj zmyślonych danych. Bez prawdziwego spotkania lub emaila; odświeżenie usuwa podgląd.",
    context: "O czym chcesz porozmawiać?", topic: "Jedno działanie agenta lub automatyzacji", placeholder: "Na przykład agent zatwierdzający zwroty", stage: "Na jakim jest etapie?", planned: "W budowie", live: "Już działa", times: "Znajdź dostępne terminy",
    timeTitle: "Wybierz termin", zone: "Twoja strefa czasowa", period: "Pora dnia", all: "Dowolna", morning: "Rano", afternoon: "Po południu", checking: "Sprawdzam fikcyjny kalendarz…", available: "Dostępne terminy", more: "Więcej terminów", none: "Brak pasujących terminów. Zmień porę dnia.", select: "Dalej z tym terminem", back: "Wróć do pytań", change: "Zmień dane", changeTime: "Zmień termin",
    contact: "Dla kogo jest rozmowa?", name: "Imię i nazwisko", email: "Email", emailHint: "Tylko fikcyjne dane. Nie wysyłamy wiadomości.", next: "Przejdź do próbnego sprawdzenia emaila", verify: "Wypróbuj sprawdzenie emaila", code: "Kod demonstracyjny", codeHint: "Nie wysłano emaila. Wpisz ten kod demonstracyjny:", verifyButton: "Sprawdź kod demonstracyjny", badCode: "Użyj kodu widocznego powyżej. Nie weryfikujemy prawdziwej skrzynki.", checked: "Próbne sprawdzenie zakończone — skrzynka nie została zweryfikowana.",
    review: "Sprawdź szczegóły rozmowy", confirm: "Potwierdź próbną rezerwację", summary: "Temat rozmowy", duration: "20 minut", boundary: "To rozmowa wstępna. Zakres i termin realizacji przeglądu uzgadniamy osobno.", hold: "Próbna blokada terminu trwa dwie minuty. Potwierdź te konkretne dane.",
    booked: "Próbna rozmowa zarezerwowana", reference: "Numer rezerwacji", local: "Zapisano tylko w podglądzie. Nie wysłano zaproszenia ani nie utworzono linku do spotkania.", reschedule: "Przełóż", rescheduling: "Wybierz nowy termin. Poprzednia próbna rezerwacja pozostaje do chwili potwierdzenia.", cancel: "Anuluj rezerwację", cancelTitle: "Anulować próbną rozmowę?", cancelYes: "Tak, anuluj próbną rezerwację", keep: "Zachowaj rezerwację", cancelled: "Próbna rezerwacja anulowana", finish: "Zakończ podgląd", finished: "Podgląd zakończony", finishHint: "Mikrofon jest wyłączony. Możesz wrócić do pytań lub obejrzeć próbną rezerwację.", view: "Pokaż próbną rezerwację", again: "Wypróbuj kolejną rezerwację", controls: "Wypróbuj problem z rezerwacją", conflict: "Oznacz termin jako niedostępny", expire: "Wygaś potwierdzenie", simulated: "Zastosowano warunek próbny. Spróbuj potwierdzić, aby zobaczyć odzyskiwanie.", expired: "Potwierdzenie wygasło. Wybierz ponownie termin; nie dodano rezerwacji.", unavailable: "Ten termin nie jest już dostępny. Wybierz inny; nie dodano rezerwacji.", invalid: "Sprawdź dane i ponownie wybierz termin.", contactLink: "Wolisz poprosić o kontakt?", pending: "Jeszcze bez rezerwacji", voice: "Tylko próba. Głos kończy się przed ostatecznym potwierdzeniem.", progress: "Postęp rezerwacji", detailsStep: "Temat", timeStep: "Termin", contactStep: "Kontakt", reviewStep: "Potwierdź",
  },
};
const emptyDraft = (): BookingDraft => ({ topic: "", stage: "planned", name: "Demo Visitor", email: "visitor@example.test", timezone: "Europe/Warsaw" });

export function SovereignBookingPreview({ locale, open }: { locale: "en" | "pl"; open: boolean }) {
  const c = COPY[locale];
  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => {
    setShowDebug(previewTriggersEnabled() && new URLSearchParams(window.location.search).get("bookingDebug") === "1");
  }, []);
  const id = useId();
  const calendar = useRef<DemoBookingClient | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const readingPosition = useRef({ step: "context" as Step, top: 0 });
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<Step>("context");
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [slots, setSlots] = useState<DemoSlot[]>([]);
  const [selected, setSelected] = useState("");
  const [period, setPeriod] = useState("all");
  const [limit, setLimit] = useState(3);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [hold, setHold] = useState<DemoHold | null>(null);
  const [booking, setBooking] = useState<DemoBooking | null>(null);
  const [replacing, setReplacing] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [checkedEmail, setCheckedEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const voice = useRef<BookingVoiceClient | null>(null);
  const proposalRevision = useRef(-1);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("off");
  const [voiceReady, setVoiceReady] = useState(false);
  const [bookingMethod, setBookingMethod] = useState<"type" | "voice">("type");
  const [voiceReview, setVoiceReview] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([]);
  const [voiceSlots, setVoiceSlots] = useState<Array<{ id: string; label: string }>>([]);
  const [saving, setSaving] = useState(false);
  const pl = locale === "pl";
  const voiceErrors: Record<string, string> = {
    NotAllowedError: pl ? "Mikrofon jest zablokowany. Wybierz Tekst, aby użyć formularza." : "Microphone access is blocked. Choose Type to continue with the form.",
    microphone_timeout: pl ? "Brak odpowiedzi mikrofonu. Możesz przejść dalej bez niego." : "The microphone did not respond. You can continue without it.",
    microphone_unavailable: pl ? "Ta przeglądarka nie udostępnia mikrofonu. Wybierz Tekst, aby użyć formularza." : "Microphone access is unavailable here. Choose Type to continue with the form.",
    connection_lost: pl ? "Nie udało się utrzymać połączenia głosowego. Wybierz Tekst, aby użyć formularza." : "The voice connection did not complete or was lost. Choose Type to continue with the form.",
    NotFoundError: pl ? "Nie znaleziono mikrofonu. Możesz użyć formularza." : "No microphone found. You can use the form.",
    NotReadableError: pl ? "Mikrofon jest zajęty. Zamknij inną aplikację i spróbuj ponownie." : "Your microphone is busy. Close the other app and try again.",
    sound_blocked: pl ? "Przeglądarka wstrzymała dźwięk. Naciśnij Włącz dźwięk." : "Your browser paused audio. Press Enable sound.",
    close_unconfirmed: pl ? "Mikrofon jest wyłączony. Nie otrzymano potwierdzenia zakończenia połączenia." : "Microphone off. The service did not confirm the final session status.",
    voice_not_configured: pl ? "Głos wymaga klucza na serwerze. Formularz nadal działa." : "Voice needs a server API key. The form is still available.",
    voice_busy_or_limit: pl ? "Osiągnięto limit połączeń próbnych. Użyj formularza." : "Demo voice limit reached. Continue with the form.",
  };
  useEffect(() => {
    const unload = () => { voice.current?.unload(); if (!voice.current) calendar.current?.unload(); };
    window.addEventListener("pagehide", unload);
    return () => { window.removeEventListener("pagehide", unload); unload(); };
  }, []);
  useEffect(() => {
    if (open) return;
    void voice.current?.stop();
    // Returning to Chat releases the pending selection.
    if (calendar.current) void calendar.current.release().catch((reason) => setError(bookingConnectionError(reason, locale)));
    setHold(null);
    setStep((current) => current === "review" ? "contact" : current);
  }, [open, locale]);
  function applyVoiceView(view: BookingView) {
    if (view.search) setVoiceSlots(view.search);
    if (!view.proposal || view.proposal.revision !== view.revision || view.proposal.revision <= proposalRevision.current) return;
    proposalRevision.current = view.proposal.revision;
    setDraft({ topic: view.proposal.topic, stage: view.proposal.stage, name: view.proposal.name, email: view.proposal.email, timezone: view.proposal.timezone }); setSelected(view.proposal.slotId); setHold(null); setCheckedEmail("");
    setReplacing(view.booking?.status === "confirmed" ? view.booking.reference : undefined);
    setStep("contact"); setError(""); setCode(""); setVoiceReview(true); setBookingMethod("type");
    // The proposal is the handoff to the form. Stop capture and polling before
    // allowing edits so a late voice result cannot overwrite the user's changes.
    void voice.current?.stop();
  }
  async function tryWithoutMicrophone() {
    setSaving(true);
    try {
      await voice.current?.stop();
      await calendar.current?.ready();
      setDraft((value) => ({ ...value, topic: value.topic.trim().length >= 5 ? value.topic : (pl ? "Agent zatwierdzający próbne zwroty" : "An agent that approves demo refunds") }));
      setVoiceError(""); setVoiceReview(false); showTimes();
    } catch (reason) { fail(reason); }
    finally { setSaving(false); }
  }
  function startVoice() {
    if (!calendar.current) return;
    invalidate(); setVoiceError(""); setVoiceReview(false); setMuted(false); setTranscript([]); setBookingMethod("voice");
    voice.current ??= new BookingVoiceClient(calendar.current, {
      state: setVoiceStatus,
      error: setVoiceError,
      view: applyVoiceView,
      transcript: (speaker, text) => setTranscript((rows) => {
        const previous = rows.at(-1);
        return previous?.speaker === speaker ? [...rows.slice(0, -1), { speaker, text: (previous.text + text).slice(-1200) }] : [...rows.slice(-7), { speaker, text }];
      }),
    });
    void voice.current.start(locale);
  }

  useLayoutEffect(() => {
    if (!open || voiceStatus !== "off") return;
    heading.current?.focus({ preventScroll: true });
    // A new step starts at the top; reopening the same step keeps its place.
    const top = readingPosition.current.step === step ? readingPosition.current.top : 0;
    readingPosition.current = { step, top };
    scroll.current?.scrollTo({ top });
  }, [open, step, voiceStatus]);

  const originalSlotId = replacing ? booking?.slot.id : undefined;

  useEffect(() => {
    if (!open || step !== "times") return;
    setBusy(true);
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const available = await calendar.current?.available() ?? [];
        if (active) setSlots(available.filter((slot) => slot.id !== originalSlotId && (period === "all" || slotPeriod(slot, draft.timezone) === period)));
      } catch (reason) { if (active) { setSlots([]); setError(bookingConnectionError(reason, locale)); } }
      finally { if (active) setBusy(false); }
    }, 150);
    return () => { active = false; window.clearTimeout(timer); };
  }, [open, step, period, draft.timezone, replacing, originalSlotId, refresh, locale]);

  function invalidate() { if (calendar.current) void calendar.current.release().catch((reason) => setError(bookingConnectionError(reason, locale))); setHold(null); setError(""); setNotice(""); }
  function go(next: Step) { invalidate(); setStep(next); }
  function showTimes() { invalidate(); setSelected(""); setLimit(3); setRefresh((n) => n + 1); setStep("times"); }
  useEffect(() => {
    if (!open) return;
    // Opening from chat and returning to an existing draft share one calendar.
    if (!calendar.current) {
      calendar.current = new DemoBookingClient();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDraft((value) => ({ ...value, timezone }));
    }
    let active = true;
    const client = calendar.current;
    void client.ready().then(() => {
      if (active) setVoiceReady(client.voiceAvailable);
    }).catch((reason) => { if (active) setError(bookingConnectionError(reason, locale)); });
    return () => { active = false; };
  }, [open, locale]);
  function fail(reason: unknown) {
    invalidate(); setSelected(""); setStep("times"); setRefresh((n) => n + 1);
    setError(reason instanceof DemoBookingError ? c[reason.code] : bookingConnectionError(reason, locale));
  }
  async function review() {
    if (checkedEmail !== draft.email.trim().toLowerCase()) { setStep("verify"); return; }
    setSaving(true);
    try { await voice.current?.stop(); setHold(await calendar.current!.prepare(selected, draft, replacing)); setError(""); setStep("review"); } catch (reason) { fail(reason); } finally { setSaving(false); }
  }
  async function verify() {
    if (code !== DEMO_EMAIL_CODE) { setError(c.badCode); return; }
    setCheckedEmail(draft.email.trim().toLowerCase());
    setSaving(true);
    try { await voice.current?.stop(); setHold(await calendar.current!.prepare(selected, draft, replacing)); setError(""); setCode(""); setStep("review"); } catch (reason) { fail(reason); } finally { setSaving(false); }
  }
  async function confirm() {
    if (!hold) return;
    setSaving(true);
    try { setBooking(await calendar.current!.confirm(hold.id)); setHold(null); setReplacing(undefined); setError(""); setNotice(""); setStep("booked"); } catch (reason) { fail(reason); } finally { setSaving(false); }
  }
  function finish() { void voice.current?.stop(); setVoiceReview(false); invalidate(); setCode(""); setCheckedEmail(""); setReplacing(undefined); setDraft(emptyDraft()); setSelected(""); setStep("ended"); }

  if (!open) return null;

  const reviewData = step === "review" ? hold : booking;
  const currentSlot = slots.find((slot) => slot.id === selected);
  const zones = [...new Set([draft.timezone, "Europe/Warsaw", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Singapore", "UTC"])];
  const stepNumber = step === "context" ? 0 : step === "times" ? 1 : ["contact", "verify"].includes(step) ? 2 : 3;
  const titles: Record<Step, string> = { context: c.context, times: c.timeTitle, contact: c.contact, verify: c.verify, review: c.review, booked: booking?.status === "cancelled" ? c.cancelled : c.booked, cancel: c.cancelTitle, ended: c.finished };
  const summary = reviewData ? <div className={styles.summary} data-booking-summary="">
    <p className={styles.appointment}>WitnessOps · {c.duration}</p>
    <p className={styles.date}>{formatDemoSlot(reviewData.slot, reviewData.details.timezone, locale)}</p>
    <p>{reviewData.details.timezone}</p>
    <p>{reviewData.details.name}<br />{reviewData.details.email}</p>
    <h4>{c.summary}</h4><p>{reviewData.details.topic}</p>
    <p>{reviewData.details.stage === "live" ? c.live : c.planned}</p>
  </div> : null;

  return <section className={styles.panel} aria-labelledby={`${id}-heading`} data-booking-preview="">
    <div className={styles.scroll} data-booking-scroll="" ref={scroll} onScroll={(event) => { readingPosition.current = { step, top: event.currentTarget.scrollTop }; }}>
    <div className={styles.top}><span className={styles.badge}>{c.demo}</span></div>
    <p className={styles.intro}>{c.notice}</p>
    {!["booked", "cancel", "ended"].includes(step) ? <ol className={styles.progress} aria-label={c.progress}>
      {[c.detailsStep, c.timeStep, c.contactStep, c.reviewStep].map((label, index) => <li key={label} aria-current={index === stepNumber ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}
    </ol> : null}
    <div className={styles.stepHeading}>
      <h3 ref={heading} tabIndex={-1} id={`${id}-heading`}>{titles[step]}</h3>
      {!voiceReview && !["review", "booked", "cancel", "ended"].includes(step) ? <div className={styles.method} role="group" aria-label={pl ? "Sposób rezerwacji" : "Booking method"}>
        <button type="button" aria-pressed={bookingMethod === "type"} onClick={() => { setBookingMethod("type"); void voice.current?.stop(); }}>{pl ? "Tekst" : "Type"}</button>
        <button type="button" aria-pressed={bookingMethod === "voice"} onClick={() => setBookingMethod("voice")}>{pl ? "Głos" : "Voice"}</button>
      </div> : null}
    </div>
    {bookingMethod === "type" && voiceStatus === "off" && !voiceReview && voiceError ? <p className={styles.note} role="alert">{voiceErrors[voiceError] ?? (pl ? "Możesz kontynuować przez formularz." : "You can continue with the form.")}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {replacing && !["booked", "ended"].includes(step) ? <p className={styles.note}>{c.rescheduling}</p> : null}

    {voiceReview && !["booked", "cancel", "ended"].includes(step) ? <div data-booking-handoff="">
      <p role="status">{voiceStatus === "off" ? (pl ? "Mikrofon wyłączony. Sprawdź dane — nic jeszcze nie zarezerwowano." : "Microphone off. Review your details — nothing is booked yet.") : (pl ? "Wyłączam głos i otwieram formularz…" : "Ending voice and opening your form…")}</p>
      {voiceError ? <p role="alert">{voiceErrors[voiceError] ?? (pl ? "Głos zakończony. Możesz użyć formularza." : "Voice ended. You can continue with the form.")}</p> : null}
      {step === "contact" ? <>
        <p>{pl ? "Możesz teraz poprawić dane i przejść do próbnego sprawdzenia emaila." : "You can edit the details below, then continue to the demo email check."}</p>
        <div className={styles.summary} data-booking-proposal=""><p>WitnessOps · {c.duration}</p><p>{currentSlot ? formatDemoSlot(currentSlot, draft.timezone, locale) : voiceSlots.find((slot) => slot.id === selected)?.label}</p><p>{draft.timezone}</p><p>{draft.topic}</p><p>{draft.stage === "live" ? c.live : c.planned}</p></div>
      </> : null}
    </div> : null}
    {!voiceReview && !["review", "booked", "cancel", "ended"].includes(step) ? <div className={styles.voice} data-booking-voice="" hidden={bookingMethod !== "voice" && voiceStatus === "off"}>
      <p className={styles.note}>{pl ? "Głos AI przez OpenAI. Mikrofon włączy się po wybraniu Start. Używaj fikcyjnych danych. Limit: 5 minut." : "AI voice powered by OpenAI. Your microphone starts only when you choose Start. Use fictional details. Five-minute limit."}</p>
      <p role="status">{voiceStatus === "off" ? (pl ? "Mikrofon wyłączony" : "Microphone off") : voiceStatus === "permission" ? (pl ? "Czekam na zgodę na mikrofon…" : "Waiting for microphone permission…") : voiceStatus === "connecting" ? (pl ? "Łączenie…" : "Connecting…") : voiceStatus === "closing" ? (pl ? "Kończenie połączenia…" : "Ending voice…") : muted ? (pl ? "Mikrofon wyciszony" : "Microphone muted") : (pl ? "Słucham — możesz mi przerwać" : "Listening — you can interrupt me")}</p>
      {voiceStatus === "off" ? <button type="button" disabled={!voiceReady || saving} onClick={startVoice}>{pl ? "Start rozmowy" : "Start voice"}</button> : <div className={styles.actions}>
        <button type="button" disabled={voiceStatus === "closing"} onClick={() => { void voice.current?.stop(); }}>{pl ? "Zakończ głos · użyj formularza" : "Stop voice · use form"}</button>
        {voiceStatus === "listening" ? <button type="button" onClick={() => setMuted(voice.current?.mute() ?? false)}>{muted ? (pl ? "Włącz mikrofon" : "Unmute") : (pl ? "Wycisz" : "Mute")}</button> : null}
      </div>}
      {!voiceReady ? <p className={styles.note}>{voiceErrors.voice_not_configured}</p> : null}
      {voiceError ? <p role="alert">{voiceErrors[voiceError] ?? (pl ? "Nie udało się połączyć. Spróbuj ponownie lub użyj formularza." : "Voice could not connect. Try again or continue with the form.")}</p> : null}
      {voiceError === "sound_blocked" ? <button type="button" onClick={() => { void voice.current?.enableSound(); }}>{pl ? "Włącz dźwięk" : "Enable sound"}</button> : null}
      {voiceSlots.length ? <div><strong>{c.available}</strong><ul>{voiceSlots.slice(0, 6).map((slot) => <li key={slot.id}>{slot.label}</li>)}</ul></div> : null}
      {transcript.length ? <details><summary>{pl ? "Zapis rozmowy" : "Conversation transcript"}</summary><div className={styles.transcript}>{transcript.map((row, index) => <p key={index}><strong>{row.speaker === "user" ? (pl ? "Ty" : "You") : "Sovereign"}: </strong>{row.text}</p>)}</div></details> : null}
      {voiceStatus !== "off" ? <p className={styles.note}>{pl ? "Powiedz, co zmienić. Zakończ głos, aby sprawdzić dane i potwierdzić na ekranie." : "Say what you’d like to change. Stop voice to review the details and confirm on screen."}</p> : null}
    </div> : null}
    <fieldset className={styles.formFields} disabled={saving || voiceStatus !== "off"}>
    {step === "context" ? <form id={`${id}-context`} onSubmit={(event) => { event.preventDefault(); showTimes(); }}>
      <label htmlFor={`${id}-topic`}>{c.topic}</label>
      <textarea rows={2} id={`${id}-topic`} placeholder={c.placeholder} value={draft.topic} minLength={5} maxLength={300} required onChange={(event) => setDraft({ ...draft, topic: event.target.value })} />
      <label htmlFor={`${id}-stage`}>{c.stage}</label>
      <select id={`${id}-stage`} value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as BookingDraft["stage"] })}><option value="planned">{c.planned}</option><option value="live">{c.live}</option></select>

      <button className={styles.example} type="button" disabled={saving} onClick={() => { void tryWithoutMicrophone(); }}>{pl ? "Użyj przykładowego tematu" : "Use demo example"}</button>
    </form> : null}

    {step === "times" ? <>
      <div className={styles.filters}>
        <div><label htmlFor={`${id}-zone`}>{c.zone}</label><select id={`${id}-zone`} value={draft.timezone} onChange={(event) => { setDraft({ ...draft, timezone: event.target.value }); setSelected(""); setLimit(3); }}>{zones.map((zone) => <option key={zone}>{zone}</option>)}</select></div>
        <div><label htmlFor={`${id}-period`}>{c.period}</label><select id={`${id}-period`} value={period} onChange={(event) => { setPeriod(event.target.value); setSelected(""); setLimit(3); }}><option value="all">{c.all}</option><option value="morning">{c.morning}</option><option value="afternoon">{c.afternoon}</option></select></div>
      </div>
      <div aria-busy={busy} className={styles.slots} role="group" aria-label={c.available}>
        {busy ? <p role="status">{c.checking}</p> : null}
        {!busy && slots.length === 0 && !error ? <p>{c.none}</p> : slots.slice(0, limit).map((slot) => <button type="button" disabled={busy} key={slot.id} aria-pressed={selected === slot.id} onClick={() => setSelected(slot.id)}>{formatDemoSlot(slot, draft.timezone, locale)}</button>)}
      </div>
      {error && !busy && slots.length === 0 ? <button type="button" onClick={showTimes}>{pl ? "Spróbuj ponownie" : "Retry calendar"}</button> : null}
      {!busy && slots.length > limit ? <button type="button" onClick={() => setLimit((value) => value + 6)}>{c.more}</button> : null}

    </> : null}

    {step === "contact" ? <form id={`${id}-contact`} onSubmit={(event) => { event.preventDefault(); setError(""); setCode(""); if (checkedEmail === draft.email.trim().toLowerCase()) review(); else setStep("verify"); }}>
      <label htmlFor={`${id}-name`}>{c.name}</label><input id={`${id}-name`} autoComplete="off" required minLength={2} maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <label htmlFor={`${id}-email`}>{c.email}</label><input id={`${id}-email`} type="email" autoComplete="off" required maxLength={200} value={draft.email} onChange={(event) => { setDraft({ ...draft, email: event.target.value }); setCheckedEmail(""); }} aria-describedby={`${id}-email-hint`} />
      <p className={styles.note} id={`${id}-email-hint`}>{c.emailHint}</p>

      {voiceReview ? <div className={styles.actions}><button type="button" onClick={() => go("context")}>{c.change}</button><button type="button" disabled={!voiceReady} onClick={startVoice}>{pl ? "Porozmawiaj ponownie" : "Talk again"}</button></div> : null}
    </form> : null}

    {step === "verify" ? <form id={`${id}-verify`} onSubmit={(event) => { event.preventDefault(); verify(); }}>
      <p>{c.codeHint} <strong className={styles.code}>{DEMO_EMAIL_CODE}</strong></p>
      <label htmlFor={`${id}-code`}>{c.code}</label><input id={`${id}-code`} inputMode="numeric" autoComplete="off" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />

    </form> : null}

    {step === "review" && hold ? <>
      <p className={styles.note}>{c.pending} · {c.hold}</p>{summary}<p className={styles.note}>{c.checked}</p><p>{c.boundary}</p>

      {showDebug ? <details className={styles.scenarios}><summary>{c.controls}</summary><button type="button" onClick={() => { void calendar.current?.simulateConflict().then(() => setNotice(c.simulated)).catch(fail); }}>{c.conflict}</button><button type="button" onClick={() => { void calendar.current?.expire().then(() => setNotice(c.simulated)).catch(fail); }}>{c.expire}</button></details> : null}
    </> : null}

    {step === "booked" && booking ? <>
      <p className={styles.reference}>{c.reference}: <strong>{booking.reference}</strong></p>{summary}<p>{c.local}</p>
      {booking.status === "confirmed" ? <div className={styles.actions}><button type="button" onClick={() => { setDraft(booking.details); setReplacing(booking.reference); showTimes(); }}>{c.reschedule}</button><button type="button" onClick={() => go("cancel")}>{c.cancel}</button></div> : <button type="button" onClick={() => { setBooking(null); setDraft(emptyDraft()); setCheckedEmail(""); go("context"); }}>{c.again}</button>}

    </> : null}
    {step === "cancel" && booking ? <>{summary}</> : null}
    {step === "ended" ? <><p>{c.finishHint}</p></> : null}
    </fieldset>
    </div>
    <fieldset className={styles.actionBar} disabled={saving || voiceStatus !== "off"} data-booking-actions="" aria-label={pl ? "Działania rezerwacji" : "Booking actions"}>
      {step === "context" ? <button className={styles.primary} type="submit" form={`${id}-context`} disabled={draft.topic.trim().length < 5}>{c.times}</button> : null}
      {step === "times" ? <><button type="button" onClick={() => go("context")}>{c.change}</button><button className={styles.primary} type="button" disabled={!currentSlot || busy} onClick={() => replacing && checkedEmail ? review() : go("contact")}>{c.select}</button></> : null}
      {step === "contact" ? <><button type="button" onClick={showTimes}>{c.changeTime}</button><button className={styles.primary} type="submit" form={`${id}-contact`}>{c.next}</button></> : null}
      {step === "verify" ? <><button type="button" onClick={() => go("contact")}>{c.change}</button><button className={styles.primary} type="submit" form={`${id}-verify`}>{c.verifyButton}</button></> : null}
      {step === "review" && hold ? <><button type="button" onClick={() => go("context")}>{c.change}</button><button className={styles.primary} type="button" onClick={confirm}>{c.confirm}</button></> : null}
      {step === "booked" && booking ? <button className={styles.primary} type="button" onClick={finish}>{c.finish}</button> : null}
      {step === "cancel" && booking ? <><button type="button" onClick={() => go("booked")}>{c.keep}</button><button className={styles.primary} type="button" onClick={async () => { setSaving(true); try { setBooking(await calendar.current!.cancel(booking.reference)); go("booked"); } catch (reason) { fail(reason); } finally { setSaving(false); } }}>{c.cancelYes}</button></> : null}
      {step === "ended" && booking ? <button type="button" onClick={() => go("booked")}>{c.view}</button> : null}
    </fieldset>
  </section>;
}
