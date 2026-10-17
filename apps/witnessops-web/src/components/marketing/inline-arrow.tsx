import type { CSSProperties } from "react";

const ROTATION = { left: 180, right: 0, "up-right": -45 } as const;

/** 1em arrow. Stroke follows the Inter 400 stem so the public font subset is not required. */
export function InlineArrow({ direction = "right" }: { direction?: keyof typeof ROTATION }) {
  const rotation = ROTATION[direction];
  const style: CSSProperties = {
    display: "inline-block",
    width: "1em",
    height: "1em",
    verticalAlign: "-0.125em",
    flexShrink: 0,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  };
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" style={style}>
      <path
        d="M2.75 8h10.5M9.1 3.6 13.25 8 9.1 12.4"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
