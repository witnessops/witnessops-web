import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
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
    title: "SBOM minimum-elements check",
    href: "/review/sample-cases/sbom-cisa-2026-minimum-elements",
    situation:
      "You need a clear answer on whether an SBOM covers the CISA 2026 minimum elements for one named software unit.",
    youSee:
      "A synthetic SBOM, generation context, a present/partial checklist with named gaps, and package boundaries — not a compliance certificate.",
    tags: ["CISA 2026 baseline", "Named gaps"],
    emphasize: true,
  },
  {
    title: "Local server security review",
    href: "/review/sample-cases/offsec-shield-local-server-audit",
    situation: "A read-only local server audit was packaged as a receipt-backed deliverable.",
    youSee:
      "How posture and findings sit next to a receipt and hash manifest, and what /verify does and does not confirm for this sample.",
    tags: ["Security review shape", "Synthetic host"],
    emphasize: false,
  },
  {
    title: "Privileged access grant",
    href: "/review/sample-cases/privileged-access-grant",
    situation: "Someone requested time-bounded administrative access for one task.",
    youSee:
      "How approval, provisioning, and entitlement evidence should connect — and where replay often stays weak.",
    tags: ["Access path", "Explanatory sample"],
    emphasize: false,
  },
  {
    title: "Approval-gated containment",
    href: "/review/sample-cases/approval-gated-containment",
    situation: "A containment action must not run until approval is recorded.",
    youSee:
      "Gate enforcement, target-state evidence, and what a portable inspection path should include after the event.",
    tags: ["Control path", "Explanatory sample"],
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
    description:
      "Upload or paste receipt JSON and read a clear, receipt-scoped result.",
    href: "/verify",
    label: "Open verifier",
  },
  {
    title: "Illustrative sample report",
    description:
      "A generic report shape for orientation — not a live customer report.",
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
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <SectionShell narrow>
        <SampleCaseBanner
          note="These pages are labelled samples and illustrations for orientation only. They are not live customer artifacts, production verification results, or certifications."
        />

        <header className="max-w-3xl border-b border-surface-border pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Examples
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-5xl">
            Example reviews you can inspect
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary">
            See how WitnessOps packages a bounded review: the situation, what was
            checked, which evidence is referenced, and what remains unproven.
            Use these before you request work for your own environment.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <CtaButton href="/review/request" variant="primary" label="Start a review" />
            <CtaButton href="/verify" variant="secondary" label="Verify a receipt" />
            <CtaButton href="/catalog" variant="secondary" label="View services" />
          </div>
        </header>

        <section className="mt-10" aria-labelledby="sample-cases-how-heading">
          <h2
            id="sample-cases-how-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How to use these pages
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {howToUse.map(([title, body]) => (
              <article
                key={title}
                className="border border-surface-border bg-surface-bg p-5"
              >
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="sample-cases-list-heading">
          <h2
            id="sample-cases-list-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sample cases
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <div className="space-y-4">
            {sampleCases.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block border p-6 transition-colors hover:border-brand-accent ${
                  item.emphasize
                    ? "border-brand-accent/50 bg-brand-accent/5"
                    : "border-surface-border bg-surface-card/40"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-text-primary">
                    {item.title}
                  </h3>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-surface-border bg-surface-bg px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Situation
                </p>
                <p className="mt-1 text-base leading-7 text-text-secondary">
                  {item.situation}
                </p>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                  What you can inspect
                </p>
                <p className="mt-1 text-base leading-7 text-text-secondary">
                  {item.youSee}
                </p>
                <p className="mt-5 text-sm font-semibold text-brand-accent">
                  Open example →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 border border-surface-border bg-surface-bg p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
            Limits that always apply
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-text-secondary marker:text-brand-accent">
            <li>Not live customer evidence or a claim of completed verification for your environment.</li>
            <li>Not a legal compliance claim, certification, or audit opinion.</li>
            <li>Not a production deployment claim or complete AI governance program.</li>
            <li>
              A valid public receipt result confirms the checks named in that receipt — not that every underlying action was correct.
            </li>
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="sample-cases-next-heading">
          <h2
            id="sample-cases-next-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Next steps
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {nextSteps.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block border border-surface-border bg-surface-bg p-5 transition-colors hover:border-brand-accent"
              >
                <h3 className="font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {item.description}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-brand-accent">
                  {item.label}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <PublicContactRoute />
        </div>
      </SectionShell>
    </main>
  );
}
