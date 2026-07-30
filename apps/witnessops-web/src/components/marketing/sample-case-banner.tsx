import Link from "next/link";
import { CtaButton } from "@/components/shared/cta-button";

type SampleCaseBannerProps = {
  /** Optional short title line under the banner label */
  title?: string;
  /** Extra one-line context for this sample */
  note?: string;
};

/**
 * Shared header for published sample / illustrative surfaces.
 * Keeps CTAs and the "not live customer" boundary consistent.
 */
export function SampleCaseBanner({ title, note }: SampleCaseBannerProps) {
  return (
    <div
      className="mb-8 border border-brand-accent/35 bg-brand-accent/5 p-5"
      data-sample-banner="not-live-customer"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
        Published sample — not live customer evidence
      </p>
      {title ? (
        <p className="mt-2 text-sm font-semibold text-text-primary">{title}</p>
      ) : null}
      <p className="mt-2 max-w-[40rem] text-sm leading-6 text-text-muted">
        {note ??
          "This page is an explanatory sample or illustration for orientation only. It is not a live customer artifact, production verification result, or certification."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <CtaButton href="/review/request" variant="primary" label="Start a review" />
        <CtaButton href="/verify" variant="secondary" label="Verify a receipt" />
        <Link
          href="/library"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
        >
          Library
        </Link>
      </div>
    </div>
  );
}
