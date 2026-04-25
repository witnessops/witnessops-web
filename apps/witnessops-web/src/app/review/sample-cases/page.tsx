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

const aiProofArtifacts = [
  "ACTION_BOUNDARY.json",
  "AUTHORITY_MAP.json",
  "EVIDENCE_MANIFEST.json",
  "RECEIPT.json",
  "VERIFY_RESULT.json",
  "CHALLENGE_PATH.md",
  "MANIFEST.sha256",
];

const supportSurfaces = [
  {
    title: "Verifier fixtures",
    description:
      "Small public receipt examples used on /verify to show what current receipt checks can confirm and how failure appears.",
    href: "/verify",
    label: "Open verifier",
  },
  {
    title: "Illustrative sample report",
    description:
      "An older dossier shape showing review style without claiming a live customer proof path.",
    href: "/review/sample-report",
    label: "Open sample report",
  },
  {
    title: "Request lane",
    description:
      "The intake path for one real agent-assisted workflow you want scoped into a proof run.",
    href: "/review/request",
    label: "Request proof run",
  },
];

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
          <section className="space-y-5 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample cases
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Published sample cases and proof bundles
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              Start with the AI Agent Action Proof Run sample. It shows how a
              third party inspects the action boundary, authority map, evidence
              manifest, receipt, verifier result, challenge path, and digest
              manifest after an agent acts.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaButton href="/review/request" variant="primary" label="Request an AI Agent Action Proof Run" />
              <CtaButton href="/review" variant="secondary" label="Read the offer" />
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <div className="kb-section-tag">Primary sample</div>
            <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                  AI Agent Action Proof Run
                </h2>
                <p className="mt-3 text-base leading-8 text-text-secondary">
                  A public standalone bundle for one agent-assisted code or
                  configuration change. Use it to inspect the receipt shape and
                  verifier path before submitting your own workflow.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <CtaButton
                    href="/review/sample-cases/ai-agent-action-proof-run"
                    variant="primary"
                    label="Open sample proof run"
                  />
                  <CtaButton
                    href="/review/request"
                    variant="secondary"
                    label="Request your proof run"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-bg p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Artifact set
                </h3>
                <ul className="mt-3 space-y-2 font-mono text-xs leading-6 text-text-muted">
                  {aiProofArtifacts.map((artifact) => (
                    <li key={artifact} className="flex gap-2">
                      <span className="text-brand-accent">✓</span>
                      <span>{artifact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              What these pages are for
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-surface-border bg-surface-bg p-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  Show one bounded workflow class
                </h3>
                <p className="mt-2 text-sm leading-7 text-text-secondary">
                  Each page keeps authority, execution, evidence, verification,
                  and challenge language separate.
                </p>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-bg p-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  Name the limits
                </h3>
                <p className="mt-2 text-sm leading-7 text-text-secondary">
                  Samples are explanatory. They do not imply live customer
                  proof, production deployment, legal compliance, or complete
                  AI governance coverage.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Supporting surfaces
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {supportSurfaces.map((item) => (
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Additional named sample cases
            </h2>
            {sampleCases.map((sampleCase) => (
              <Link
                key={sampleCase.href}
                href={sampleCase.href}
                className="block rounded-2xl border border-surface-border bg-surface-card/40 p-6 transition-colors hover:bg-surface-card/60"
              >
                <h3 className="text-xl font-semibold text-text-primary">
                  {sampleCase.title}
                </h3>
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
