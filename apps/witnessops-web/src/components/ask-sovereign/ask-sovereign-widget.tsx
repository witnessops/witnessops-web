"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { sovereignAssistantPublished } from "@/lib/sovereign-release";
import { type SovereignLocale } from "./ask-sovereign-answers";
import { AskSovereignPreview } from "./ask-sovereign-preview";
import { useFloatingWidget } from "./use-floating-widget";
import { pointOutsideBox, shouldDismissBackdrop } from "./widget-dismiss";
import styles from "./ask-sovereign-widget.module.css";

const WAVE_FRAMES = [0, 1, 2, 1, 2, 3] as const;
const WAVE_MS = [120, 160, 200, 160, 200, 240] as const;

function launcherRest(bounds: { width: number }): { x: number; y: number } {
  if (bounds.width < 768) return { x: 8, y: 96 };
  return { x: 56, y: 104 };
}

function useOnceWave(): { waving: boolean; frame: number; showLabel: boolean } {
  const [waving, setWaving] = useState(false);
  const [frame, setFrame] = useState(0);
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setWaving(true);
    setShowLabel(true);
    let index = 0;
    let timer = 0;
    let cancelled = false;
    const next = () => {
      if (cancelled) return;
      if (index >= WAVE_FRAMES.length) {
        setWaving(false);
        timer = window.setTimeout(() => {
          if (!cancelled) setShowLabel(false);
        }, 420);
        return;
      }
      setFrame(WAVE_FRAMES[index] ?? 0);
      const wait = WAVE_MS[index] ?? 0;
      index += 1;
      timer = window.setTimeout(next, wait);
    };
    next();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return { waving, frame, showLabel };
}

function HomepageAssistant({ locale, routePrefix }: { locale: SovereignLocale; routePrefix: "" | "/pl" }) {
  const launcherRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [visible, setVisible] = useState(false);
  const pet = useFloatingWidget(launcherRef, true, launcherRest);
  const greet = useOnceWave();
  const panel = useFloatingWidget(dialogRef, visible);
  const dismissOutside = useRef(false);
  const close = useCallback(() => {
    if (dialogRef.current?.open) dialogRef.current.close();
  }, []);
  const resetLabel = locale === "pl" ? "Przywróć pozycję" : "Reset position";
  const moveLabel = locale === "pl" ? "Przenieś czat" : "Move chat";

  function resetPositions() {
    pet.reset();
    panel.reset();
  }

  useLayoutEffect(() => {
    if (visible) dialogRef.current?.querySelector<HTMLInputElement>("#ask-sovereign-draft")?.focus({ preventScroll: true });
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const releaseScroll = acquireBodyScrollLock();
    const viewport = window.visualViewport;
    const syncViewport = () => {
      dialogRef.current?.style.setProperty("--widget-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      dialogRef.current?.style.setProperty("--widget-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      releaseScroll();
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, [visible]);

  function open() {
    dialogRef.current?.showModal();
    setOpened(true);
    setVisible(true);
  }

  return (
    <>
      <div ref={launcherRef} className={styles.pet} style={pet.style} data-dragging={pet.dragging || undefined}>
        <button
          type="button"
          className={styles.launcher}
          aria-label={locale === "pl" ? "Zapytaj Sovereign" : "Ask Sovereign"}
          aria-haspopup="dialog"
          aria-expanded={visible}
          aria-controls="homepage-sovereign-dialog"
          aria-describedby="sovereign-move-help"
          {...pet.handlers}
          onClick={(event) => {
            const dragged = pet.consumeDragClick();
            if (!dragged || event.detail === 0) open();
          }}
        >
          {greet.showLabel ? (
            <span className={styles.label}>{locale === "pl" ? "Zapytaj Sovereign" : "Ask Sovereign"}</span>
          ) : null}
          <span
            className={styles.character}
            data-wave={greet.waving ? "" : undefined}
            style={greet.waving ? ({ "--wave-frame": greet.frame } as CSSProperties) : undefined}
            aria-hidden="true"
          />
          <span className={styles.hint}>{locale === "pl" ? "Podgląd · Przeciągnij" : "Preview · Drag me"}</span>
        </button>
        <button type="button" className={styles.resetPet} aria-label={resetLabel} title={resetLabel} onClick={resetPositions}>↺</button>
      </div>
      <p id="sovereign-move-help" className={styles.srOnly}>
        {locale === "pl"
          ? "Przeciągnij lub użyj klawiszy strzałek, aby przesunąć. Shift przyspiesza ruch. Home przywraca pozycję."
          : "Drag or use arrow keys to move. Shift moves farther. Home resets the position."}
      </p>
      <dialog
        id="homepage-sovereign-dialog"
        ref={dialogRef}
        className={styles.dialog}
        style={panel.style}
        data-dragging={panel.dragging || undefined}
        aria-label={locale === "pl" ? "Ask Sovereign — podgląd" : "Ask Sovereign preview"}
        onPointerDown={(event) => {
          if (event.button !== 0) {
            dismissOutside.current = false;
            return;
          }
          const box = event.currentTarget.getBoundingClientRect();
          dismissOutside.current = pointOutsideBox({ x: event.clientX, y: event.clientY }, box);
        }}
        onPointerUp={(event) => {
          const startedOutside = dismissOutside.current;
          dismissOutside.current = false;
          if (event.button !== 0) return;
          const box = event.currentTarget.getBoundingClientRect();
          if (shouldDismissBackdrop(startedOutside, { x: event.clientX, y: event.clientY }, box)) close();
        }}
        onPointerCancel={() => {
          dismissOutside.current = false;
        }}
        onClose={() => {
          setVisible(false);
          launcherRef.current?.querySelector("button")?.focus({ preventScroll: true });
        }}
        onKeyDown={(event) => {
          if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey) return;
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )].filter((element) => !element.hasAttribute("disabled") && element.getClientRects().length > 0);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (first && last && event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (first && last && !event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className={styles.moveBar}>
          <button type="button" className={styles.moveHandle} aria-label={moveLabel} aria-describedby="sovereign-move-help" {...panel.handlers}>
            <span aria-hidden="true">⠿</span> {moveLabel}
          </button>
          <button type="button" className={styles.resetPanel} onClick={resetPositions}>{resetLabel}</button>
        </div>
        {/* Minimize without discarding the in-memory conversation or in-flight reply. */}
        {opened ? <AskSovereignPreview locale={locale} routePrefix={routePrefix} onClose={close} connection="api" /> : null}
      </dialog>
    </>
  );
}

// At the future Polish domain root, use locale="pl" with the default empty prefix.
export function AskSovereignWidget({ locale = "en", routePrefix = "" }: { locale?: SovereignLocale; routePrefix?: "" | "/pl" }) {
  if (!sovereignAssistantPublished()) return null;
  return <HomepageAssistant locale={locale} routePrefix={routePrefix} />;
}
