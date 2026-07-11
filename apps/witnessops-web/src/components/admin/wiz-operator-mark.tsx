import Image from "next/image";
import type { AdminWizState } from "./admin-wiz-brief-model";

const stateLabels: Record<AdminWizState, string> = {
  idle: "Wiz idle",
  listening: "Wiz listening",
  thinking: "Wiz checking the queue",
  recommending: "Wiz recommending the next action",
  boundary: "Wiz showing an operator boundary",
};

const stateAssets: Record<AdminWizState, string> = {
  idle: "/visuals/wiz/idle.webp",
  listening: "/visuals/wiz/listening.webp",
  thinking: "/visuals/wiz/thinking.webp",
  recommending: "/visuals/wiz/recommending.webp",
  boundary: "/visuals/wiz/boundary.webp",
};

export function WizOperatorMark({ state = "idle", size = 96 }: { state?: AdminWizState; size?: number }) {
  return <Image src={stateAssets[state]} width={size} height={Math.round((size * 208) / 192)} alt={stateLabels[state]} style={{ imageRendering: "pixelated" }} unoptimized />;
}
