"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { PriceText, PriceUnit } from "@/lib/price-unit";
import { sovereignNeedsReviewVisible } from "@/lib/sovereign-release";
import { sovereignAnswer, type SovereignLocale } from "./ask-sovereign-answers";
import styles from "./ask-sovereign-preview.module.css";
import { previewChip, simErrorAtLoad, simFlag, sovereignPreviewCaption } from "./preview-triggers";
import { stateDurationMs, type SovereignSpriteState } from "./sovereign-playback";
import { InlineArrow } from "@/components/marketing/inline-arrow";
import { SovereignSprite } from "./sovereign-sprite";

const PAUSE_KEY = "wo-sovereign-paused";
export const PROCESSING_SHOW_DELAY_MS = 150;
export const PENDING_TIMEOUT_MS = 15_000;
export const SLOW_PENDING_MS = 6_000;
/** How far a hard top cover must reach so a line crossing the 16px fade is fully hidden. */
export function threadTopCover(thread: HTMLElement): number {
  const frame = thread.getBoundingClientRect();
  let depth = 16;
  const walker = document.createTreeWalker(thread, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (!parent || parent.closest("[class*='srOnly']")) {
      node = walker.nextNode();
      continue;
    }
    if ((node.textContent || "").trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue;
        if (rect.bottom <= frame.top + 0.5) continue;
        if (rect.top >= frame.top + 16 - 0.5) continue;
        depth = Math.max(depth, Math.ceil(rect.bottom - frame.top));
      }
    }
    node = walker.nextNode();
  }
  return depth;
}

function applyThreadFade(thread: HTMLElement) {
  const overflow = thread.scrollHeight > thread.clientHeight + 1;
  const atEnd = thread.scrollTop + thread.clientHeight >= thread.scrollHeight - 1;
  const notice = thread.parentElement?.querySelector<HTMLElement>("[data-sheet-notice]");
  const sheetVisible = Boolean(notice && getComputedStyle(notice).display !== "none");
  const fadeBottom = overflow && !atEnd;
  const fadeTop = thread.scrollTop > 1;
  const covered = sheetVisible && fadeTop;
  const cover = covered ? threadTopCover(thread) : 16;
  thread.style.setProperty("--thread-top-cover", `${cover}px`);
  thread.classList.toggle(styles.threadFade, fadeBottom && !fadeTop);
  thread.classList.toggle(styles.threadFadeTop, fadeTop && !fadeBottom && !covered);
  thread.classList.toggle(styles.threadFadeTopCover, fadeTop && !fadeBottom && covered);
  thread.classList.toggle(styles.threadFadeBoth, fadeBottom && fadeTop && !covered);
  thread.classList.toggle(styles.threadFadeBothCover, fadeBottom && fadeTop && covered);
}

const REVIEW_TOPICS = ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"] as const;
const EASR_RETEST = {
  en: "One focused retest of reported findings within 30 calendar days of initial report handover.",
  pl: "Jeden ukierunkowany retest zgłoszonych ustaleń w ciągu 30 dni kalendarzowych od przekazania pierwszego raportu.",
} as const;

export type SuggestionTopic = "aasr" | "easr" | "start" | "write";
export type Suggestion = { id: SuggestionTopic; text: string };

