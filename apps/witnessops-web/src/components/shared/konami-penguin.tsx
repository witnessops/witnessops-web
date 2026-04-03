"use client";

import { useCallback, useEffect, useState } from "react";

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

export function KonamiPenguin() {
  const [triggered, setTriggered] = useState(false);
  const [position, setPosition] = useState(-60);

  const handleKey = useCallback(() => {
    let seq: string[] = [];

    function onKey(e: KeyboardEvent) {
      seq.push(e.key);
      if (seq.length > KONAMI.length) seq = seq.slice(-KONAMI.length);
      if (seq.length === KONAMI.length && seq.every((k, i) => k === KONAMI[i])) {
        setTriggered(true);
        seq = [];
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => handleKey(), [handleKey]);

  // Waddle across screen
  useEffect(() => {
    if (!triggered) return;
    let frame: number;
    let pos = -60;

    function animate() {
      pos += 2;
      setPosition(pos);
      if (pos < window.innerWidth + 60) {
        frame = requestAnimationFrame(animate);
      } else {
        setTriggered(false);
        setPosition(-60);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [triggered]);

  if (!triggered) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: position,
        zIndex: 9999,
        fontSize: 48,
        pointerEvents: "none",
        filter: "drop-shadow(0 0 16px rgba(255, 107, 53, 0.3))",
        animation: "konami-waddle 0.4s ease-in-out infinite alternate",
      }}
      aria-hidden="true"
    >
      🐧
    </div>
  );
}
