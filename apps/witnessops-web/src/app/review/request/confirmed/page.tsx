import type { Metadata } from "next";
import { ReviewRequestConfirmed } from "@/components/review-request/review-request-confirmed";
import {
  VerificationLightShell,
} from "@/components/shared/verification-light-shell";

export const metadata: Metadata = {
  title: "Request record",
  description:
    "Browser-held confirmation record for a WitnessOps review request. It is not a claim of completed verification.",
  alternates: {
    canonical: "/review/request/confirmed",
    languages: {
      en: "/review/request/confirmed",
      pl: "/pl/review/request/confirmed",
      "x-default": "/review/request/confirmed",
    },
  },
  robots: { index: false, follow: false },
};

export default function ReviewRequestConfirmedPage() {
  return (
    <VerificationLightShell>
      <ReviewRequestConfirmed locale="en" />
    </VerificationLightShell>
  );
}