const COPY = {
  en: {
    greeting: "Hello. I can answer from the two published reviews. Ask about scope, price or how to start.",
    suggestions: [
      { id: "aasr", text: "What does the Agent Action Security Review cover?" },
      { id: "easr", text: "What does the External Attack Surface Review include, and what does it cost?" },
      { id: "start", text: "How do I start?" },
      { id: "write", text: "Where do I write?" },
    ],
    idle: "Ready",
    checking: "Checking the published facts…",
    handoff: "Needs a person",
    notAnswered: "Not answered",
    errorNote: "Nothing was sent. Try again?",
    retry: "Retry",
    disclaimer: "You are chatting with an AI assistant. It answers only from published offer facts and can be wrong.",
    optin: "Include this transcript when I contact a person",
    optinHint: "Preview, sends nothing",
    composer: "Ask about the two reviews",
    send: "Send",
    railAnswer: "What Sovereign can answer",
    railStart: "How to start, and where to write",
    railAbout: "About this AI",
    railAboutBody: "Answers are generated from a fixed list of published offer facts for this preview. No transcript is kept.",
    pause: "Pause animation",
    play: "Play animation",
    simulated: "Simulated response\u00A0· preview",
    simulatedChip: "Simulated",
    you: "You",
    close: "Close",
    docs: "/docs",
    handoffCta: "Continue to contact",
    handoffMail: "Or write to engage@mail.witnessops.com",
    contact: "/contact",
    back: "Docs",
    kicker: "AI assistant",
    lead: "Questions about the two WitnessOps reviews, answered from the published offer facts. Anything else goes to a person.",
  },
  pl: {
    greeting: "Dzień dobry. Odpowiadam z dwóch opublikowanych przeglądów. Pytaj o zakres, cenę albo jak zacząć.",
    suggestions: [
      { id: "aasr", text: "Co obejmuje Agent Action Security Review?" },
      { id: "easr", text: "Co obejmuje External Attack Surface Review i ile kosztuje?" },
      { id: "start", text: "Jak zacząć?" },
      { id: "write", text: "Gdzie napisać?" },
    ],
    idle: "Gotowy do pytań",
    checking: "Sprawdzam opublikowane informacje…",
    handoff: "Potrzebna odpowiedź człowieka",
    notAnswered: "Bez odpowiedzi",
    errorNote: "Nic nie zostało wysłane. Spróbować ponownie?",
    retry: "Spróbuj ponownie",
    disclaimer: "Rozmawiasz z asystentem AI. Odpowiada tylko na podstawie opublikowanych faktów oferty i może się\u00A0mylić.",
    optin: "Dołącz tę rozmowę, gdy napiszę do człowieka",
    optinHint: "Podgląd, nic nie wysyła",
    composer: "Zapytaj o te dwa przeglądy",
    send: "Wyślij",
    railAnswer: "Na co Sovereign może odpowiedzieć",
    railStart: "Jak zacząć i gdzie napisać",
    railAbout: "O tym asystencie",
    railAboutBody: "Odpowiedzi powstają ze stałej listy opublikowanych faktów oferty w tym podglądzie. Rozmowa nie jest przechowywana.",
    pause: "Zatrzymaj animację",
    play: "Wznów animację",
    simulated: "Podgląd: odpowiedź symulowana",
    simulatedChip: "Symulacja",
    you: "Ty",
    close: "Zamknij",
    docs: "/pl/docs",
    handoffCta: "Przejdź do kontaktu",
    handoffMail: "Albo napisz na engage@mail.witnessops.com",
    contact: "/pl/contact",
    back: "Dokumentacja",
    kicker: "Asystent AI",
    lead: "Pytania o dwa przeglądy WitnessOps, z odpowiedzią na podstawie opublikowanych faktów oferty. Wszystko inne trafia do człowieka.",
  },
} as const;

const CONTACT_ADDRESS = "engage@mail.witnessops.com";

/** Same topic hides every chip for that topic, including an EASR wording that is not the exact chip. */
export function suggestionTopic(text: string): SuggestionTopic | null {
  const q = text.toLowerCase();
  if (/external|attack surface|ekspozycj|powierzchn|1[,.]?\s?900|1900|retest/.test(q)) return "easr";
  if (/agent action|consequential|istotn|2[,.]?\s?500|2500/.test(q)) return "aasr";
  if (/how do i start|jak zacząć|\bstart\b/.test(q)) return "start";
  if (/where do i write|gdzie napisać|\bwrite\b|napisz|email/.test(q)) return "write";
  return null;
}

export function followUpSuggestions(suggestions: readonly Suggestion[], asked: string | undefined, action: boolean): Suggestion[] {
  if (action) return [];
  const topic = asked ? suggestionTopic(asked) : null;
  const rest = topic ? suggestions.filter((item) => item.id !== topic) : [...suggestions];
  if (!asked) return rest;
  return rest.slice(0, 2);
}

