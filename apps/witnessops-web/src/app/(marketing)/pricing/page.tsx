import type { Metadata } from "next";
import Link from "next/link";

import { CtaButton } from "@/components/shared/cta-button";
import {
  BUYER_SERVICES,
  buyerOfferRequestHref,
  buyerRequestHref,
} from "@/lib/buyer-services";

export const metadata: Metadata = {
  title: "Security Review Pricing | WitnessOps",
  description:
    "Published prices and commercial boundaries for bounded WitnessOps security reviews, including the Public Exposure Review.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Security Review Pricing | WitnessOps",
    description:
      "Published prices and commercial boundaries for bounded WitnessOps security reviews.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security Review Pricing | WitnessOps",
    description:
      "Published prices and commercial boundaries for bounded WitnessOps security reviews.",
  },
};

const boundaries = [
  "No review starts from this page or from payment alone.",
  "A Public Exposure Review can be started without a sales call; authority, scope, price, timing, capacity, and evidence handling are still accepted before work begins.",
  "Published figures are fixed prices or starting ranges for the named boundary, excluding VAT where stated.",
  "A report, receipt, or verifier does not prove that a system is secure, complete, compliant, or free of vulnerabilities.",
];

export default function PricingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <header className="border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Pricing
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            Clear prices for bounded security reviews.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
            Choose the situation that matches your decision. Every engagement starts
            with a short, non-secret fit check so the authorised boundary and the
            accepting party’s requirement are clear before any work or evidence intake.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton href={buyerRequestHref("en")} variant="primary" label="Start a fit check" />
            <CtaButton href="/catalog" variant="secondary" label="View full catalogue" />
          </div>
        </header>

        <section className="py-12" aria-labelledby="pricing-services-heading">
          <h2 id="pricing-services-heading" className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Public service lines
          </h2>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {BUYER_SERVICES.map((service) => {
              const detailHref = service.detailHref.en ?? "/catalog";
              const featured = service.id === "external-exposure-assessment";
              return (
                <article
                  key={service.id}
                  data-pricing-service={service.id}
                  className={`flex h-full flex-col border p-6 ${featured ? "border-brand-accent/60 bg-brand-accent/5" : "border-surface-border bg-surface-card/40"}`}
                >
                  {featured ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                      Primary fixed-scope offer
                    </p>
                  ) : null}
                  <h3 className={`${featured ? "mt-3" : ""} text-xl font-semibold text-text-primary`}>
                    <Link href={detailHref} className="hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
                      {service.name.en}
                    </Link>
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">{service.situation.en}</p>
                  <p className="mt-5 text-lg font-semibold text-brand-accent">{service.price.en}</p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{service.timing.en}</p>
                  {featured ? (
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      No sales call required. Full payment is recommended; two €950 instalments are available by agreement after scope acceptance. Payment alone does not authorise testing. One focused retest within 30 days is included; an additional or late retest is €550 ex VAT.
                    </p>
                  ) : null}
                  <p className="mt-4 border-t border-surface-border pt-4 text-sm leading-6 text-text-muted">
                    {service.boundary.en}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    <CtaButton href={detailHref} variant="secondary" label="View scope" />
                    {featured ? (
                      <CtaButton
                        href="/review/sample-cases/external-exposure-assessment"
                        variant="secondary"
                        label="Inspect synthetic sample"
                      />
                    ) : null}
                    <CtaButton
                      href={service.productId ? buyerOfferRequestHref("en", service.productId) : buyerRequestHref("en")}
                      variant="primary"
                      label={featured ? "Request the review" : "Start fit check"}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-t border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Commercial boundary
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {boundaries.map((item) => (
              <p key={item} className="border border-surface-border bg-surface-bg p-5 text-sm leading-7 text-text-secondary">
                {item}
              </p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
