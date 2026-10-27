import Link from "next/link";

import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import type { BuyerLocale } from "@/lib/buyer-services";

/**
 * Availability notice for the parked External Attack Surface Review.
 * The link names the different current review; it does not alias the two offers.
 */
export function ParkedExternalReview({ locale }: { locale: BuyerLocale }) {
  const polish = locale === "pl";
  const reviewHref = polish
    ? "/pl/reviews/agent-action-security-review"
    : "/reviews/agent-action-security-review";
  const price = PUBLIC_AGENT_ACTION_OFFER.price[locale];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-3xl px-6 py-16 sm:py-20"
      data-offer-status="parked"
      data-parked-offer="external-exposure-assessment"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
        WitnessOps
      </p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight text-text-primary">
        {polish
          ? "External Attack Surface Review nie jest już dostępny"
          : "External Attack Surface Review is no longer available"}
      </h1>
      <p className="mt-6 text-lg leading-8 text-text-secondary">
        {polish
          ? "WitnessOps nie przyjmuje nowych zleceń na ten przegląd. Wydane uzgodnienia zachowują pierwotne warunki."
          : "WitnessOps no longer accepts new engagements for this review. Issued agreements keep their original terms."}
      </p>
      <p className="mt-4 leading-7 text-text-secondary">
        {polish
          ? `To nie jest ${PUBLIC_AGENT_ACTION_OFFER.name.pl}. To inna usługa: jedno istotne działanie agenta lub automatyzacji, ${price}.`
          : `This is not the ${PUBLIC_AGENT_ACTION_OFFER.name.en}. That is a different service: one consequential agent or automation action, ${price}.`}
      </p>
      <p className="mt-8">
        <Link href={reviewHref} className="text-brand-accent underline underline-offset-4">
          {polish
            ? `Zobacz ${PUBLIC_AGENT_ACTION_OFFER.name.pl}`
            : `See the ${PUBLIC_AGENT_ACTION_OFFER.name.en}`}
        </Link>
      </p>
    </main>
  );
}