export function ContactLine({ text }: { text: string }) {
  const at = text.indexOf(CONTACT_ADDRESS);
  if (at < 0) return <PriceText text={text} />;
  const after = at + CONTACT_ADDRESS.length;
  const period = text[after] === "." ? "." : "";
  const split = CONTACT_ADDRESS.indexOf("@");
  const tailAt = CONTACT_ADDRESS.lastIndexOf(".");
  const before = text.slice(0, at).replace(/\s+$/, "");
  const rest = text.slice(after + period.length).replace(/^\s+/, "");
  return (
    <>
      {before ? <>
        <PriceText text={before} />
        {" "}
      </> : null}
      <a className={styles.replyAddress} data-reply-address="" href={`mailto:${CONTACT_ADDRESS}`}>
        {CONTACT_ADDRESS.slice(0, split)}
        <wbr />
        {CONTACT_ADDRESS.slice(split, tailAt)}
        <span className={styles.addressTail}>{CONTACT_ADDRESS.slice(tailAt)}{period}</span>
      </a>
      {rest ? <>
        {" "}
        <PriceText text={rest} />
      </> : null}
    </>
  );
}

function OfferFact({ name, price, tail }: { name: string; price: string; tail?: string }) {
  const words = name.split(" ");
  const last = words.pop() ?? name;
  const head = words.join(" ");
  return (
    <li>
      <span className={styles.offerPair}>
        <span className={styles.offerName}>
          {head ? <>{head}{" "}</> : null}
          <span className={styles.offerNameTail}>{last}:</span>
        </span>
        <PriceUnit value={price} offer className={styles.offerPrice} />
      </span>
      {tail ? <> {tail}</> : null}
    </li>
  );
}

function withoutErrorTurn(turns: Turn[]): Turn[] {
  return turns.filter((turn) => !(turn.role === "sovereign" && turn.simulatedError));
}

type Turn = { role: "you" | "sovereign"; text: string; simulated?: boolean; simulatedError?: boolean; needsReview?: boolean };
type Live = "idle" | "processing" | "answered" | "handoff" | "error";

export function liveText(locale: SovereignLocale, live: Live, phase: SovereignSpriteState): string {
  const copy = COPY[locale];
  if (phase === "ERROR" || live === "error") return copy.notAnswered;
  if (phase === "PROCESSING" || live === "processing") return copy.checking;
  if (phase === "HANDOFF" || live === "handoff") return copy.handoff;
  return copy.idle;
}

export function announcementText(locale: SovereignLocale, kind: "answer" | "handoff" | "error", answer = ""): string {
  if (locale === "pl") {
    if (kind === "handoff") return `Sovereign: tu potrzebny jest człowiek. ${answer} Link do kontaktu jest w rozmowie.`;
    if (kind === "error") return "Błąd symulowany. Pytanie nie dostało odpowiedzi. Możesz spróbować ponownie.";
    return `Sovereign, odpowiedź symulowana: ${answer}`;
  }
  if (kind === "handoff") return `Sovereign: this needs a person. ${answer} The contact link is in the conversation.`;
  if (kind === "error") return "Simulated error. Your question was not answered. Retry is available.";
  return `Sovereign, simulated response: ${answer}`;
}

/** A saved pause skips the greeting, so the first painted sprite is the idle still. */
export function pausedLoadPhase(storedPause: boolean): "IDLE" | "GREETING" {
  return storedPause ? "IDLE" : "GREETING";
}

export function armPendingQuestion(
  flag: "slow" | "timeout",
  generation: number,
  currentGeneration: () => number,
  hooks: { show: () => void; resolve: () => void; fail: () => void },
): () => void {
  const ids: ReturnType<typeof setTimeout>[] = [];
  const live = () => currentGeneration() === generation;
  ids.push(setTimeout(() => {
    if (live()) hooks.show();
  }, PROCESSING_SHOW_DELAY_MS));
  if (flag === "slow") {
    ids.push(setTimeout(() => {
      if (live()) hooks.resolve();
    }, SLOW_PENDING_MS));
  }
  ids.push(setTimeout(() => {
    if (live()) hooks.fail();
  }, PENDING_TIMEOUT_MS));
  return () => {
    for (const id of ids) clearTimeout(id);
  };
}

