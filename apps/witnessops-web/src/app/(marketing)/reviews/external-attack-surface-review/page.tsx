import type { Metadata } from "next";

import { ParkedExternalReview } from "@/components/marketing/parked-external-review";
import { EXTERNAL_ATTACK_SURFACE_OFFER } from "@/lib/commercial-truth";
import { languageAlternates } from "@/lib/public-seo";
import { pageSocialMetadata } from "@/lib/social-metadata";

const title = `${EXTERNAL_ATTACK_SURFACE_OFFER.name.en} is no longer available`;
const description =
  "WitnessOps no longer accepts new External Attack Surface Review engagements. This is not the Agent Action Security Review.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  alternates: languageAlternates("/reviews/external-attack-surface-review", {
    en: "/reviews/external-attack-surface-review",
    pl: "/pl/reviews/external-attack-surface-review",
  }),
  ...pageSocialMetadata(title, description),
};

export default function ExternalAttackSurfaceReviewPage() {
  return <ParkedExternalReview locale="en" />;
}
