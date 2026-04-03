import { DeferredHeroStage } from "./deferred-hero-stage";
import { HeroStageFallback } from "./hero-stage-fallback";

export function HeroStage() {
  return (
    <DeferredHeroStage>
      <HeroStageFallback />
    </DeferredHeroStage>
  );
}