/** Puts the start of the turn at the top of the thread. Moves scroll only, and does not move focus. */
export function scrollTurnToThreadStart(thread: HTMLElement, turn: HTMLElement, reduced = false) {
  const top = turn.getBoundingClientRect().top - thread.getBoundingClientRect().top + thread.scrollTop;
  thread.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
}

/** Scrolls the primary action fully inside the thread when it fits. Otherwise brings its top in. Reduced motion jumps. */
export function scrollPrimaryActionIntoView(thread: HTMLElement, action: HTMLElement, reduced: boolean) {
  const threadBox = thread.getBoundingClientRect();
  const box = action.getBoundingClientRect();
  const padding = 8;
  const fits = box.height <= threadBox.height - padding * 2;
  let delta = 0;
  if (fits) {
    if (box.top < threadBox.top + padding) delta = box.top - (threadBox.top + padding);
    else if (box.bottom > threadBox.bottom - padding) delta = box.bottom - (threadBox.bottom - padding);
  } else if (box.top < threadBox.top + padding || box.top > threadBox.bottom - padding) {
    delta = box.top - (threadBox.top + padding);
  }
  if (delta === 0) return;
  thread.scrollTo({ top: Math.max(0, thread.scrollTop + delta), behavior: reduced ? "auto" : "smooth" });
}

function writeAnnouncement(node: HTMLParagraphElement | null, text: string, setText: (value: string) => void) {
  if (node && node.textContent === text) {
    node.textContent = "";
    setText("");
    window.requestAnimationFrame(() => {
      node.textContent = text;
      setText(text);
    });
    return;
  }
  if (node) node.textContent = text;
  setText(text);
}

