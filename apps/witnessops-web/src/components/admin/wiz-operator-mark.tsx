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

function WizFace({ state }: { state: WizOperatorState }) {
  if (state === "listening") {
    return (
      <>
        <path d="M31 52 L36 47 L41 52" fill="none" stroke="#f3f5f8" strokeWidth="4" />
        <path d="M55 52 L60 47 L65 52" fill="none" stroke="#f3f5f8" strokeWidth="4" />
        <path d="M84 31 Q91 36 84 41" fill="none" stroke="#ff8a00" strokeWidth="3" />
        <path d="M89 27 Q100 36 89 45" fill="none" stroke="#ff8a00" strokeWidth="3" />
      </>
    );
  }

  if (state === "thinking") {
    return (
      <>
        <rect x="31" y="48" width="10" height="4" fill="#f3f5f8" />
        <rect x="55" y="48" width="10" height="4" fill="#f3f5f8" />
        <rect x="82" y="19" width="4" height="4" fill="#ffb347" />
        <rect x="88" y="13" width="5" height="5" fill="#ff8a00" />
        <rect x="96" y="7" width="6" height="6" fill="#ffd27a" />
      </>
    );
  }

  if (state === "recommending") {
    return (
      <>
        <rect x="31" y="45" width="10" height="8" fill="#30e0d0" />
        <rect x="55" y="45" width="10" height="8" fill="#30e0d0" />
        <rect x="82" y="38" width="25" height="32" rx="2" fill="#102528" stroke="#30e0d0" strokeWidth="3" />
        <path d="M88 53 L94 59 L102 48" fill="none" stroke="#30e0d0" strokeWidth="3" />
        <rect x="88" y="63" width="13" height="2" fill="#30e0d0" opacity="0.65" />
      </>
    );
  }

  if (state === "boundary") {
    return (
      <>
        <path d="M31 45 L41 55 M41 45 L31 55" stroke="#ff4d4d" strokeWidth="4" />
        <path d="M55 45 L65 55 M65 45 L55 55" stroke="#ff4d4d" strokeWidth="4" />
        <path d="M94 38 L108 64 H80 Z" fill="#2b1111" stroke="#ff4d4d" strokeWidth="3" />
        <rect x="92" y="47" width="4" height="9" fill="#ff4d4d" />
        <rect x="92" y="59" width="4" height="4" fill="#ff4d4d" />
      </>
    );
  }

  return (
    <>
      <rect x="31" y="47" width="10" height="6" fill="#f3f5f8" />
      <rect x="55" y="47" width="10" height="6" fill="#f3f5f8" />
      <rect x="84" y="17" width="7" height="7" fill="#ff8a00" />
    </>
  );
}

export function WizOperatorMark({
  state = "idle",
  size = 96,
  className,
  label,
}: WizOperatorMarkProps) {
  return (
    <svg
      viewBox="0 0 116 112"
      width={size}
      height={Math.round((size * 112) / 116)}
      className={className}
      role="img"
      aria-label={label ?? stateLabels[state]}
      shapeRendering="crispEdges"
    >
      <ellipse cx="49" cy="106" rx="31" ry="4" fill="#000000" opacity="0.35" />

      <rect x="31" y="89" width="15" height="17" fill="#11151d" stroke="#05070a" strokeWidth="4" />
      <rect x="51" y="89" width="15" height="17" fill="#11151d" stroke="#05070a" strokeWidth="4" />
      <rect x="23" y="68" width="10" height="23" rx="3" fill="#161b25" stroke="#05070a" strokeWidth="4" />
      <rect x="65" y="68" width="10" height="23" rx="3" fill="#161b25" stroke="#05070a" strokeWidth="4" />
      <rect x="29" y="65" width="40" height="32" rx="6" fill="#11151d" stroke="#05070a" strokeWidth="5" />

      <path
        d="M47 26 V18 C47 9 56 6 62 12 L68 18 C72 22 78 20 79 14"
        fill="none"
        stroke="#222936"
        strokeWidth="7"
        strokeLinecap="square"
      />
      <rect x="76" y="10" width="9" height="9" rx="2" fill="#252c39" stroke="#05070a" strokeWidth="3" />

      <rect x="15" y="25" width="66" height="49" rx="7" fill="#171c26" stroke="#05070a" strokeWidth="5" />
      <rect x="20" y="30" width="56" height="39" rx="4" fill="#303949" />
      <rect x="25" y="35" width="46" height="29" rx="2" fill="#080b11" />
      <rect x="22" y="32" width="52" height="4" fill="#596579" opacity="0.55" />

      <polygon points="49,73 62,85 49,98 36,85" fill="#ff8a00" />
      <polygon points="49,77 58,85 49,94 40,85" fill="#11151d" />
      <polygon points="49,80 54,86 49,91 44,86" fill="#fff1b8" />
      <rect x="47" y="82" width="4" height="10" fill="#fff1b8" />

      <WizFace state={state} />
    </svg>
  );
}
