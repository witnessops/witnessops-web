"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Share2, Square, Volume2 } from "lucide-react";
import styles from "./answer-actions.module.css";

const COPY = {
  en: {
    actions: "Answer controls", copy: "Copy", copied: "Copied", read: "Read aloud", stop: "Stop",
    share: "Share", shared: "Share dialog completed", cancelled: "Sharing cancelled",
    shareFailed: "Sharing is unavailable. You can copy this answer instead.",
    fallback: "Answer copied. Paste it into the app you want to share with.",
    manual: "Select and copy the answer below.", text: "Answer to copy", dismiss: "Hide text",
    voice: "Uses your browser’s voice", noVoice: "Read aloud is unavailable in this browser.",
  },
  pl: {
    actions: "Opcje odpowiedzi", copy: "Kopiuj", copied: "Skopiowano", read: "Odczytaj", stop: "Zatrzymaj",
    share: "Udostępnij", shared: "Zakończono okno udostępniania", cancelled: "Anulowano udostępnianie",
    shareFailed: "Udostępnianie jest niedostępne. Możesz skopiować odpowiedź.",
    fallback: "Skopiowano odpowiedź. Wklej ją w wybranej aplikacji.",
    manual: "Zaznacz i skopiuj odpowiedź poniżej.", text: "Odpowiedź do skopiowania", dismiss: "Ukryj tekst",
    voice: "Korzysta z głosu przeglądarki", noVoice: "Odczyt jest niedostępny w tej przeglądarce.",
  },
};

/** One reader per conversation. Closing/minimizing must also stop its audio. */
export function useAnswerReader(active: boolean, locale: "en" | "pl") {
  const [supported, setSupported] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const startup = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    clearTimeout(startup.current);
    const utterance = current.current;
    current.current = null;
    if (utterance) {
      utterance.onstart = null; utterance.onend = null; utterance.onerror = null;
      window.speechSynthesis.cancel();
    }
  }, []);
  const stop = useCallback(() => { cancel(); setReading(null); }, [cancel]);

  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", stop);
      cancel();
    };
  }, [cancel, stop]);
  useEffect(() => { if (!active) stop(); }, [active, stop]);

  function read(id: number, text: string) {
    if (!active || !supported) return;
    stop(); setFailed(null);
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale === "pl" ? "pl-PL" : "en-US";
      const voices = window.speechSynthesis.getVoices();
      const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(locale));
      const voice = matching.find((item) => item.localService && item.default)
        ?? matching.find((item) => item.localService) ?? matching.find((item) => item.default) ?? matching[0];
      if (voice) utterance.voice = voice;
      current.current = utterance;
      const fail = () => {
        if (current.current !== utterance) return;
        stop(); setFailed(id);
      };
      utterance.onstart = () => clearTimeout(startup.current);
      utterance.onend = () => { if (current.current === utterance) stop(); };
      utterance.onerror = fail;
      setReading(id);
      startup.current = setTimeout(fail, 10_000);
      window.speechSynthesis.speak(utterance);
    } catch { stop(); setFailed(id); }
  }
  return { supported, reading, failed, read, stop };
}

export function AnswerActions({ locale, text, speechText, id, reader, announce }: {
  locale: "en" | "pl"; text: string; speechText: string; id: number;
  reader: ReturnType<typeof useAnswerReader>;
  announce: (message: string) => void;
}) {
  const copy = COPY[locale];
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const manualRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (manual) { manualRef.current?.focus(); manualRef.current?.select(); } }, [manual]);
  useEffect(() => { if (reader.failed === id) announce(copy.noVoice); }, [reader.failed, id, copy.noVoice, announce]);
  function report(message: string) { setStatus(message); announce(message); }

  async function copyText(shared = false) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(text);
      setManual(false); report(shared ? copy.fallback : copy.copied);
    } catch { setManual(true); report(copy.manual); }
  }
  async function perform(action: "copy" | "share") {
    if (operation.current) return;
    operation.current = true; setBusy(true); setStatus("");
    try {
      const data = { title: "Ask Sovereign", text };
      if (action === "copy") await copyText();
      else if (!navigator.share || (navigator.canShare && !navigator.canShare(data))) await copyText(true);
      else {
        await navigator.share(data);
        report(copy.shared);
      }
    } catch (error) {
      // Cancellation is not consent to silently copy or send through another app.
      report(error instanceof Error && error.name === "AbortError" ? copy.cancelled : copy.shareFailed);
    } finally { operation.current = false; setBusy(false); }
  }
  const reading = reader.reading === id;
  return <div className={styles.root} data-answer-actions="">
    <div className={styles.buttons} role="group" aria-label={copy.actions}>
      <button type="button" disabled={busy} onClick={() => void perform("copy")}><Copy aria-hidden="true" size={15} />{copy.copy}</button>
      <button type="button" disabled={!reader.supported} title={reader.supported ? copy.voice : copy.noVoice} aria-pressed={reading} onClick={() => { setStatus(""); if (reading) reader.stop(); else reader.read(id, speechText); }}>
        {reading ? <Square aria-hidden="true" size={15} /> : <Volume2 aria-hidden="true" size={15} />}{reading ? copy.stop : copy.read}
      </button>
      <button type="button" disabled={busy} onClick={() => void perform("share")}><Share2 aria-hidden="true" size={15} />{copy.share}</button>
    </div>
    <p className={styles.feedback} data-answer-action-feedback="">{status || (reader.failed === id ? copy.noVoice : "")}</p>
    {manual ? <div className={styles.manual}>
      <textarea ref={manualRef} aria-label={copy.text} readOnly value={text} rows={5} />
      <button type="button" onClick={() => { setManual(false); setStatus(""); }}>{copy.dismiss}</button>
    </div> : null}
  </div>;
}
