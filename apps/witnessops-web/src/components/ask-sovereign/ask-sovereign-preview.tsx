"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { BUYER_SERVICES, buyerServiceRequestHref } from "@/lib/buyer-services";
import { PriceText, PriceUnit } from "@/lib/price-unit";
import { sovereignNeedsReviewVisible } from "@/lib/sovereign-release";
import { sovereignAnswer, type SovereignLocale } from "./ask-sovereign-answers";
import styles from "./ask-sovereign-preview.module.css";
import { previewChip, simErrorAtLoad, simFlag, sovereignPreviewCaption } from "./preview-triggers";
import { stateDurationMs, type SovereignSpriteState } from "./sovereign-playback";
import { InlineArrow } from "@/components/marketing/inline-arrow";
import { SovereignSprite } from "./sovereign-sprite";
import { snapThreadClearOfFade, threadFadePx } from "./thread-fade";
import { sovereignLinks } from "./floating-position";
import { ASK_MAX_QUESTION_LENGTH, keepRecentAskHistory, type AskConversationMessage } from "@/lib/docs-assistant/conversation-contract";
import { askWitnessOpsAnswerText, askWitnessOpsRouteHref, askWitnessOpsRouteLabel, askWitnessOpsSourceHref, askWitnessOpsSourceTarget, fetchAskWitnessOps, type AskWitnessOpsUiAnswer } from "@/components/docs-assistant/ask-witnessops-response";

const PAUSE_KEY = "wo-sovereign-paused";
const PL_ROUTE_LABELS: Record<string, string> = {
  "route.fit-check": "Poproś o zakres",
  "route.support": "Otwórz wsparcie",
  "route.security-disclosure": "Zgłoś problem bezpieczeństwa",
};
export const PROCESSING_SHOW_DELAY_MS = 150;
export const PENDING_TIMEOUT_MS = 15_000;
export const SLOW_PENDING_MS = 6_000;
let fading = false;

/** One top fade for both languages: a full line, then a snap so no line sits in the strong part. */
function applyThreadFade(thread: HTMLElement, snap = false) {
  if (fading) return;
  fading = true;
  try {
    const fade = threadFadePx(thread);
    thread.style.setProperty("--thread-fade", `${fade}px`);
    if (snap && thread.scrollTop > 1) snapThreadClearOfFade(thread, fade);
    const overflow = thread.scrollHeight > thread.clientHeight + 1;
    const atEnd = thread.scrollTop + thread.clientHeight >= thread.scrollHeight - 1;
    const fadeBottom = overflow && !atEnd;
    const fadeTop = thread.scrollTop > 1;
    thread.classList.toggle(styles.threadFade, fadeBottom && !fadeTop);
    thread.classList.toggle(styles.threadFadeTop, fadeTop && !fadeBottom);
    thread.classList.toggle(styles.threadFadeBoth, fadeBottom && fadeTop);
  } finally {
    fading = false;
  }
}

const REVIEW_TOPICS = ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"] as const;

export type SuggestionTopic = "aasr" | "easr" | "start" | "write";
export type Suggestion = { id: SuggestionTopic; text: string };

