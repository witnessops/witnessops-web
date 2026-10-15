"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { sovereignNeedsReviewVisible } from "@/lib/sovereign-release";
import { sovereignAnswer, type SovereignLocale } from "./ask-sovereign-answers";
import styles from "./ask-sovereign-preview.module.css";
import { previewChip, simErrorAtLoad, simFlag } from "./preview-triggers";
import { spriteRecord, stateDurationMs, type SovereignSpriteState } from "./sovereign-playback";
import { InlineArrow } from "@/components/marketing/inline-arrow";
import { SovereignSprite } from "./sovereign-sprite";

const PAUSE_KEY = "wo-sovereign-paused";
const REVIEW_TOPICS = ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"] as const;
const EASR_RETEST = "One focused retest of reported findings within 30 calendar days of initial report handover.";

const COPY = {
  en: {
    greeting: "Hello. I can answer from the two published reviews. Ask about scope, price or how to start.",
    suggestions: [
      "What does the Agent Action Security Review cover?",
      "What does the External Attack Surface Review include, and what does it cost?",
      "How do I start?",
      "Where do I write?",
    ],
    idle: "Ready",
    working: "Working on this question",
    answerReady: "Answer ready",
    handoff: "Needs a person",
    unavailable: "Unavailable",
    retry: "Retry",
    disclaimer: "You are chatting with an AI assistant. It answers only from published offer facts and can be wrong.",
    optin: "Preview, sends nothing",
    optinOn: "Selected on this screen only.",
    optinOff: "Not selected.",
    optinStored: "This choice is not sent and is not stored.",
    attached: "Nothing from this chat is attached.",
    composer: "Ask about the two reviews",
    send: "Send",
    railAnswer: "What Sovereign can answer",
    railStart: "How to start, and where to write",
    railAbout: "About this AI",
    railAboutBody: "Answers are generated from a fixed list of published offer facts for this preview. No transcript is kept.",
    pause: "Pause animation",
    play: "Play animation",
    simulated: "Simulated response · preview",
    simulatedChip: "Simulated",
    you: "You",
    close: "Close",
    docs: "/docs",
    handoffCta: "Continue to contact",
    handoffMail: "Or write to engage@mail.witnessops.com",
    contact: "/contact",
  },
  pl: {
    greeting: "Dzień dobry. Odpowiadam z dwóch opublikowanych przeglądów. Pytaj o zakres, cenę albo jak zacząć.",
    suggestions: [
      "Co obejmuje Agent Action Security Review?",
      "Co obejmuje External Attack Surface Review i ile kosztuje?",
      "Jak zacząć?",
      "Gdzie napisać?",
    ],
    idle: "Gotowy do pytań",
    working: "Pracuję nad tym pytaniem",
    answerReady: "Odpowiedź gotowa",
    handoff: "Potrzebna odpowiedź człowieka",
    unavailable: "Asystent niedostępny",
    retry: "Spróbuj ponownie",
    disclaimer: "Rozmawiasz z asystentem AI. Odpowiada tylko na podstawie opublikowanych faktów oferty i może się mylić.",
    optin: "Podgląd, nic nie wysyła",
    optinOn: "Zaznaczone tylko na tym ekranie.",
    optinOff: "Nie zaznaczono.",
    optinStored: "Ten wybór nie jest wysyłany i nie jest zapisywany.",
    attached: "Nic z tej rozmowy nie jest dołączane.",
    composer: "Zapytaj o te dwa przeglądy",
    send: "Wyślij",
    railAnswer: "Na co Sovereign może odpowiedzieć",
    railStart: "Jak zacząć i gdzie napisać",
    railAbout: "O tym asystencie",
    railAboutBody: "Odpowiedzi powstają ze stałej listy opublikowanych faktów oferty w tym podglądzie. Rozmowa nie jest przechowywana.",
    pause: "Zatrzymaj animację",
    play: "Wznów animację",
    simulated: "Podgląd: odpowiedź symulowana",
    simulatedChip: "Symulowane",
    you: "Ty",
    close: "Zamknij",
    docs: "/pl/docs",
    handoffCta: "Przejdź do kontaktu",
    handoffMail: "Albo napisz na engage@mail.witnessops.com",
    contact: "/pl/contact",
  },
} as const;

