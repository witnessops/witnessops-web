import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { AppPricing, PricingQuestions } from "@/components/marketing/app-pricing";

import { CtaButton } from "@/components/shared/cta-button";
import {
  buyerRequestHref,
  buyerServiceRequestHref,
  buyerServiceCta,
  buyerServicesByCommercialPriority,
} from "@/lib/buyer-services";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
} from "@/lib/commercial-truth";

export const metadata: Metadata = {
  title: "Security Review and Automation Pricing",
  description: "Compare prices and scope for AI action reviews, system security reviews and workflow diagnosis and repair.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Security Review and Automation Pricing | WitnessOps",
    description:
      "Published prices and commercial boundaries for bounded agent, security, and operational reviews.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security Review and Automation Pricing | WitnessOps",
    description:
      "Published prices and commercial boundaries for bounded agent, security, and operational reviews.",
  },
};

const boundaries = [
  "No work starts from this page or from payment alone. Scope is agreed after a non-secret fit check.",
  `An ${EXTERNAL_ATTACK_SURFACE_OFFER.name.en} can be started without a sales call; authority, scope, price, timing, capacity, and evidence handling are still accepted before work begins. This is not a penetration test.`,
  "Published figures are fixed prices or starting ranges for the named boundary; all are shown excluding VAT.",
  "A report, receipt, or verifier does not prove that a system is secure, complete, compliant, or free of vulnerabilities.",
];

const pricingServices = buyerServicesByCommercialPriority().filter(
  (service) => service.pricingVisible !== false &&
    ["bounded-workflow-review", "one-server-security-check", "external-exposure-assessment"].includes(service.id),
);

export default function PricingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 pb-12">
        <header className="border-b border-surface-border py-16 lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Pricing
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            App access and named reviews.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary md:text-lg">
            Start with a bounded check. Keep the snapshot. Explore the proposed
            plans for comparison, retention and a portable pack. Named reviews
            remain one-off, scoped before work starts.
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-text-muted">Illustrative draft. App prices are not a live product claim. Named review fees match the public catalogue, excluding VAT. No payment is taken here.</p>
        </header>
        <AppPricing />
        <section className="py-12 lg:py-16" aria-labelledby="pricing-services-heading">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-text-muted">Named reviews</p>
          <h2 id="pricing-services-heading" className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            One-off catalogue fees
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-text-secondary">Human support does not automatically authorise or execute a scan, review or fix. Fit, scope and evidence handling are confirmed before work begins. All fees exclude VAT.</p>
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {pricingServices.map((service) => {
              const detailHref = service.detailHref.en ?? "/catalog";
              const primary = service.commercialRole === "primary";
              const publicExposure =
                service.id === "external-exposure-assessment";
              return (
                <article
                  key={service.id}
                  data-pricing-service={service.id}
                  className="flex h-full min-w-0 flex-col rounded-lg border border-surface-border p-5 md:p-6"
                >
                  {primary ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                      For consequential AI actions
                    </p>
                  ) : service.commercialRole === "secondary" ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                      For public-facing systems
                    </p>
                  ) : null}
                  <h3 className={`${primary ? "mt-3" : ""} text-xl font-semibold text-text-primary`}>
                    <Link href={detailHref} className="hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
                      {service.name.en}
                    </Link>
                  </h3>
                  <p className="mt-3 text-base leading-6 text-text-secondary">{service.cardSituation.en}</p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{service.result.en}</p>
                  <p className="mt-5 text-lg font-semibold text-brand-accent">{service.price.en}</p>
                  <details className="mt-3 border-y border-surface-border">
                    <summary className="cursor-pointer py-3 text-sm font-semibold text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">Timing, scope and exclusions</summary>
                    <div className="space-y-3 pb-4 text-sm leading-6 text-text-muted">
                      <p>{service.timing.en}</p>
                      {publicExposure ? (
                        <p>
                          No sales call required. Payment is due in full before the delivery clock starts; payment alone does not authorise testing. One focused retest within 30 days is included; an additional or late retest is {EXTERNAL_ATTACK_SURFACE_OFFER.additionalOrLateRetestPrice.en}.
                        </p>
                      ) : null}
                      <p>{service.boundary.en}</p>
                    </div>
                  </details>
                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    <CtaButton href={detailHref} variant="secondary" label="View offer" />
                    {publicExposure ? (
                      <CtaButton
                        href="/review/sample-cases/external-exposure-assessment"
                        variant="secondary"
                        label="See sample"
                      />
                    ) : null}
                    <CtaButton
                      href={buyerServiceRequestHref("en", service)}
                      variant="primary"
                      label={buyerServiceCta("en", service)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-4"><CtaButton href="/catalog" variant="secondary" label="All services and scope" /><CtaButton href={buyerRequestHref("en")} variant="secondary" label="Ask about your case" /></div>
        </section>
        <PricingQuestions />
        <details className="border-t border-surface-border py-4">
          <summary className="cursor-pointer py-3 text-lg font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
            Before work begins
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {boundaries.map((item) => (
              <p key={item} className="border border-surface-border bg-surface-bg p-5 text-sm leading-7 text-text-secondary">
                {item}
              </p>
            ))}
          </div>
        </details>
        <section id="enquiry" className="mt-12 grid gap-10 border-t border-surface-border pt-12 lg:grid-cols-2 lg:gap-16" aria-labelledby="price-enquiry-heading">
          <div><p className="text-xs uppercase tracking-[0.16em] text-text-muted">Ask about scope</p><h2 id="price-enquiry-heading" className="mt-4 max-w-lg text-3xl font-medium leading-tight tracking-tight">One question. Non-secret details only.</h2><p className="mt-5 max-w-lg text-sm leading-7 text-text-secondary">Unsure whether the app or a named review fits? Describe the system, action or result. We’ll confirm the next step before any work begins.</p></div>
          <div className="min-w-0"><ContactForm compact landing /></div>
        </section>
      </div>
    </main>
  );
}
