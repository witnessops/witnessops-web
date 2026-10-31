"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { constrainPosition, defaultPosition, type Point, type Viewport } from "./floating-position";

function viewportBounds(): Viewport {
  const viewport = window.visualViewport;
  return {
    x: viewport?.offsetLeft ?? 0,
    y: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

const NO_INSET: Point = { x: 0, y: 0 };

export function useFloatingWidget(
  ref: RefObject<HTMLElement | null>,
  active = true,
  restInset: Point | ((bounds: Viewport) => Point) = NO_INSET,
) {
  // A keyboard/rotation may temporarily clamp the rendered position. Only an
  // explicit move should replace the user's choice; null means bottom-right.
  const preferredPosition = useRef<Point | null>(null);
  const gesture = useRef<{ id: number; start: Point; origin: Point; preferred: Point | null; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [point, setPoint] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);

  const place = useCallback((requested?: Point) => {
    const element = ref.current;
    if (!element) return;
    const size = element.getBoundingClientRect();
    if (!size.width || !size.height) return;
    const bounds = viewportBounds();
    const inset = typeof restInset === "function" ? restInset(bounds) : restInset;
    const rested = defaultPosition(size, bounds);
    const home = { x: rested.x - inset.x, y: rested.y - inset.y };
    const next = constrainPosition(requested ?? preferredPosition.current ?? home, size, bounds);
    if (requested) preferredPosition.current = next;
    setPoint((current) => current?.x === next.x && current.y === next.y ? current : next);
  }, [ref, restInset]);

  const reset = useCallback(() => {
    preferredPosition.current = null;
    setPoint(null);
    place();
  }, [place]);

  useEffect(() => {
    if (!active) return;
    const sync = () => place();
    sync();
    const viewport = window.visualViewport;
    window.addEventListener("resize", sync);
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    const observer = new ResizeObserver(sync);
    if (ref.current) observer.observe(ref.current);
    return () => {
      window.removeEventListener("resize", sync);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [active, place, ref]);

  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    suppressClick.current = current.moved || cancelled;
    setDragging(false);
    if (cancelled) {
      preferredPosition.current = current.preferred;
      place();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return {
    reset,
    dragging,
    style: point ? { left: point.x, top: point.y, right: "auto", bottom: "auto" } satisfies CSSProperties : undefined,
    consumeDragClick() {
      const suppressed = suppressClick.current;
      suppressClick.current = false;
      return suppressed;
    },
    handlers: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || !event.isPrimary || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        suppressClick.current = false;
        gesture.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: { x: rect.x, y: rect.y }, preferred: preferredPosition.current, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = gesture.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.start.x;
        const dy = event.clientY - current.start.y;
        if (!current.moved && Math.hypot(dx, dy) < 6) return;
        current.moved = true;
        setDragging(true);
        place({ x: current.origin.x + dx, y: current.origin.y + dy });
      },
      onPointerUp(event: PointerEvent<HTMLElement>) { finish(event); },
      onPointerCancel(event: PointerEvent<HTMLElement>) { finish(event, true); },
      onLostPointerCapture(event: PointerEvent<HTMLElement>) { finish(event, true); },
      onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "Home") {
          event.preventDefault();
          reset();
          return;
        }
        const deltas: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const delta = deltas[event.key];
        if (!delta || !ref.current) return;
        event.preventDefault();
        const rect = ref.current.getBoundingClientRect();
        const step = event.shiftKey ? 64 : 16;
        place({ x: rect.x + delta[0] * step, y: rect.y + delta[1] * step });
      },
    },
  };
}
