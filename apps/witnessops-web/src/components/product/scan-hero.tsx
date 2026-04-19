"use client";

import Link from "next/link";

export function ScanHero() {
  return (
    <section id="review-lane" className="mx-auto max-w-[800px] px-6 pt-20 pb-24 text-center">
      <p
        className="mb-6 inline-flex items-center gap-3"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--color-brand-accent)",
        }}
      >
        <span className="inline-block h-2 w-2 bg-brand-accent" />
        Review lane
      </p>

      <h2
        className="mx-auto mb-5 max-w-2xl text-text-primary"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 4vw, 42px)",
          fontWeight: 600,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          lineHeight: 1.06,
        }}
      >
        Start with one real workflow. Get a bounded judgment.
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
        Bring one workflow, one automation boundary, or one operator decision
        path. WitnessOps reviews the authority boundary, execution path,
        evidence capture, and replayability of that one mechanism.
      </p>

      <div className="mx-auto mt-6 max-w-xl space-y-2 text-sm leading-relaxed text-text-muted">
        <p>One workflow only.</p>
        <p>One bounded review path.</p>
        <p>One report with named weak points and next steps.</p>
        <p>No broad audit coverage. No continuous assurance claim.</p>
      </div>

      <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
        <Link
          href="/review"
          className="inline-flex items-center justify-center bg-brand-accent px-7 py-4 text-surface-bg transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,107,53,0.25)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Review the lane
        </Link>
        <Link
          href="/review/sample-report"
          className="inline-flex items-center justify-center border border-surface-border px-7 py-4 text-text-primary transition-all hover:border-brand-accent/40 hover:bg-surface-card"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          View sample report
        </Link>
      </div>

      <p
        className="mt-4"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.06em" }}
      >
        Designed for a single reviewable mechanism, not a broad engagement menu.
      </p>
    </section>
  );
}
