import type { Metadata } from "next";

import { ReviewOffer } from "@/components/marketing/review-offer";
import { EXTERNAL_ATTACK_SURFACE_OFFER } from "@/lib/commercial-truth";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: EXTERNAL_ATTACK_SURFACE_OFFER.name.pl,
  description: EXTERNAL_ATTACK_SURFACE_OFFER.situation.pl,
  alternates: languageAlternates("/pl/reviews/external-attack-surface-review", {
    en: "/reviews/external-attack-surface-review",
    pl: "/pl/reviews/external-attack-surface-review",
  }),
};
export default function PolishExternalAttackSurfaceReviewPage() {
  return <ReviewOffer locale="pl" offer="external" />;
}
