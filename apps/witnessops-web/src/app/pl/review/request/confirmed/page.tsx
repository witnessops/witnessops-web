import type { Metadata } from "next";
import { ReviewRequestConfirmed } from "@/components/review-request/review-request-confirmed";
import { VerificationLightShell } from "@/components/shared/verification-light-shell";

export const metadata: Metadata = {
  title: "Zapis zgłoszenia",
  description:
    "Zapis potwierdzenia zgłoszenia przeglądu WitnessOps przechowywany w przeglądarce.",
  alternates: {
    canonical: "/pl/review/request/confirmed",
    languages: {
      en: "/review/request/confirmed",
      pl: "/pl/review/request/confirmed",
      "x-default": "/review/request/confirmed",
    },
  },
  robots: { index: false, follow: false },
};

export default function PolishConfirmedPage() {
  return (
    <VerificationLightShell>
      <ReviewRequestConfirmed locale="pl" />
    </VerificationLightShell>
  );
}