const COPY = {
  en: {
    greeting: "Hello. I can answer from the published review. Ask about scope, price or how to start.",
    apiGreeting: "Ask about scope, price or how to start. I’ll say when an answer is unavailable.",
    suggestions: [
      { id: "aasr", text: "What does the Agent Action Security Review cover?" },
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
    apiOptin: "This conversation is not attached to contact",
    optinHint: "Preview, sends nothing",
    apiHint: "AI answers use your question and recent replies with OpenAI. Contact does not include this conversation.",
    apiError: "AI is unavailable right now. Your question was not answered. Try again later or contact a person.",
    apiAbout: "AI answers use published WitnessOps information and recent replies from this conversation. This page keeps the conversation in memory until you leave or reload.",
    generated: "AI-generated answer",
    published: "Published information",
    boundary: "Boundary guidance",
    sources: "Sources",
    composer: "Ask about the review",
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
    lead: "Questions about the WitnessOps review, answered from the published offer facts. Anything else goes to a person.",
  },
  pl: {
    greeting: "Dzień dobry. Odpowiadam z opublikowanego przeglądu. Pytaj o zakres, cenę albo jak zacząć.",
    apiGreeting: "Zapytaj o zakres, cenę albo jak zacząć. Powiem, jeśli odpowiedź będzie niedostępna.",
    suggestions: [
      { id: "aasr", text: "Co obejmuje Agent Action Security Review?" },
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
    apiOptin: "Ta rozmowa nie jest dołączana do kontaktu",
    optinHint: "Podgląd, nic nie wysyła",
    apiHint: "OpenAI odpowiada na podstawie pytania i ostatnich wiadomości. Kontakt nie dołącza tej rozmowy.",
    apiError: "AI jest teraz niedostępne. Pytanie nie dostało odpowiedzi. Spróbuj później lub skontaktuj się z człowiekiem.",
    apiAbout: "AI korzysta z opublikowanych informacji WitnessOps i ostatnich wiadomości z tej rozmowy. Strona zachowuje rozmowę w pamięci do jej opuszczenia lub odświeżenia.",
    generated: "Odpowiedź wygenerowana przez AI",
    published: "Opublikowane informacje",
    boundary: "Granice odpowiedzi",
    sources: "Źródła",
    composer: "Zapytaj o przegląd",
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
    lead: "Pytania o przegląd WitnessOps, z odpowiedzią na podstawie opublikowanych faktów oferty. Wszystko inne trafia do człowieka.",
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

function withoutTerminalErrorTurn(turns: Turn[]): Turn[] {
  const next = [...turns];
  if (next.at(-1)?.role === "sovereign" && next.at(-1)?.simulatedError) next.pop();
  return next;
}

type Turn = { role: "you" | "sovereign"; text: string; simulated?: boolean; simulatedError?: boolean; needsReview?: boolean; answer?: AskWitnessOpsUiAnswer };
type Live = "idle" | "processing" | "answered" | "handoff" | "error";

export function liveText(locale: SovereignLocale, live: Live, phase: SovereignSpriteState): string {
  const copy = COPY[locale];
  if (phase === "ERROR" || live === "error") return copy.notAnswered;
  if (phase === "PROCESSING" || live === "processing") return copy.checking;
  if (phase === "HANDOFF" || live === "handoff") return copy.handoff;
  return copy.idle;
}

export function announcementText(locale: SovereignLocale, kind: "answer" | "handoff" | "error", answer = "", simulated = true): string {
  if (!simulated) {
    if (kind === "error") return COPY[locale].apiError;
    return `Sovereign: ${answer}${kind === "handoff" ? (locale === "pl" ? " Link do kontaktu jest w rozmowie." : " The contact link is in the conversation.") : ""}`;
  }
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
  const next = Math.max(0, top);
  if (Math.abs(next - thread.scrollTop) < 0.5) return;
  thread.scrollTo({ top: next, behavior: reduced ? "auto" : "smooth" });
  if (!reduced) thread.scrollTop = next;
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
  const next = Math.max(0, thread.scrollTop + delta);
  thread.scrollTo({ top: next, behavior: reduced ? "auto" : "smooth" });
  if (!reduced) thread.scrollTop = next;
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

export function AskSovereignPreview({ locale = "en", routePrefix, onClose, connection = "preview" }: { locale?: SovereignLocale; routePrefix?: "" | "/pl"; onClose?: () => void; connection?: "preview" | "api" }) {
  const copy = COPY[locale];
  const prefix = routePrefix ?? (locale === "pl" ? "/pl" : "");
  const links = sovereignLinks(prefix);
  function actionHref(href: string): string {
    const path = href.replace(/^\/pl(?=\/)/, "");
    // Only localize actions with published Polish counterparts. Citations
    // keep their canonical targets, and /check remains its existing route.
    return /^\/(?:support|security|review\/request)(?:[/?#]|$)/.test(path) ? `${prefix}${path}` : href;
  }
  const embedded = Boolean(onClose);
  const close = useCallback(() => {
    if (onClose) onClose();
    else window.location.assign(links.docs);
  }, [links.docs, onClose]);
  const pageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const announcerRef = useRef<HTMLParagraphElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef<Array<HTMLLIElement | null>>([]);
  const generation = useRef(0);
  const pendingCancel = useRef<(() => void) | null>(null);
  const lastQuestion = useRef("");
  const requestInFlight = useRef(false);
  const history = useRef<AskConversationMessage[]>([]);
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<SovereignSpriteState>("GREETING");
  const [live, setLive] = useState<Live>("idle");
  const [announcement, setAnnouncement] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [share, setShare] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([{ role: "sovereign", text: connection === "api" ? copy.apiGreeting : copy.greeting }]);
  const [activeSim, setActiveSim] = useState<ReturnType<typeof simFlag>>(null);
  const useApi = connection === "api" && activeSim === null;
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

  function showAnswer(text: string, answer: { text: string; kind: string; needsReview: boolean }, apiAnswer?: AskWitnessOpsUiAnswer) {
    clearPendingTimers();
    requestInFlight.current = false;
    setPending(false);
    setTurns((current) => {
      const next = [...current];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        const turn = next[index];
        if (turn?.role === "you" && turn.text === text) {
          next[index] = { ...turn, simulatedError: false };
          break;
        }
      }
      next.push({ role: "sovereign", text: answer.text, simulated: !apiAnswer, needsReview: answer.needsReview, answer: apiAnswer });
      return next;
    });
    if (answer.kind === "handoff") {
      setPhase("HANDOFF");
      setLive("handoff");
      publishAnnouncement(announcementText(locale, "handoff", answer.text, !apiAnswer));
      return;
    }
    setPhase("IDLE");
    setLive("answered");
    publishAnnouncement(announcementText(locale, "answer", answer.text, !apiAnswer));
  }

  function failQuestion(text: string, simulated = true) {
    clearPendingTimers();
    requestInFlight.current = false;
    setPending(false);
    setTurns((current) => {
      const next = [...current];
      let at = next.length;
      for (let index = next.length - 1; index >= 0; index -= 1) {
        const turn = next[index];
        if (turn?.role === "you" && turn.text === text) {
          next[index] = { ...turn, simulatedError: false };
          at = index + 1;
          break;
        }
      }
      next.splice(at, 0, { role: "sovereign", text: "", simulatedError: true, simulated });
      return next;
    });
    setPhase("ERROR");
    setLive("error");
    publishAnnouncement(announcementText(locale, "error", "", simulated));
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
      if (!embedded) composerRef.current?.focus({ preventScroll: true });
    };
    panel.addEventListener("animationend", start);
    const fallback = window.setTimeout(start, 260);
    return () => {
      panel.removeEventListener("animationend", start);
      window.clearTimeout(fallback);
    };
  }, [locale, embedded]);

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
    applyThreadFade(thread, true);
  }, [live, turns, loadError, followUpsReady]);

  useEffect(() => () => {
    generation.current += 1;
    pendingCancel.current?.();
  }, []);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const syncFade = () => applyThreadFade(thread);
    const snapFade = () => applyThreadFade(thread, true);
    syncFade();
    thread.addEventListener("scroll", syncFade, { passive: true });
    thread.addEventListener("scrollend", syncFade);
    const observer = new ResizeObserver(snapFade);
    observer.observe(thread);
    const transcript = thread.querySelector("ol");
    if (transcript) observer.observe(transcript);
    return () => {
      thread.removeEventListener("scroll", syncFade);
      thread.removeEventListener("scrollend", syncFade);
      observer.disconnect();
    };
  }, [turns, live, followUpsReady, mobile]);

  useEffect(() => {
    if (!mobile || embedded) return;
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
        close();
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
  }, [mobile, embedded, close]);

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
    if (!focusComposer.current || pending) return;
    focusComposer.current = false;
    if (composerRef.current?.getClientRects().length) composerRef.current?.focus({ preventScroll: true });
  });

  function ask(question: string, resend = false) {
    const text = question.trim();
    if (!text) return;
    if (pending) return;
    if (requestInFlight.current) return;
    requestInFlight.current = true;
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
      const next = resend ? withoutTerminalErrorTurn(current) : [...current];
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
      requestInFlight.current = false;
      setPending(false);
      setPhase("ERROR");
      setLive("error");
      publishAnnouncement(announcementText(locale, "error"));
      return;
    }
    if (connection === "api" && !flag) {
      if (phase === "ERROR") setPhase("IDLE");
      setPending(true);
      setLive("processing");
      publishAnnouncement(copy.checking);
      const controller = new AbortController();
      const showTimer = window.setTimeout(() => {
        if (generation.current === gen) setPhase("PROCESSING");
      }, PROCESSING_SHOW_DELAY_MS);
      pendingCancel.current = () => {
        window.clearTimeout(showTimer);
        controller.abort();
      };
      void fetchAskWitnessOps(text, { history: history.current, signal: controller.signal, surface: "sovereign_widget" }).then((answer) => {
        if (generation.current !== gen) return;
        const responseText = askWitnessOpsAnswerText(answer);
        if (!responseText.trim() || answer.fallback_reason === "ai_unavailable") {
          failQuestion(text, false);
          return;
        }
        // Only completed, allowed exchanges become context. A refused input
        // must not poison the next question or be sent again in its history.
        if (answer.status === "success" && answer.answer_mode !== "policy_refusal") {
          history.current = keepRecentAskHistory([
            ...history.current,
            { role: "user", content: text },
            { role: "assistant", content: responseText },
          ]);
        }
        showAnswer(text, { text: responseText, kind: answer.status === "closed" ? "handoff" : "answer", needsReview: false }, answer);
      }).catch(() => {
        if (generation.current === gen) failQuestion(text, false);
      });
      return;
    }
    if (flag === "typing") {
      setPending(true);
      setPhase("COMPOSING");
      setLive("processing");
      publishAnnouncement(copy.checking);
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
      if (item.role === "sovereign" && !item.simulatedError) spriteIndex = itemIndex;
    });
  }

  const errorText = useApi ? copy.apiError : copy.errorNote;
  const errorSplit = errorText.lastIndexOf(" ");
  const errorHead = errorSplit > 0 ? errorText.slice(0, errorSplit + 1) : "";
  const errorTail = errorSplit > 0 ? errorText.slice(errorSplit + 1) : errorText;
  const errorNote = (
    <p className={styles.errorNote} data-locale={locale}>
      {!useApi ? <span className={styles.turnChip}>{copy.simulatedChip}</span> : null}
      <span className={styles.errorCaption}>
        {errorHead}
        <span className={styles.captionTail}>{errorTail}</span>
      </span>
    </p>
  );

  const previewHint = <p id="ask-sovereign-optin-hint" className={styles.optinHint}>{useApi ? copy.apiHint : copy.optinHint}</p>;
  const askDock = (
    <div className={styles.askDock}>
      <div className={styles.chips} data-ask-chips="">
        {suggestions.map((suggestion) => (
          <button key={suggestion.id} type="button" data-suggestion={suggestion.id} disabled={pending} onClick={() => ask(suggestion.text)}>{suggestion.text}</button>
        ))}
      </div>
      <label className={styles.optin}>
        <input type="checkbox" checked={share} disabled={useApi} aria-describedby="ask-sovereign-optin-hint" onChange={(event) => setShare(event.target.checked)} />
        {useApi ? copy.apiOptin : copy.optin}
      </label>
      {!embedded ? previewHint : null}
    </div>
  );

  return (
    <div className={`${styles.page}${embedded ? ` ${styles.widget}` : ""}`} ref={pageRef} data-sovereign-preview="">
      {!embedded ? <div className={styles.scrim} /> : null}
      <div className={styles.layout}>
        <section
          ref={panelRef}
          className={styles.panel}
          aria-labelledby="ask-sovereign-title"
          role={mobile && !embedded ? "dialog" : undefined}
          aria-modal={mobile && !embedded ? true : undefined}
        >
          <p ref={announcerRef} className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
          <div className={styles.stripe} />
          <header
            className={styles.bar}
            data-header-chip={activeSim === "slow" || activeSim === "timeout" || activeSim === "typing" ? "" : undefined}
            onPointerDown={(event) => {
              if (!mobile || embedded) return;
              const startY = event.clientY;
              const start = performance.now();
              function end(up: PointerEvent) {
                const distance = up.clientY - startY;
                const velocity = distance / Math.max(1, performance.now() - start);
                if (distance > 96 || velocity > 0.5) close();
                window.removeEventListener("pointerup", end);
              }
              window.addEventListener("pointerup", end);
            }}
          >
            <span className={styles.mark} aria-hidden="true" />
            <p className={styles.name} id="ask-sovereign-title">Ask Sovereign <span className={styles.titleUnit}><span className={styles.badge}>AI</span></span></p>
            {activeSim === "slow" || activeSim === "timeout" || activeSim === "typing" ? <p className={styles.simChip}>{previewChip(activeSim)}</p> : null}
            <div className={styles.controls}>
              <button type="button" className={`${styles.iconButton} ${styles.pause}`} aria-pressed={paused} aria-label={paused ? copy.play : copy.pause} onClick={togglePaused}>
                {paused ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5-7-4.5z" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                )}
              </button>
              {embedded ? <button type="button" className={`${styles.iconButton} ${styles.close}`} onClick={close} aria-label={copy.close}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button> : <a className={`${styles.iconButton} ${styles.close}`} href={links.docs} aria-label={copy.close}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              </a>}
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
              const retry = turn.role === "sovereign" && turn.simulatedError && index === turns.length - 1 && live === "error" ? <button type="button" className={styles.retry} data-retry="" onClick={retryFromError}>{copy.retry}</button> : null;
              const sprite = <SovereignSprite state={phase} paused={paused} reduced={reduced} armed={armed} viewport={mobile ? "mobile" : "desktop"} />;
              const latestAnswer = turn.role === "sovereign" && (turn.simulated || turn.answer) && !turn.simulatedError;
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
              const service = turn.answer?.recommendation
                ? BUYER_SERVICES.find((item) => item.id === turn.answer?.recommendation?.service_id)
                : undefined;
              const content = (
                <>
                  <span>{turn.role === "you" ? copy.you : "Sovereign"}</span>
                  {previewCaption && activeSim !== "handoff" ? <p className={styles.sim} data-preview-caption="">{previewCaption}</p> : null}
                  {turn.answer ? <p className={styles.sim} data-answer-mode={turn.answer.answer_mode}>{turn.answer.answer_mode === "ai_assisted" ? copy.generated : turn.answer.answer_mode === "policy_refusal" ? copy.boundary : copy.published}</p> : null}
                  {turn.text ? <p data-answer-copy={latestAnswer ? "" : undefined}><ContactLine text={turn.text} /></p> : null}
                  {service ? (
                    <div data-answer-recommendation="">
                      <p><strong>{service.name[locale]}</strong></p>
                      <p><PriceText text={service.pricingVisible === false ? service.availability?.label[locale] ?? "" : service.price[locale]} /></p>
                      <p>{service.timing[locale]}</p>
                      <p><a href={actionHref(`${buyerServiceRequestHref(locale, service)}&source=ask`)}>{locale === "pl" ? "Poproś o zakres" : "Request scope"}</a></p>
                    </div>
                  ) : null}
                  {!service && turn.answer?.route ? (
                    <p data-answer-route=""><a href={actionHref(askWitnessOpsRouteHref(turn.answer.route))}>{locale === "pl" ? PL_ROUTE_LABELS[turn.answer.route.route_id] ?? "Przejdź dalej" : askWitnessOpsRouteLabel(turn.answer.route.route_id)}</a></p>
                  ) : null}
                  {turn.answer && turn.answer.presented_sources.length > 0 ? (
                    <ul className={styles.sources} data-answer-sources="" aria-label={copy.sources}>
                      {turn.answer.presented_sources.map((source) => (
                        <li key={source.source_id}><a href={askWitnessOpsSourceHref(source)} target={askWitnessOpsSourceTarget(source) === "external" ? "_blank" : undefined} rel={askWitnessOpsSourceTarget(source) === "external" ? "noopener noreferrer" : undefined}>{source.public_label}</a></li>
                      ))}
                    </ul>
                  ) : null}
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
              <a className={styles.handoffCta} data-handoff-cta href={links.contact}>{copy.handoffCta} <InlineArrow /></a>
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
          {embedded ? askDock : null}
          </div>
          {!embedded ? askDock : null}
          {embedded ? previewHint : null}
          <form className={styles.composer} aria-busy={pending ? "true" : "false"} onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
            <label className={styles.composerLabel} htmlFor="ask-sovereign-draft">{copy.composer}</label>
            <input id="ask-sovereign-draft" ref={composerRef} value={draft} maxLength={ASK_MAX_QUESTION_LENGTH} disabled={pending} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit" aria-label={copy.send} disabled={pending}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </form>
        </section>
        {!embedded ? <aside className={styles.rail} data-sheet-behind>
          <p className={styles.back}><Link href={links.docs} prefetch={false}>{copy.back}</Link></p>
          <p className={styles.kicker}>{copy.kicker}</p>
          <p className={styles.lead}>{copy.lead}</p>
          <h3>{copy.railAnswer}</h3>
          <ul>
            <OfferFact name={PUBLIC_AGENT_ACTION_OFFER.name[locale]} price={PUBLIC_AGENT_ACTION_OFFER.price[locale]} />
            <li>{copy.railStart}</li>
          </ul>
          <h3>{copy.railAbout}</h3>
          <p>{useApi ? copy.apiAbout : copy.railAboutBody}</p>
          {showReview ? (
            <ul className={styles.review}>
              {REVIEW_TOPICS.map((topic) => <li key={topic}>{topic} <span>Needs review</span></li>)}
            </ul>
          ) : null}
        </aside> : null}
      </div>
    </div>
  );
}
