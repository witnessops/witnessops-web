"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { sovereignAssistantPublished } from "@/lib/sovereign-release";
import { type SovereignLocale } from "./ask-sovereign-answers";
import { AskSovereignPreview } from "./ask-sovereign-preview";
import { useFloatingWidget } from "./use-floating-widget";
import { ShellbitLauncher } from "./shellbit-launcher";
import { clearRightPosition } from "./launcher-placement";
import type { Point, Size, Viewport } from "./floating-position";
import { pointOutsideBox, shouldDismissBackdrop } from "./widget-dismiss";
import styles from "./ask-sovereign-widget.module.css";

function useGreetingLabel(): boolean {
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShowLabel(true);
    const timer = window.setTimeout(() => setShowLabel(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return showLabel;
}

function HomepageAssistant({ locale, routePrefix }: { locale: SovereignLocale; routePrefix: "" | "/pl" }) {
  const launcherRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [visible, setVisible] = useState(false);
  const [jump, setJump] = useState(0);
  const placementSeed = useRef<number | null>(null);
  const automaticPosition = useRef<Point | null>(null);
  const launcherHome = useCallback((element: HTMLElement, size: Size, bounds: Viewport) => {
    placementSeed.current ??= Math.random();
    automaticPosition.current = clearRightPosition(element, size, bounds, placementSeed.current, automaticPosition.current);
    return automaticPosition.current;
  }, []);
  const pet = useFloatingWidget(launcherRef, !visible, launcherHome);
  const showGreeting = useGreetingLabel();
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
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse" && !pet.dragging && !visible) setJump((value) => value + 1);
          }}
          onClick={(event) => {
            const dragged = pet.consumeDragClick();
            if (!dragged || event.detail === 0) open();
          }}
        >
          {showGreeting ? (
            <span className={styles.label}>{locale === "pl" ? "Zapytaj Sovereign" : "Ask Sovereign"}</span>
          ) : null}
          <ShellbitLauncher moving={pet.moving} jump={jump} active={!visible} />
          <span className={styles.hint}>{process.env.NODE_ENV === "production" ? (locale === "pl" ? "Przeciągnij" : "Drag me") : (locale === "pl" ? "Podgląd · Przeciągnij" : "Preview · Drag me")}</span>
          <span className={styles.talkLabel} data-sovereign-talk-label="" aria-hidden="true">{locale === "pl" ? "Porozmawiaj z Sovereign" : "Talk to Sovereign"}</span>
        </button>
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
        aria-label={process.env.NODE_ENV === "production" ? (locale === "pl" ? "Zapytaj Sovereign" : "Ask Sovereign") : (locale === "pl" ? "Ask Sovereign — podgląd" : "Ask Sovereign preview")}
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
            'a[href], button, summary, input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
        <details className={styles.positionMenu}>
          <summary role="button" aria-label={locale === "pl" ? "Opcje okna" : "Window options"}>···</summary>
          <div className={styles.moveBar}>
          <button type="button" className={styles.moveHandle} aria-label={moveLabel} aria-describedby="sovereign-move-help" {...panel.handlers}>
            <span aria-hidden="true">⠿</span> {moveLabel}
          </button>
          <button type="button" className={styles.resetPanel} onClick={resetPositions}>{resetLabel}</button>
          </div>
        </details>
        {/* Minimize without discarding the in-memory conversation or in-flight reply. */}
        {opened ? <AskSovereignPreview locale={locale} routePrefix={routePrefix} onClose={close} connection="api" active={visible} /> : null}
      </dialog>
    </>
  );
}

// At the future Polish domain root, use locale="pl" with the default empty prefix.
export function AskSovereignWidget({ locale = "en", routePrefix = "" }: { locale?: SovereignLocale; routePrefix?: "" | "/pl" }) {
  if (!sovereignAssistantPublished()) return null;
  return <HomepageAssistant locale={locale} routePrefix={routePrefix} />;
}
