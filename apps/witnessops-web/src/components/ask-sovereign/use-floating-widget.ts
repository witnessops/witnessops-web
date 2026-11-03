"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { constrainPosition, defaultPosition, type Point, type Size, type Viewport } from "./floating-position";

function viewportBounds(): Viewport {
  const viewport = window.visualViewport;
  return {
    x: viewport?.offsetLeft ?? 0,
    y: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

export function useFloatingWidget(
  ref: RefObject<HTMLElement | null>,
  active = true,
  homePosition?: (element: HTMLElement, size: Size, bounds: Viewport) => Point,
) {
  // A keyboard/rotation may temporarily clamp the rendered position. Only an
  // explicit move should replace the user's choice; null means bottom-right.
  const preferredPosition = useRef<Point | null>(null);
  const gesture = useRef<{ id: number; start: Point; last: Point; origin: Point; preferred: Point | null; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [point, setPoint] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [moving, setMoving] = useState<"left" | "right" | null>(null);
  const movementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const direction = useRef<"left" | "right">("right");
  const stopMoving = useCallback(() => {
    if (movementTimer.current !== null) clearTimeout(movementTimer.current);
    setMoving(null);
  }, []);
  function showMovement(dx: number) {
    if (dx !== 0) direction.current = dx < 0 ? "left" : "right";
    if (movementTimer.current !== null) clearTimeout(movementTimer.current);
    setMoving(direction.current);
    movementTimer.current = setTimeout(() => setMoving(null), 180);
  }
  useEffect(() => () => {
    if (movementTimer.current !== null) clearTimeout(movementTimer.current);
  }, []);

  const place = useCallback((requested?: Point) => {
    const element = ref.current;
    if (!element) return;
    const size = element.getBoundingClientRect();
    if (!size.width || !size.height) return;
    const bounds = viewportBounds();
    const target = requested ?? preferredPosition.current ?? homePosition?.(element, size, bounds) ?? defaultPosition(size, bounds);
    const next = constrainPosition(target, size, bounds);
    if (requested) preferredPosition.current = next;
    setPoint((current) => current?.x === next.x && current.y === next.y ? current : next);
  }, [ref, homePosition]);

  const reset = useCallback(() => {
    stopMoving();
    preferredPosition.current = null;
    setPoint(null);
    place();
  }, [place, stopMoving]);

  useEffect(() => {
    if (!active) return;
    const sync = () => place();
    let scrollTimer = 0;
    const afterScroll = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        if (!gesture.current && !ref.current?.contains(document.activeElement) && !ref.current?.matches(":hover")) place();
      }, 180);
    };
    sync();
    const viewport = window.visualViewport;
    window.addEventListener("resize", sync);
    if (homePosition) window.addEventListener("scroll", afterScroll, { passive: true, capture: true });
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    const observer = new ResizeObserver(sync);
    if (ref.current) observer.observe(ref.current);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", afterScroll, true);
      window.clearTimeout(scrollTimer);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [active, place, ref, homePosition]);

  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    suppressClick.current = current.moved || cancelled;
    setDragging(false);
    stopMoving();
    if (cancelled) {
      preferredPosition.current = current.preferred;
      place();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return {
    reset,
    dragging,
    moving,
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
        gesture.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, last: { x: event.clientX, y: event.clientY }, origin: { x: rect.x, y: rect.y }, preferred: preferredPosition.current, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = gesture.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.start.x;
        const dy = event.clientY - current.start.y;
        if (!current.moved && Math.hypot(dx, dy) < 6) return;
        current.moved = true;
        if (event.clientX !== current.last.x || event.clientY !== current.last.y) showMovement(event.clientX - current.last.x);
        current.last = { x: event.clientX, y: event.clientY };
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
        showMovement(delta[0]);
        place({ x: rect.x + delta[0] * step, y: rect.y + delta[1] * step });
      },
    },
  };
}