type Turn = { role: "you" | "sovereign"; text: string; simulated?: boolean; simulatedError?: boolean; needsReview?: boolean };
type Live = "idle" | "processing" | "answered" | "handoff" | "error";

export function liveText(locale: SovereignLocale, live: Live, phase: SovereignSpriteState): string {
  const copy = COPY[locale];
  if (phase === "ERROR" || live === "error") return copy.unavailable;
  if (phase === "PROCESSING" || live === "processing") return copy.working;
  if (phase === "HANDOFF" || live === "handoff") return copy.handoff;
  if (live === "answered") return copy.answerReady;
  return copy.idle;
}

/** A saved pause skips the greeting, so the first painted sprite is the idle still. */
export function pausedLoadPhase(storedPause: boolean): "IDLE" | "GREETING" {
  return storedPause ? "IDLE" : "GREETING";
}

export function AskSovereignPreview({ locale = "en" }: { locale?: SovereignLocale }) {
  const copy = COPY[locale];
  const pageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const lastQuestion = useRef("");
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<SovereignSpriteState>("GREETING");
  const [live, setLive] = useState<Live>("idle");
  const [announcement, setAnnouncement] = useState<string>(copy.idle);
  const [draft, setDraft] = useState("");
  const [share, setShare] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([{ role: "sovereign", text: copy.greeting }]);
  const [activeSim, setActiveSim] = useState<ReturnType<typeof simFlag>>(null);
  const errorSpent = useRef(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setReduced(motion.matches);
      setMobile(narrow.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    narrow.addEventListener("change", sync);
    try {
      if (window.sessionStorage.getItem(PAUSE_KEY) === "1") {
        setPaused(true);
        setPhase((current) => (current === "GREETING" ? pausedLoadPhase(true) : current));
      }
    } catch {
      setPaused(false);
    }
    return () => {
      motion.removeEventListener("change", sync);
      narrow.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      setArmed(true);
      const search = window.location.search;
      if (simErrorAtLoad(search)) {
        errorSpent.current = true;
        setPhase("ERROR");
        setLive("error");
        setAnnouncement(COPY[locale].unavailable);
      }
      composerRef.current?.focus({ preventScroll: true });
    };
    panel.addEventListener("animationend", start);
    const fallback = window.setTimeout(start, 260);
    return () => {
      panel.removeEventListener("animationend", start);
      window.clearTimeout(fallback);
    };
  }, [locale]);

  useEffect(() => {
    setActiveSim(simFlag(window.location.search));
  }, []);

  useEffect(() => {
    if (phase !== "GREETING" || !armed) return;
    if (paused) {
      setPhase(pausedLoadPhase(true));
      return;
    }
    const timer = window.setTimeout(() => setPhase("IDLE"), stateDurationMs("GREETING"));
    return () => window.clearTimeout(timer);
  }, [phase, armed, paused]);

  useEffect(() => {
    if (phase !== "PROCESSING") return;
    const cap = spriteRecord("PROCESSING").cap_ms;
    if (!cap) return;
    const gen = generation.current;
    const timer = window.setTimeout(() => {
      if (gen !== generation.current) return;
      setTurns((current) => {
        const next = current.slice();
        for (let index = next.length - 1; index >= 0; index -= 1) {
          const turn = next[index];
          if (turn?.role === "you") {
            next[index] = { ...turn, simulatedError: true };
            break;
          }
        }
        return next;
      });
      setPhase("ERROR");
      setLive("error");
      setAnnouncement(copy.unavailable);
      composerRef.current?.focus({ preventScroll: true });
    }, cap);
    return () => window.clearTimeout(timer);
  }, [phase, copy.unavailable]);

  useEffect(() => {
    if (!mobile) return;
    const panel = panelRef.current;
    if (!panel) return;
    const sheet = panel;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const viewport = window.visualViewport;
    const syncViewport = () => {
      if (!viewport) return;
      sheet.style.height = `${viewport.height}px`;
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    function trap(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        window.location.assign(copy.docs);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...sheet.querySelectorAll<HTMLElement>("a[href], button, textarea, input, select")].filter(
        (element) => !element.hasAttribute("disabled"),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const behind = [...(pageRef.current?.querySelectorAll<HTMLElement>("[data-sheet-behind]") ?? [])];
    behind.forEach((element) => {
      element.inert = true;
    });
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      viewport?.removeEventListener("resize", syncViewport);
      sheet.style.height = "";
      document.body.style.overflow = previousOverflow;
      behind.forEach((element) => {
        element.inert = false;
      });
      previous?.focus();
    };
  }, [mobile, copy.docs]);

  function togglePaused() {
    setPaused((current) => {
      const next = !current;
      try {
        window.sessionStorage.setItem(PAUSE_KEY, next ? "1" : "0");
      } catch {
        /* The pause flag is session-only. A blocked store still pauses this view. */
      }
      return next;
    });
  }

  function retryFromError() {
    const text = lastQuestion.current;
    if (!text) return;
    ask(text, true);
  }

  function ask(question: string, resend = false) {
    const text = question.trim();
    if (!text) return;
    const flag = simFlag(window.location.search);
    const forceError = flag === "error" && !errorSpent.current;
    if (forceError) errorSpent.current = true;
    generation.current += 1;
    lastQuestion.current = text;
    setDraft("");
    const pending = flag === "slow";
    const answer = forceError || pending
      ? null
      : flag === "handoff"
        ? sovereignAnswer("simulate handoff", locale)
        : sovereignAnswer(text, locale);
    const handoff = answer?.kind === "handoff";
    setTurns((current) => {
      const next = current.slice();
      if (resend) {
        for (let index = next.length - 1; index >= 0; index -= 1) {
          const turn = next[index];
          if (turn?.role === "you") {
            next[index] = { ...turn, text, simulatedError: forceError };
            break;
          }
        }
      } else {
        next.push({ role: "you", text, simulatedError: forceError });
      }
      if (answer) {
        next.push({ role: "sovereign", text: answer.text, simulated: true, needsReview: answer.needsReview });
      }
      return next;
    });
    if (forceError) {
      setPhase("ERROR");
      setLive("error");
      setAnnouncement(copy.unavailable);
    } else if (pending) {
      setPhase("PROCESSING");
      setLive("processing");
      setAnnouncement(copy.working);
    } else if (handoff) {
      setPhase("HANDOFF");
      setLive("handoff");
      setAnnouncement(copy.handoff);
    } else {
      setPhase("IDLE");
      setLive("answered");
      setAnnouncement(copy.answerReady);
    }
    // Handoff keeps focus on the composer. This repo has no STATE-SPEC to update.
    composerRef.current?.focus({ preventScroll: true });
  }

  const asked = turns.some((turn) => turn.role === "you");
  const showReview = sovereignNeedsReviewVisible();
  let spriteIndex = -1;
  turns.forEach((item, itemIndex) => {
    if (phase === "ERROR" ? item.role === "you" : item.role === "sovereign") spriteIndex = itemIndex;
  });

  return (
    <div className={styles.page} ref={pageRef} data-sovereign-preview="">
      <p className={styles.back} data-sheet-behind><Link href={copy.docs}>Docs</Link></p>
      <p className={styles.kicker} data-sheet-behind>AI assistant</p>
      <h1 data-sheet-behind>Ask Sovereign</h1>
      <p className={styles.lead} data-sheet-behind>Questions about the two WitnessOps reviews, answered from the published offer facts. Anything else goes to a person.</p>
      <div className={styles.scrim} />
      <div className={styles.layout}>
        <section
          ref={panelRef}
          className={styles.panel}
          aria-labelledby="ask-sovereign-title"
          role={mobile ? "dialog" : undefined}
          aria-modal={mobile ? true : undefined}
        >
          <div className={styles.stripe} />
          <header
            className={styles.bar}
            onPointerDown={(event) => {
              if (!mobile) return;
              const startY = event.clientY;
              const start = performance.now();
              function end(up: PointerEvent) {
                const distance = up.clientY - startY;
                const velocity = distance / Math.max(1, performance.now() - start);
                if (distance > 96 || velocity > 0.5) window.location.assign(copy.docs);
                window.removeEventListener("pointerup", end);
              }
              window.addEventListener("pointerup", end);
            }}
          >
            <span className={styles.mark} aria-hidden="true" />
            <p className={styles.name} id="ask-sovereign-title">Ask Sovereign <span>AI</span></p>
            {previewChip(activeSim) ? <p className={styles.simChip}>{previewChip(activeSim)}</p> : null}
            <div className={styles.controls}>
              <button type="button" className={`${styles.iconButton} ${styles.pause}`} aria-pressed={paused} aria-label={paused ? copy.play : copy.pause} onClick={togglePaused}>
                {paused ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5-7-4.5z" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                )}
              </button>
              <a className={`${styles.iconButton} ${styles.close}`} href={copy.docs} aria-label={copy.close}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              </a>
            </div>
          </header>
          <div className={styles.thread}>
          <p className={styles.disclaimer}>{copy.disclaimer}</p>
          {locale === "pl" ? <p className={styles.reviewTag}>PL copy pending native review</p> : null}
          <p className={styles.status} role="status" aria-live="polite" data-live={live}><span className={styles.dot} aria-hidden="true" /><span className={styles.statusText}>{announcement}</span></p>
          <ol className={styles.transcript}>
            {turns.map((turn, index) => {
              const withSprite = spriteIndex === index;
              return (
                <li key={`${turn.role}-${index}`} className={turn.role === "you" ? styles.you : styles.sovereign}>
                  {withSprite ? (
                    <div className={styles.withSprite}>
                      <SovereignSprite state={phase} paused={paused} reduced={reduced} armed={armed} viewport={mobile ? "mobile" : "desktop"} />
                      <div>
                        <span>{turn.role === "you" ? copy.you : "Sovereign"}</span>
                        {turn.simulatedError ? <p className={styles.simChip}>{copy.simulatedChip}{locale === "pl" ? <span className={styles.reviewTag}>PL copy pending native review</span> : null}</p> : null}
                        {turn.simulated ? <p className={styles.sim}>{copy.simulated}</p> : null}
                        <p>{turn.text}</p>
                        {turn.needsReview && showReview ? <p className={styles.tag}>Needs review</p> : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      <span>{turn.role === "you" ? copy.you : "Sovereign"}</span>
                      {turn.simulatedError ? <p className={styles.simChip}>{copy.simulatedChip}{locale === "pl" ? <span className={styles.reviewTag}>PL copy pending native review</span> : null}</p> : null}
                      {turn.simulated ? <p className={styles.sim}>{copy.simulated}</p> : null}
                      <p>{turn.text}</p>
                      {turn.needsReview && showReview ? <p className={styles.tag}>Needs review</p> : null}
                    </>
                  )}
                </li>
              );
            })}
          </ol>
          {phase === "ERROR" ? (
            <button type="button" className={styles.retry} onClick={retryFromError}>{copy.retry}</button>
          ) : null}
          {phase === "HANDOFF" ? (
            <div className={styles.handoffCard} data-handoff-card>
              <a className={styles.handoffCta} data-handoff-cta href={copy.contact}>{copy.handoffCta} <InlineArrow /></a>
              <p>{copy.handoffMail}</p>
            </div>
          ) : null}
          </div>
          <div className={styles.askDock}>
          <div className={asked ? `${styles.chips} ${styles.chipsRow}` : styles.chips}>
            {copy.suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => ask(suggestion)}>{suggestion}</button>
            ))}
          </div>
          <label className={styles.optin}>
            <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />
            {copy.optin}
            {locale === "pl" ? <span className={styles.reviewTag}>PL copy pending native review</span> : null}
          </label>
          <p className={styles.muted}>{share ? copy.optinOn : copy.optinOff} {copy.optinStored}</p>
          <p className={styles.muted}>{copy.attached}</p>
          </div>
          <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
            <label className={styles.composerLabel} htmlFor="ask-sovereign-draft">{copy.composer}</label>
            <input id="ask-sovereign-draft" ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit" aria-label={copy.send}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </form>
        </section>
        <aside className={styles.rail} data-sheet-behind>
          <h3>{copy.railAnswer}</h3>
          <ul>
            <li>{PUBLIC_AGENT_ACTION_OFFER.name[locale]}: {PUBLIC_AGENT_ACTION_OFFER.price[locale]}</li>
            <li>{EXTERNAL_ATTACK_SURFACE_OFFER.name[locale]}: {EXTERNAL_ATTACK_SURFACE_OFFER.price[locale]}. {EASR_RETEST}</li>
            <li>{copy.railStart}</li>
          </ul>
          <h3>{copy.railAbout}</h3>
          <p>{copy.railAboutBody}</p>
          {showReview ? (
            <ul className={styles.review}>
              {REVIEW_TOPICS.map((topic) => <li key={topic}>{topic} <span>Needs review</span></li>)}
            </ul>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
