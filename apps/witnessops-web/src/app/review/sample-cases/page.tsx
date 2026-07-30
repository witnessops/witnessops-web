import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";
import { SampleCaseBanner } from "@/components/marketing/sample-case-banner";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";

export const metadata: Metadata = {
  title: "Example reviews",
  description:
    "Inspect labelled sample reviews before you request work: what was checked, what evidence is referenced, and what remains unproven. Not live customer evidence.",
  alternates: getCanonicalAlternates("witnessops", "/review/sample-cases"),
  openGraph: {
    title: "Example reviews | WitnessOps",
    description:
      "Inspect labelled sample reviews before you request work: what was checked, what evidence is referenced, and what remains unproven.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Example reviews | WitnessOps",
    description:
      "Inspect labelled sample reviews before you request work: what was checked, what evidence is referenced, and what remains unproven.",
  },
};

const sampleCases = [
  {
    title: "AI agent change package",
    href: "/review/sample-cases/ai-agent-action-proof-run",
    situation: "An AI agent proposed and applied one bounded code or configuration change.",
    youSee:
      "Who authorized it, what was allowed, what evidence was captured, and how a third party can re-check the package.",
    tags: ["Full package on GitHub", "Receipt + verifier path"],
    emphasize: true,
  },
  {
    title: "Local server security review",
    href: "/review/sample-cases/local-server-security-review",
    situation: "A read-only local server security review was packaged for inspection.",
    youSee:
      "How posture and findings sit next to a receipt and hash manifest, and what /verify does and does not confirm for this sample.",
    tags: ["Full sample package", "Synthetic host"],
    emphasize: true,
  },
  {
    title: "SBOM field checklist (method sample)",
    href: "/review/sample-cases/sbom-cisa-2026-minimum-elements",
    situation:
      "A labelled synthetic package shows how a field checklist can sit inside a delivery — not a public product card.",
    youSee:
      "Generation context, present/partial gaps, and limits. Not compliance certification and not a catalogue SKU promotion.",
    tags: ["Method sample", "Not a product card"],
    emphasize: false,
  },
  {
    title: "Privileged access grant",
    href: "/review/sample-cases/privileged-access-grant",
    situation: "Someone requested time-bounded administrative access for one task.",
    youSee:
      "How approval, provisioning, and entitlement evidence should connect — and where replay often stays weak.",
    tags: ["Access path", "Explanatory example only"],
    emphasize: false,
  },
  {
    title: "Approval-gated containment",
    href: "/review/sample-cases/approval-gated-containment",
    situation: "A containment action must not run until approval is recorded.",
    youSee:
      "Gate enforcement, target-state evidence, and what a portable inspection path should include after the event.",
    tags: ["Control path", "Explanatory example only"],
    emphasize: false,
  },
] as const;

const howToUse = [
  [
    "Start with the situation",
    "Each example names one bounded problem a buyer might have, not a product feature list.",
  ],
  [
    "Inspect what was checked",
    "Look for who authorized the work, what evidence is referenced, and how results are handed over.",
  ],
  [
    "Read the limits",
    "Samples are labelled. They are not live customer evidence, production verification, or certification.",
  ],
] as const;

const nextSteps = [
  {
    title: "Verify a receipt",
    description: "Upload or paste receipt JSON and read a clear, receipt-scoped result.",
    href: "/verify",
    label: "Open verifier",
  },
  {
    title: "Illustrative sample report",
    description: "A generic report shape for orientation — not a live customer report.",
    href: "/review/sample-report",
    label: "Open sample report",
  },
  {
    title: "Start a review",
    description:
      "Describe one situation without secrets. We confirm fit, scope, price and evidence handling before work starts.",
    href: "/review/request",
    label: "Start a review",
  },
] as const;

export default function SampleCasesIndexPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page" data-page="sample-cases-index">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <SampleCaseBanner
          note="These pages are labelled samples and illustrations for orientation only. They are not live customer artifacts, production verification results, or certifications."
        />

        <header className="mt-8 max-w-4xl border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Examples
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            Example reviews you can inspect
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
            See how WitnessOps packages a bounded review: the situation, what was checked, which
            evidence is referenced, and what remains unproven. Use these before you request work for
            your own environment.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
            Operator scripts and checks run inside a scoped package when useful. They are methods —
            not a product card for every capability.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton href="/review/request" variant="primary" label="Start a review" />
            <CtaButton href="/verify" variant="secondary" label="Verify a receipt" />
            <CtaButton href="/catalog" variant="secondary" label="View services" />
          </div>
        </header>

        <section className="border-b border-surface-border py-12" aria-labelledby="sample-cases-how-heading">
          <h2
            id="sample-cases-how-heading"
            className="text-3xl font-semibold tracking-[-0.02em] text-text-primary"
          >
            How to use these pages
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {howToUse.map(([title, body]) => (
              <article key={title} className="border-t border-surface-border pt-4">
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-surface-border py-12" aria-labelledby="sample-cases-list-heading">
          <h2
            id="sample-cases-list-heading"
            className="text-3xl font-semibold tracking-[-0.02em] text-text-primary"
          >
            Sample cases
          </h2>
          <div className="mt-8 grid gap-px border border-surface-border bg-surface-border">
            {sampleCases.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block bg-white p-7 transition-colors hover:bg-brand-accent/5 md:p-9 ${
                  item.emphasize ? "ring-1 ring-inset ring-brand-accent/40" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
                    {item.title}
                  </h3>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-surface-border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-text-muted">Situation</p>
                <p className="mt-1 text-base leading-7 text-text-secondary">{item.situation}</p>
                <p className="mt-4 text-sm font-semibold text-text-muted">What you can inspect</p>
                <p className="mt-1 text-base leading-7 text-text-secondary">{item.youSee}</p>
                <p className="mt-6 text-sm font-semibold text-brand-accent">Open example →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Limits that always apply
          </h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            <li className="border-t border-surface-border pt-4">
              Not live customer evidence or a claim of completed verification for your environment.
            </li>
            <li className="border-t border-surface-border pt-4">
              Not a legal compliance claim, certification, or audit opinion.
            </li>
            <li className="border-t border-surface-border pt-4">
              Not a production deployment claim or complete AI governance program.
            </li>
            <li className="border-t border-surface-border pt-4">
              A valid public receipt result confirms the checks named in that receipt — not that
              every underlying action was correct.
            </li>
          </ul>
        </section>

        <section className="border-b border-surface-border py-12" aria-labelledby="sample-cases-next-heading">
          <h2
            id="sample-cases-next-heading"
            className="text-3xl font-semibold tracking-[-0.02em] text-text-primary"
          >
            Next steps
          </h2>
          <div className="mt-8 grid gap-px border border-surface-border bg-surface-border md:grid-cols-3">
            {nextSteps.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block bg-white p-7 transition-colors hover:bg-brand-accent/5 md:p-9"
              >
                <h3 className="text-xl font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{item.description}</p>
                <p className="mt-5 text-sm font-semibold text-brand-accent">{item.label} →</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="border-t border-surface-border pt-10">
          <PublicContactRoute />
        </div>
      </div>
    </main>
  );
}
