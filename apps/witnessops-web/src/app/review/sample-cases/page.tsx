import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Named Sample Cases and Proof Bundles",
  description:
    "Browse published named sample cases and the public AI Agent Action Proof Run sample bundle.",
  alternates: getCanonicalAlternates("witnessops", "/review/sample-cases"),
  openGraph: {
    title: "Named Sample Cases and Proof Bundles | WitnessOps",
    description:
      "Browse published named sample cases and the public AI Agent Action Proof Run sample bundle.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Named Sample Cases and Proof Bundles | WitnessOps",
    description:
      "Browse published named sample cases and the public AI Agent Action Proof Run sample bundle.",
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
    title: "AI Agent Action Proof Run sample bundle",
    description:
      "A public standalone bundle showing the authority map, action boundary, evidence manifest, receipt, verifier result, and challenge path for one agent-assisted workflow.",
    href: "/review/sample-cases/ai-agent-action-proof-run",
    label: "Open sample proof run",
  },
  {
    title: "Explanatory sample cases",
    description:
      "Published workflow-class pages with stable routes, named boundaries, authority maps, evidence expectations, and trust-dependent gaps.",
    href: "/review/sample-cases",
    label: "Current surface",
  },
  {
    title: "Live Review request lane",
    description:
      "The intake path for one real workflow, automation boundary, or operator decision path that you want reviewed.",
    href: "/review/request",
    label: "Request a Review",
  },
];

const sampleCases = [
  {
    title: "AI Agent Action Proof Run",
    href: "/review/sample-cases/ai-agent-action-proof-run",
    description:
      "A buyer-facing sample proof run for one agent-assisted code or configuration change, exposing the authority map, action boundary, evidence manifest, signed receipt, verifier result, challenge path, and manifest digest.",
    signals: [
      "human approval boundary",
      "agent/tool action path",
      "receipt and verifier result",
    ],
  },
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
              Published sample cases and proof bundles
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              These pages and bundles show how WitnessOps shapes bounded proof
              around specific workflow classes. They are explanatory sample
              materials, not live customer artifacts and not claims of completed
              verification for your environment.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaButton href="/review" variant="primary" label="Back to review" />
              <CtaButton href="/review/request" variant="secondary" label="Request an AI Agent Action Proof Run" />
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
              <li>Show the AI-agent sample receipt shape and verifier path without claiming production deployment, legal compliance, or complete AI governance coverage.</li>
              <li>Avoid implying a live customer proof path where none is published.</li>
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
