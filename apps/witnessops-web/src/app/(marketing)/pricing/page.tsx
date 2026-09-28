import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/shared/cta-button";
import { buyerRequestHref, buyerPublicOfferRequestHref } from "@/lib/buyer-services";
import { INTERNET_FOOTPRINT_REVIEW_OFFER, PRIMARY_OFFER } from "@/lib/commercial-truth";

const pricingDescription = `Compare ${INTERNET_FOOTPRINT_REVIEW_OFFER.name.en} and ${PRIMARY_OFFER.name.en}. The agent review starts at €2,500 excluding VAT and receives a fixed quote after scope.`;

export const metadata: Metadata = {
  title: "Review Pricing",
  description: pricingDescription,
  alternates: { canonical: "/pricing" },
  twitter: { card: "summary_large_image", title: "Review Pricing | WitnessOps", description: pricingDescription },
  openGraph: { title: "Review Pricing | WitnessOps", description: pricingDescription, siteName: "WitnessOps", type: "website" },
};

export default function PricingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Pricing</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Review pricing and scope</h1>
          <p className="mt-5 text-base leading-7 text-text-secondary">Start with a non-secret fit check. Scope and authority are agreed before any work begins. No payment is taken here.</p>
        </header>
        <section aria-label="Review pricing" className="mt-10 grid gap-6 md:grid-cols-2">
          <article data-pricing-review="footprint" className="flex min-w-0 flex-col rounded-lg border border-surface-border p-6 md:p-8">
            <h2 className="text-2xl font-semibold">{INTERNET_FOOTPRINT_REVIEW_OFFER.name.en}</h2>
            <p className="mt-6 text-xl font-semibold text-brand-accent">{INTERNET_FOOTPRINT_REVIEW_OFFER.price.en}</p>
            <p className="mt-5 text-sm leading-6 text-text-secondary">Start with a non-secret enquiry. We’ll confirm fit and scope before work begins.</p>
            <div className="mt-auto pt-8"><CtaButton href={`${buyerRequestHref("en")}?enquiryPath=early-bird`} variant="secondary" label="Ask about this review" /></div>
          </article>
          <article data-pricing-review="agent-tools-access" data-pricing-service={PRIMARY_OFFER.id} className="flex min-w-0 flex-col rounded-lg border border-surface-border p-6 md:p-8">
            <h2 className="text-2xl font-semibold">{PRIMARY_OFFER.name.en}</h2>
            <p className="mt-6 text-xl font-semibold text-brand-accent">{PRIMARY_OFFER.price.en}</p>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{PRIMARY_OFFER.timing.en}</p>
            <p className="mt-5 text-sm leading-6 text-text-secondary">{PRIMARY_OFFER.unit.en}. Fixed quote after scope. Payment in full before work starts by default. {PRIMARY_OFFER.fitCheck.en}.</p>
            <div className="mt-auto flex flex-wrap items-center gap-4 pt-8">
              <CtaButton href={buyerPublicOfferRequestHref("en", PRIMARY_OFFER.id)} variant="primary" label="Request a scope and fixed quote" />
              <Link href={PRIMARY_OFFER.route} className="inline-flex min-h-11 items-center underline underline-offset-4">View scope</Link>
            </div>
          </article>
        </section>
        <p className="mt-8 max-w-3xl text-sm leading-6 text-text-muted">An enquiry does not authorise collection or start a review. Scope, authority and evidence handling must be agreed separately. A report, receipt, or verifier does not prove that a system is secure, complete, compliant, or free of vulnerabilities.</p>
        <nav aria-label="Other capabilities" className="mt-10 flex flex-wrap gap-6 border-t border-surface-border pt-6">
          <Link href="/catalog" className="inline-flex min-h-11 items-center underline underline-offset-4">Explore the full catalogue</Link>
          <Link href="/early-access" className="inline-flex min-h-11 items-center underline underline-offset-4">How the app works</Link>
        </nav>
      </div>
    </main>
  );
}
