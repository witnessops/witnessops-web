import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Named Sample Cases",
  description:
    "Browse published named sample cases that show how WitnessOps reviews bounded workflow classes. These are explanatory sample cases, not live customer artifacts.",
  alternates: getCanonicalAlternates("witnessops", "/review/sample-cases"),
  openGraph: {
    title: "Named Sample Cases | WitnessOps",
    description:
      "Browse published named sample cases that show how WitnessOps reviews bounded workflow classes. These are explanatory sample cases, not live customer artifacts.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Named Sample Cases | WitnessOps",
    description:
      "Browse published named sample cases that show how WitnessOps reviews bounded workflow classes. These are explanatory sample cases, not live customer artifacts.",
  },
};

const sampleCases = [
  {
    title: "Privileged access grant review",
    href: "/review/sample-cases/privileged-access-grant",
    description:
      "A named sample case for a time-bounded administrative access request, focused on authority binding, provisioning execution, resulting entitlement evidence, and replayability outside the source systems.",
    signals: [
      "approval to execution continuity",
      "provisioning evidence",
      "target-side entitlement confirmation",
    ],
  },
  {
    title: "Approval-gated containment review",
    href: "/review/sample-cases/approval-gated-containment",
    description:
      "A named sample case for a containment action that must not execute before recorded approval, focused on gate enforcement, target-state evidence, and portable replay after the event.",
    signals: [
      "pre-execution gate enforcement",
      "target-side containment state",
      "portable replay path",
    ],
  },
];

export default function SampleCasesIndexPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <div className="space-y-8">
          <section className="space-y-4 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample cases
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Published named sample cases
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              These pages show how WitnessOps reviews specific workflow classes.
              They are explanatory sample cases with stable routes, not live customer
              artifacts and not claims of completed verification for your environment.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaButton href="/review" variant="primary" label="Back to review" />
              <CtaButton href="/review/request" variant="secondary" label="Request a workflow review" />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              What these pages are for
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              <li>Show one bounded workflow class at a time.</li>
              <li>Separate authority, execution, evidence, and replayability.</li>
              <li>Name the integrity gaps and stronger evidence needed to close them.</li>
              <li>Avoid implying a live customer proof path where none is published.</li>
            </ul>
          </section>

          <section className="space-y-4">
            {sampleCases.map((sampleCase) => (
              <Link
                key={sampleCase.href}
                href={sampleCase.href}
                className="block rounded-2xl border border-surface-border bg-surface-card/40 p-6 transition-colors hover:bg-surface-card/60"
              >
                <h2 className="text-xl font-semibold text-text-primary">
                  {sampleCase.title}
                </h2>
                <p className="mt-3 text-base leading-8 text-text-secondary">
                  {sampleCase.description}
                </p>
                <ul className="mt-4 list-disc space-y-1 pl-6 text-sm leading-7 text-text-muted marker:text-brand-accent">
                  {sampleCase.signals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-brand-accent">
                  Open named sample case
                </p>
              </Link>
            ))}
          </section>
        </div>
      </SectionShell>
    </main>
  );
}
