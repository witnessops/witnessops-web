import { RETIRED_REVIEW_NOTICE } from "@/lib/other-offer-scope-guard";
import type { BuyerLocale } from "@/lib/buyer-services";

/**
 * Neutral notice for the retired review URL.
 * No price, no request action, and no statement about availability elsewhere.
 */
export function ParkedExternalReview({ locale }: { locale: BuyerLocale }) {
  const polish = locale === "pl";
  const notice = polish ? RETIRED_REVIEW_NOTICE.pl : RETIRED_REVIEW_NOTICE.en;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-3xl px-6 py-16 sm:py-20"
      data-offer-status="not-offered-on-website"
      data-parked-offer="external-exposure-assessment"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
        WitnessOps
      </p>
      <h1 className="mt-4 text-3xl font-semibold leading-tight text-text-primary">
        {notice}
      </h1>
    </main>
  );
}
