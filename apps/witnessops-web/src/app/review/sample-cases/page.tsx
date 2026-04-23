import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Named Sample Cases",
  description:
    "Inspect named WitnessOps sample cases for workflows that often break under later scrutiny. These are explanatory sample cases, not live customer artifacts.",
  alternates: getCanonicalAlternates("witnessops", "/review/sample-cases"),
  openGraph: {
    title: "Named Sample Cases | WitnessOps",
    description:
      "Inspect named WitnessOps sample cases for workflows that often break under later scrutiny. These are explanatory sample cases, not live customer artifacts.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Named Sample Cases | WitnessOps",
    description:
      "Inspect named WitnessOps sample cases for workflows that often break under later scrutiny. These are explanatory sample cases, not live customer artifacts.",
  },
};

const surfaceLegend = [
  {
    title: "Verifier fixtures",
    description:
      "Small public sample receipts used on /verify to show what receipt checks can confirm today and how failure appears.",
    href: "/verify",
    label: "Open verifier",
  },
  {
    title: "Illustrative sample report",
    description:
      "One illustrative dossier showing report structure and judgment style without claiming a live customer proof path.",
    href: "/review/sample-report",
    label: "Open sample report",
  },
  {
    title: "Named sample cases",
    description:
      "Published workflow-class pages with stable routes, named boundaries, authority maps, evidence expectations, and trust-dependent gaps.",
    href: "/review/sample-cases",
    label: "Current surface",
  },
  {
    title: "Live review request lane",
    description:
      "The intake path for one real workflow, automation boundary, or operator decision path that you want reviewed.",
    href: "/review/request",
    label: "Request a Review",
  },
];

const pressureSignals = [
  "approval exists, but execution proof is weaker than the ticket implies",
  "outside review would require screenshots, exports, and oral reconstruction",
  "the workflow matters because an auditor, customer, insurer, or counterparty may ask later",
  "the page should show the trust-dependent gap without pretending a live proof path exists",
];

const sampleCases = [
  {
    title: "Privileged access grant review",
    href: "/review/sample-cases/privileged-access-grant",
    description:
      "A named sample case for a time-bounded administrative access request, focused on whether authority binding, provisioning execution, resulting entitlement evidence, and replayability still line up under later review.",
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
      "A named sample case for a containment action that must not execute before recorded approval, focused on whether the gate held, the target state changed as claimed, and the action can be reconstructed cleanly after the event.",
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
              Published named sample cases for workflows that break under scrutiny.
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              These pages show how WitnessOps reads specific workflow classes when
              later review matters: who had authority, what actually executed,
              what evidence survives, and where the proof path still depends on
              trust.
            </p>
            <p className="text-base leading-8 text-text-secondary">
              They are explanatory sample cases with stable routes, not live
              customer artifacts and not claims of completed verification for
              your environment.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaButton href="/review/request" variant="primary" label="Request a Review" />
              <CtaButton href="/review" variant="secondary" label="Back to review" />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              When these pages are useful
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              Use these cases when you want to inspect the WitnessOps review lens
              before submitting one real workflow. They are strongest when the
              issue is not whether a process exists, but whether approval,
              execution, and evidence still line up when someone external asks.
            </p>
            <ul className="list-disc space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              {pressureSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Public artifact classes
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {surfaceLegend.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl border border-surface-border bg-surface-bg p-4 transition-colors hover:bg-surface-card/60"
                >
                  <h3 className="text-sm font-semibold text-text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    {item.description}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-brand-accent">
                    {item.label}
                  </p>
                </Link>
              ))}
            </div>
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