export function AskSovereignPreview({ locale = "en" }: { locale?: SovereignLocale }) {
  const copy = COPY[locale];
  const pageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const announcerRef = useRef<HTMLParagraphElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef<Array<HTMLLIElement | null>>([]);
  const generation = useRef(0);
  const pendingCancel = useRef<(() => void) | null>(null);
  const lastQuestion = useRef("");
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<SovereignSpriteState>("GREETING");
  const [live, setLive] = useState<Live>("idle");
  const [announcement, setAnnouncement] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [share, setShare] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([{ role: "sovereign", text: copy.greeting }]);
  const [activeSim, setActiveSim] = useState<ReturnType<typeof simFlag>>(null);
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [followUpsReady, setFollowUpsReady] = useState(true);
  const errorSpent = useRef(false);
  const focusComposer = useRef(false);

  function clearPendingTimers() {
    pendingCancel.current?.();
    pendingCancel.current = null;
  }

  function publishAnnouncement(text: string) {
    writeAnnouncement(announcerRef.current, text, setAnnouncement);
  }

  function showAnswer(text: string, answer: { text: string; kind: string; needsReview: boolean }) {
    clearPendingTimers();
    setPending(false);
    setTurns((current) => {
      const next = withoutErrorTurn(current);
      for (let index = next.length - 1; index >= 0; index -= 1) {
        const turn = next[index];
        if (turn?.role === "you" && turn.text === text) {
          next[index] = { ...turn, simulatedError: false };
          break;
        }
      }
      next.push({ role: "sovereign", text: answer.text, simulated: true, needsReview: answer.needsReview });
      return next;
    });
    if (answer.kind === "handoff") {
      setPhase("HANDOFF");
      setLive("handoff");
      publishAnnouncement(announcementText(locale, "handoff", answer.text));
      return;
    }
    setPhase("IDLE");
    setLive("answered");
    publishAnnouncement(announcementText(locale, "answer", answer.text));
  }

  function failQuestion(text: string) {
    clearPendingTimers();
    setPending(false);
    setTurns((current) => {
      const next = withoutErrorTurn(current);
      let at = next.length;
      for (let index = next.length - 1; index >= 0; index -= 1) {
        const turn = next[index];
        if (turn?.role === "you" && turn.text === text) {
          next[index] = { ...turn, simulatedError: false };
          at = index + 1;
          break;
        }
      }
      next.splice(at, 0, { role: "sovereign", text: "", simulatedError: true });
      return next;
    });
    setPhase("ERROR");
    setLive("error");
    publishAnnouncement(announcementText(locale, "error"));
  }

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
        setLoadError(true);
        setPhase("ERROR");
        setLive("error");
        writeAnnouncement(announcerRef.current, announcementText(locale, "error"), setAnnouncement);
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

  useLayoutEffect(() => {
    if (live !== "answered" && live !== "handoff" && live !== "error") return;
    const thread = threadRef.current;
    if (!thread) return;
    let index = -1;
    if (live === "error") {
      for (let cursor = turns.length - 1; cursor >= 0; cursor -= 1) {
        if (turns[cursor]?.simulatedError) {
          index = cursor;
          break;
        }
      }
      if (index < 0 && loadError) index = 0;
    } else {
      for (let cursor = turns.length - 1; cursor >= 0; cursor -= 1) {
        if (turns[cursor]?.role === "sovereign") {
          index = cursor;
          break;
        }
      }
    }
    const turn = index >= 0 ? turnRefs.current[index] : null;
    if (!turn) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const action = live === "error"
      ? turn.querySelector<HTMLElement>("[data-retry]")
      : live === "handoff"
        ? thread.querySelector<HTMLElement>("[data-handoff-card]")
        : null;
    if (action) scrollPrimaryActionIntoView(thread, action, reducedMotion);
    else scrollTurnToThreadStart(thread, turn, reducedMotion);
    applyThreadFade(thread);
  }, [live, turns, loadError, followUpsReady]);

  useEffect(() => () => {
    pendingCancel.current?.();
  }, []);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const syncFade = () => applyThreadFade(thread);
    syncFade();
    thread.addEventListener("scroll", syncFade, { passive: true });
    const observer = new ResizeObserver(syncFade);
    observer.observe(thread);
    return () => {
      thread.removeEventListener("scroll", syncFade);
      observer.disconnect();
    };
  }, [turns, live, followUpsReady, mobile]);

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
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.hasAttribute("data-retry")) focusComposer.current = true;
    const text = lastQuestion.current;
    if (!text) return;
    ask(text, true);
  }

  useLayoutEffect(() => {
    if (!focusComposer.current) return;
    focusComposer.current = false;
    composerRef.current?.focus({ preventScroll: true });
  });

  function ask(question: string, resend = false) {
    const text = question.trim();
    if (!text) return;
    if (pending) return;
    clearPendingTimers();
    const flag = simFlag(window.location.search);
    const forceError = flag === "error" && !errorSpent.current;
    if (forceError) errorSpent.current = true;
    generation.current += 1;
    const gen = generation.current;
    lastQuestion.current = text;
    setDraft("");
    setLoadError(false);
    setTurns((current) => {
      const next = withoutErrorTurn(current);
      if (resend) {
        for (let index = next.length - 1; index >= 0; index -= 1) {
          const turn = next[index];
          if (turn?.role === "you") {
            next[index] = { ...turn, text, simulatedError: false };
            break;
          }
        }
      } else {
        next.push({ role: "you", text });
      }
      if (forceError) next.push({ role: "sovereign", text: "", simulatedError: true });
      return next;
    });
    if (forceError) {
      setPending(false);
      setPhase("ERROR");
      setLive("error");
      publishAnnouncement(announcementText(locale, "error"));
      return;
    }
    if (flag === "slow" || flag === "timeout") {
      setPending(true);
      setLive("processing");
      publishAnnouncement(copy.checking);
      pendingCancel.current = armPendingQuestion(flag, gen, () => generation.current, {
        show() {
          setPhase("PROCESSING");
        },
        resolve() {
          showAnswer(text, sovereignAnswer(text, locale));
        },
        fail() {
          failQuestion(text);
        },
      });
      return;
    }
    const answer = flag === "handoff" ? sovereignAnswer("simulate handoff", locale) : sovereignAnswer(text, locale);
    showAnswer(text, answer);
  }

  const askedText = [...turns].reverse().find((turn) => turn.role === "you")?.text;
  const actionBeats = live === "error" || live === "handoff";
  useLayoutEffect(() => {
    setFollowUpsReady(live !== "error" && live !== "handoff" && live !== "processing");
  }, [live]);
  const suggestions = followUpSuggestions(copy.suggestions, askedText, actionBeats || !followUpsReady);
  const showReview = sovereignNeedsReviewVisible();
  const visibleStatus = liveText(locale, live, phase);
  let spriteIndex = -1;
  if (phase === "ERROR") {
    turns.forEach((item, itemIndex) => {
      if (item.role === "sovereign" && item.simulatedError) spriteIndex = itemIndex;
    });
  }
  if (spriteIndex < 0) {
    turns.forEach((item, itemIndex) => {
      if (item.role === "sovereign") spriteIndex = itemIndex;
    });
  }

  const errorSplit = copy.errorNote.lastIndexOf(" ");
  const errorHead = errorSplit > 0 ? copy.errorNote.slice(0, errorSplit + 1) : "";
  const errorTail = errorSplit > 0 ? copy.errorNote.slice(errorSplit + 1) : copy.errorNote;
  const errorNote = (
    <p className={styles.errorNote} data-locale={locale}>
      <span className={styles.turnChip}>{copy.simulatedChip}</span>
      <span className={styles.errorCaption}>
        {errorHead}
        <span className={styles.captionTail}>{errorTail}</span>
      </span>
    </p>
  );

  return (
    <div className={styles.page} ref={pageRef} data-sovereign-preview="">
      <div className={styles.scrim} />
      <div className={styles.layout}>
        <section
          ref={panelRef}
          className={styles.panel}
          aria-labelledby="ask-sovereign-title"
          role={mobile ? "dialog" : undefined}
          aria-modal={mobile ? true : undefined}
        >
          <p ref={announcerRef} className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
          <div className={styles.stripe} />
          <header
            className={styles.bar}
            data-header-chip={activeSim === "slow" || activeSim === "timeout" ? "" : undefined}
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
            <p className={styles.name} id="ask-sovereign-title">Ask Sovereign <span className={styles.titleUnit}><span className={styles.badge}>AI</span></span></p>
            {activeSim === "slow" || activeSim === "timeout" ? <p className={styles.simChip}>{previewChip(activeSim)}</p> : null}
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
          {locale === "pl" ? <p className={styles.sheetNotice} data-sheet-notice="">PL copy pending native review</p> : null}
          <div className={styles.thread} data-ask-thread="" ref={threadRef} tabIndex={0} aria-labelledby="ask-sovereign-title">
          <p className={styles.disclaimer}>{copy.disclaimer}</p>
          <p className={styles.status} data-live={live} data-ask-status=""><span className={styles.dot} aria-hidden="true" /><span className={styles.statusRow}>{live === "processing" && (activeSim === "slow" || activeSim === "timeout") ? <span className={styles.turnChip}>{copy.simulatedChip}</span> : null}<span className={styles.statusText}>{visibleStatus}</span></span></p>
          <ol className={styles.transcript} aria-busy={pending ? "true" : "false"}>
            {turns.map((turn, index) => {
              const withSprite = spriteIndex === index;
              const showError = turn.role === "sovereign" && (turn.simulatedError || (loadError && index === 0 && !turns.some((item) => item.simulatedError)));
              const errorCaptionText = activeSim === "error" && showError ? previewChip("error", locale) : null;
              const previewCaption = !showError && turn.role === "sovereign"
                ? sovereignPreviewCaption(locale, copy.simulated, activeSim === "handoff", Boolean(turn.simulated))
                : null;
              const retry = turn.role === "sovereign" && turn.simulatedError ? <button type="button" className={styles.retry} data-retry="" onClick={retryFromError}>{copy.retry}</button> : null;
              const sprite = <SovereignSprite state={phase} paused={paused} reduced={reduced} armed={armed} viewport={mobile ? "mobile" : "desktop"} />;
              const latestAnswer = turn.role === "sovereign" && turn.simulated && !turn.simulatedError;
              if (showError) {
                return (
                  <li key={`${turn.role}-${index}`} ref={(node) => { turnRefs.current[index] = node; }} className={styles.sovereign}>
                    <div className={styles.errorStack}>
                      {withSprite ? sprite : null}
                      <div className={styles.errorFaceCopy}>
                        <span>Sovereign</span>
                        {errorCaptionText ? <p className={styles.handoffCaption}>{errorCaptionText}</p> : null}
                        {turn.text ? <p><ContactLine text={turn.text} /></p> : null}
                      </div>
                      <div className={styles.errorBody}>
                        {errorNote}
                        {retry}
                      </div>
                    </div>
                  </li>
                );
              }
              const content = (
                <>
                  <span>{turn.role === "you" ? copy.you : "Sovereign"}</span>
                  {previewCaption && activeSim !== "handoff" ? <p className={styles.sim} data-preview-caption="">{previewCaption}</p> : null}
                  {turn.text ? <p data-answer-copy={latestAnswer ? "" : undefined}><ContactLine text={turn.text} /></p> : null}
                  {turn.needsReview && showReview ? <p className={styles.tag}>Needs review</p> : null}
                </>
              );
              const body = withSprite ? (
                <div className={styles.withSprite}>
                  {sprite}
                  <div>{content}</div>
                </div>
              ) : content;
              return (
                <li key={`${turn.role}-${index}`} ref={(node) => { turnRefs.current[index] = node; }} className={turn.role === "you" ? styles.you : styles.sovereign} data-latest-answer={latestAnswer ? "" : undefined}>
                  {previewCaption && activeSim === "handoff" ? <p className={styles.handoffCaption} data-preview-caption="">{previewCaption}</p> : null}
                  {turn.role === "you" ? <div className={styles.youBubble}>{body}</div> : body}
                </li>
              );
            })}
          </ol>
          {phase === "HANDOFF" ? (
            <div className={styles.handoffCard} data-handoff-card>
              <a className={styles.handoffCta} data-handoff-cta href={copy.contact}>{copy.handoffCta} <InlineArrow /></a>
              <p className={styles.handoffWrite}>{locale === "pl" ? "Albo napisz na" : "Or write to"}</p>
              <p className={styles.handoffAddress}>
                <a href={`mailto:${CONTACT_ADDRESS}`}>
                  {CONTACT_ADDRESS.slice(0, CONTACT_ADDRESS.indexOf("@"))}
                  <wbr />
                  {CONTACT_ADDRESS.slice(CONTACT_ADDRESS.indexOf("@"))}.
                </a>
              </p>
            </div>
          ) : null}
          </div>
          <div className={styles.askDock}>
          <div className={styles.chips} data-ask-chips="">
            {suggestions.map((suggestion) => (
              <button key={suggestion.id} type="button" data-suggestion={suggestion.id} disabled={pending} onClick={() => ask(suggestion.text)}>{suggestion.text}</button>
            ))}
          </div>
          <label className={styles.optin}>
            <input type="checkbox" checked={share} aria-describedby="ask-sovereign-optin-hint" onChange={(event) => setShare(event.target.checked)} />
            {copy.optin}
          </label>
          <p id="ask-sovereign-optin-hint" className={styles.optinHint}>{copy.optinHint}</p>
          </div>
          <form className={styles.composer} aria-busy={pending ? "true" : "false"} onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
            <label className={styles.composerLabel} htmlFor="ask-sovereign-draft">{copy.composer}</label>
            <input id="ask-sovereign-draft" ref={composerRef} value={draft} disabled={pending} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit" aria-label={copy.send} disabled={pending}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </form>
        </section>
        <aside className={styles.rail} data-sheet-behind>
          <p className={styles.back}><Link href={copy.docs} prefetch={false}>{copy.back}</Link></p>
          <p className={styles.kicker}>{copy.kicker}</p>
          <p className={styles.lead}>{copy.lead}</p>
          <h3>{copy.railAnswer}</h3>
          <ul>
            <OfferFact name={PUBLIC_AGENT_ACTION_OFFER.name[locale]} price={PUBLIC_AGENT_ACTION_OFFER.price[locale]} />
            <OfferFact name={EXTERNAL_ATTACK_SURFACE_OFFER.name[locale]} price={EXTERNAL_ATTACK_SURFACE_OFFER.price[locale]} tail={EASR_RETEST[locale]} />
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
