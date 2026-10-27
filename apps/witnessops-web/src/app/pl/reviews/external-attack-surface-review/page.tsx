import type { Metadata } from "next";

import { ParkedExternalReview } from "@/components/marketing/parked-external-review";
import { EXTERNAL_ATTACK_SURFACE_OFFER } from "@/lib/commercial-truth";
import { languageAlternates } from "@/lib/public-seo";
import { pageSocialMetadata } from "@/lib/social-metadata";

const title = `${EXTERNAL_ATTACK_SURFACE_OFFER.name.pl} nie jest już dostępny`;
const description =
  "WitnessOps nie przyjmuje nowych zleceń External Attack Surface Review. To nie jest Agent Action Security Review.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  alternates: languageAlternates("/pl/reviews/external-attack-surface-review", {
    en: "/reviews/external-attack-surface-review",
    pl: "/pl/reviews/external-attack-surface-review",
  }),
  ...pageSocialMetadata(title, description),
};

export default function PolishExternalAttackSurfaceReviewPage() {
  return <ParkedExternalReview locale="pl" />;
}
