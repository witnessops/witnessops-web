"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { sovereignAnswer, type SovereignLocale } from "./ask-sovereign-answers";
import styles from "./ask-sovereign-preview.module.css";
import { revealWaitMs, stateDurationMs, thinkingWaitMs } from "./sovereign-playback";
import { SovereignSprite } from "./sovereign-sprite";
import type { SovereignSpriteState } from "./sovereign-playback";

const PAUSE_KEY = "wo-sovereign-paused";
const REVIEW_TOPICS = ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"] as const;

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
    thinking: "Checking the published facts…",
    answering: "Answering…",
    answerReady: "Answer ready",
    handoff: "Needs a person",
    unavailable: "Unavailable",
    retry: "Try again",
    pause: "Pause animation",
    play: "Play animation",
    simulated: "Simulated response · preview",
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
    thinking: "Sprawdzam opublikowane informacje…",
    answering: "Odpowiadam…",
    answerReady: "Odpowiedź gotowa",
    handoff: "Potrzebna odpowiedź człowieka",
    unavailable: "Asystent niedostępny",
    retry: "Spróbuj ponownie",
    pause: "Zatrzymaj animację",
    play: "Wznów animację",
    simulated: "Podgląd: odpowiedź symulowana",
    you: "Ty",
    close: "Zamknij",
    docs: "/pl/docs",
    handoffCta: "Przejdź do kontaktu",
    handoffMail: "Albo napisz na engage@mail.witnessops.com",
    contact: "/pl/contact",
  },
} as const;

type Turn = { role: "you" | "sovereign"; text: string; simulated?: boolean; needsReview?: boolean };
type Live = "idle" | "thinking" | "answering" | "answerReady" | "handoff";

function liveText(locale: SovereignLocale, live: Live, phase: SovereignSpriteState): string {
  if (phase === "error") return COPY[locale].unavailable;
  if (phase === "greet") return "";
  const copy = COPY[locale];
  if (live === "thinking") return copy.thinking;
  if (live === "answering") return copy.answering;
  if (live === "answerReady") return copy.answerReady;
  if (live === "handoff") return copy.handoff;
  return copy.idle;
}

