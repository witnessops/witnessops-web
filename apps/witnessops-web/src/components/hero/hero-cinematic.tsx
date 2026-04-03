"use client";

import { ProofHeroInstrument } from "@public-surfaces/ui";
import { witnessopsScene } from "@/lib/hero/witnessops-scene";

export default function HeroCinematic() {
  return <ProofHeroInstrument scene={witnessopsScene} tone="witnessops" />;
}
