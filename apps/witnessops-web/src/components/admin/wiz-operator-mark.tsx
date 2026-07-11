import Image from "next/image";

export type WizOperatorState =
  | "idle"
  | "listening"
  | "thinking"
  | "recommending"
  | "boundary";

interface WizOperatorMarkProps {
  state?: WizOperatorState;
  size?: number;
  className?: string;
  label?: string;
}

const stateLabels: Record<WizOperatorState, string> = {
  idle: "Wiz idle",
  listening: "Wiz listening",
  thinking: "Wiz checking the queue",
  recommending: "Wiz recommending the next action",
  boundary: "Wiz showing an operator boundary",
};

const stateAssets: Record<WizOperatorState, string> = {
  idle: "/visuals/wiz/idle.webp",
  listening: "/visuals/wiz/listening.webp",
  thinking: "/visuals/wiz/thinking.webp",
  recommending: "/visuals/wiz/recommending.webp",
  boundary: "/visuals/wiz/boundary.webp",
};

export function WizOperatorMark({
  state = "idle",
  size = 96,
  className,
  label,
}: WizOperatorMarkProps) {
  return (
    <Image
      src={stateAssets[state]}
      width={size}
      height={Math.round((size * 208) / 192)}
      className={className}
      alt={label ?? stateLabels[state]}
      style={{ imageRendering: "pixelated" }}
      unoptimized
    />
  );
}
