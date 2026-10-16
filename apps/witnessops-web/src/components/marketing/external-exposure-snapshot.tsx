import Link from "next/link";
import type { ReactNode } from "react";

import { exposureSnapshotCopy as copy } from "@/lib/external-exposure/copy";

function NeedsReview({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span data-needs-review={id}>
      {children}{" "}
      <span className="inline-flex items-center border border-brand-accent px-1.5 py-0.5 align-middle text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brand-accent">
        Needs review
      </span>
    </span>
  );
}

function SnapshotCta() {
  return (
    <a
      href={copy.mailto}
      className="inline-flex min-h-12 items-center justify-center bg-brand-accent px-6 text-sm font-medium text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
    >
      {copy.cta}: {copy.email}
    </a>
  );
}

export function ExternalExposureSnapshotPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="buyer-page"
      data-page="external-exposure-snapshot"
    >
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <header className="max-w-4xl border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">{copy.lede}</p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            <NeedsReview id="one-page">{copy.onePage}</NeedsReview>
          </p>
          <div className="mt-8">
            <SnapshotCta />
          </div>
        </header>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            {copy.whatYouGetTitle}
          </h2>
          <ul className="mt-6 max-w-3xl space-y-4 text-base leading-7 text-text-secondary">
            <li className="border-t border-surface-border pt-4">{copy.glance}</li>
            <li className="border-t border-surface-border pt-4">
              <NeedsReview id="observations">{copy.observations}</NeedsReview>
              {", "}
              {copy.observationsRest}
            </li>
            <li className="border-t border-surface-border pt-4">{copy.notThis}</li>
          </ul>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            {copy.howTitle}
          </h2>
          <ol className="mt-6 max-w-3xl list-decimal space-y-4 pl-5 text-base leading-7 text-text-secondary">
            <li>
              {copy.steps[0]} {copy.enquiry}
            </li>
            <li>{copy.steps[1]}</li>
            <li>
              You get a <NeedsReview id="one-page">one-page</NeedsReview> Snapshot within{" "}
              <NeedsReview id="turnaround">{copy.turnaround}</NeedsReview>.
            </li>
          </ol>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            {copy.whereTitle}
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-7 text-text-secondary">
            {copy.whereBefore}{" "}
            <Link
              href={copy.review.href}
              data-named-offer={copy.review.name}
              className="font-semibold text-text-primary underline underline-offset-4"
            >
              {copy.review.name}
            </Link>{" "}
            (<span data-offer-price={copy.review.price}>{copy.review.price}</span>){" "}
            {copy.whereScope} {copy.review.inclusions} {copy.whereAfter}
          </p>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            {copy.proofTitle}
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-7 text-text-secondary">{copy.proof}</p>
          <p className="mt-4 text-base font-semibold leading-7 text-text-primary" data-sample-placeholder="">
            {copy.sample}
          </p>
        </section>

        <section className="pt-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            {copy.cta}
          </h2>
          <div className="mt-6">
            <SnapshotCta />
          </div>
        </section>
      </div>
    </main>
  );
}