export function AskSovereignPreview({ locale = "en" }: { locale?: SovereignLocale }) {
  const copy = COPY[locale];
  const pageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<SovereignSpriteState>("greet");
  const [live, setLive] = useState<Live>("idle");
  const [draft, setDraft] = useState("");
  const [share, setShare] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([{ role: "sovereign", text: copy.greeting }]);

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
      setPaused(window.sessionStorage.getItem(PAUSE_KEY) === "1");
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
      composerRef.current?.focus();
    };
    panel.addEventListener("animationend", start);
    const fallback = window.setTimeout(start, 260);
    return () => {
      panel.removeEventListener("animationend", start);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sim") !== "error") return;
    setPhase("error");
  }, []);

  useEffect(() => {
    if (phase !== "greet" || !armed || paused) return;
    const timer = window.setTimeout(() => setPhase("idle"), stateDurationMs("greet"));
    return () => window.clearTimeout(timer);
  }, [phase, armed, paused]);

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
    generation.current += 1;
    setPhase("idle");
    setLive("idle");
  }

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    const gen = ++generation.current;
    setDraft("");
    setPhase("thinking");
    setLive("thinking");
    setTurns((current) => [...current, { role: "you", text }]);
    const answer = sovereignAnswer(text, locale);
    const handoff = answer.kind === "handoff";
    window.setTimeout(() => {
      if (gen !== generation.current) return;
      if (handoff) {
        setTurns((current) => [...current, { role: "sovereign", text: answer.text, simulated: true, needsReview: answer.needsReview }]);
        setPhase(window.matchMedia("(max-width: 767px)").matches ? "handoff-mobile" : "handoff-desktop");
        setLive("handoff");
        window.setTimeout(() => {
          const card = panelRef.current?.querySelector<HTMLElement>("[data-handoff-card]");
          card?.querySelector<HTMLElement>("[data-handoff-cta]")?.focus({ preventScroll: true });
          card?.scrollIntoView({ block: "nearest" });
        }, 0);
        return;
      }
      setPhase("answering");
      setLive("answering");
      window.setTimeout(() => {
        if (gen !== generation.current) return;
        setTurns((current) => [...current, { role: "sovereign", text: answer.text, simulated: true, needsReview: answer.needsReview }]);
        setLive("answerReady");
        window.setTimeout(() => {
          if (gen !== generation.current) return;
          setPhase("idle");
          setLive("idle");
        }, 400);
      }, revealWaitMs(answer.text));
    }, Math.max(400, thinkingWaitMs(Math.random())));
  }

  const status = liveText(locale, live, phase);
  const asked = turns.some((turn) => turn.role === "you");

  return (
    <div className={styles.page} ref={pageRef}>
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
          <p className={styles.disclaimer}>You are chatting with an AI assistant. It answers only from published offer facts and can be wrong.</p>
          {locale === "pl" ? <p className={styles.reviewTag}>PL copy pending native review</p> : null}
          <ol className={styles.transcript}>
            {turns.map((turn, index) => {
              let latestSovereign = -1;
              turns.forEach((item, itemIndex) => {
                if (item.role === "sovereign") latestSovereign = itemIndex;
              });
              const latest = turn.role === "sovereign" && latestSovereign === index;
              return (
                <li key={`${turn.role}-${index}`} className={turn.role === "you" ? styles.you : styles.sovereign}>
                  {latest ? (
                    <div className={styles.withSprite}>
                      <SovereignSprite state={phase} paused={paused} reduced={reduced} armed={armed} />
                      <div>
                        <p className={styles.status} role="status" aria-live={phase === "error" ? "assertive" : "polite"}><span className={styles.dot} aria-hidden="true" />{status}</p>
                        <span>{turn.role === "you" ? copy.you : "Sovereign"}</span>
                        {turn.simulated ? <p className={styles.sim}>{copy.simulated}</p> : null}
                        <p>{turn.text}</p>
                        {turn.needsReview ? <p className={styles.tag}>Needs review</p> : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      <span>{turn.role === "you" ? copy.you : "Sovereign"}</span>
                      {turn.simulated ? <p className={styles.sim}>{copy.simulated}</p> : null}
                      <p>{turn.text}</p>
                      {turn.needsReview ? <p className={styles.tag}>Needs review</p> : null}
                    </>
                  )}
                </li>
              );
            })}
          </ol>
          {phase === "error" ? (
            <button type="button" className={styles.retry} onClick={retryFromError}>{copy.retry}</button>
          ) : null}
          {phase === "handoff-desktop" || phase === "handoff-mobile" ? (
            <div className={styles.handoffCard} data-handoff-card>
              <a className={styles.handoffCta} data-handoff-cta href={copy.contact}>{copy.handoffCta} <span aria-hidden="true">→</span></a>
              <p>{copy.handoffMail}</p>
            </div>
          ) : null}
          <div className={asked ? `${styles.chips} ${styles.chipsRow}` : styles.chips}>
            {copy.suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => ask(suggestion)}>{suggestion}</button>
            ))}
          </div>
          <label className={styles.optin}>
            <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />
            Include this transcript when I contact a person
          </label>
          <p className={styles.muted}>{share ? "Selected on this screen only." : "Not selected."} This choice is not sent and is not stored.</p>
          <p className={styles.muted}>Nothing from this chat is attached.</p>
          </div>
          <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
            <label className={styles.composerLabel} htmlFor="ask-sovereign-draft">Ask about the two reviews</label>
            <input id="ask-sovereign-draft" ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit" aria-label="Send">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </form>
        </section>
        <aside className={styles.rail} data-sheet-behind>
          <h2>What Sovereign can answer</h2>
          <ul>
            <li>{PUBLIC_AGENT_ACTION_OFFER.name.en}: {PUBLIC_AGENT_ACTION_OFFER.price.en}</li>
            <li>{EXTERNAL_ATTACK_SURFACE_OFFER.name.en}: {EXTERNAL_ATTACK_SURFACE_OFFER.price.en}. One focused retest of reported findings within 30 calendar days of initial report handover.</li>
            <li>How to start, and where to write</li>
          </ul>
          <h2>About this AI</h2>
          <p>Answers are generated from a fixed list of published offer facts for this preview. No transcript is kept.</p>
          <ul className={styles.review}>
            {REVIEW_TOPICS.map((topic) => <li key={topic}>{topic} <span>Needs review</span></li>)}
          </ul>
        </aside>
      </div>
    </div>
  );
}
