import type { Metadata } from "next";

import { ParkedExternalReview } from "@/components/marketing/parked-external-review";
import { RETIRED_REVIEW_NOTICE } from "@/lib/other-offer-scope-guard";
import { languageAlternates } from "@/lib/public-seo";
import { pageSocialMetadata } from "@/lib/social-metadata";

const title = RETIRED_REVIEW_NOTICE.en;
const description = RETIRED_REVIEW_NOTICE.en;

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
