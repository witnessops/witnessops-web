import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { InlineArrow } from "@/components/marketing/inline-arrow";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

export const metadata: Metadata = {
  title: "Sample work",
  description:
    "Inspect labelled sample reviews before you request work: what was checked, what evidence is referenced, and what remains unproven. Not live customer evidence.",
  alternates: getCanonicalAlternates("witnessops", "/review/sample-cases"),
  openGraph: {
    images: DEFAULT_OPEN_GRAPH_IMAGES,
    title: "Sample work | WitnessOps",
    description:
      "Inspect labelled sample reviews before you request work: what was checked, what evidence is referenced, and what remains unproven.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    images: DEFAULT_TWITTER_IMAGES,
    card: "summary_large_image",
    title: "Sample work | WitnessOps",
    description:
      "Inspect labelled sample reviews before you request work: what was checked, what evidence is referenced, and what remains unproven.",
  },
};

const sampleCases = [
  {
    title: "Compromised API key rotation",
    href: "/review/sample-cases/ai-agent-action-proof-run",
    situation: "A historical synthetic example connects one bounded agent action with authority and execution evidence.",
    youSee:
      "Signed sample artifacts, browser verification and an offline verifier. This is not a complete sample of the current agent review, and these tools are not standard review deliverables.",
    tags: ["Historical synthetic run", "Agent action example"],
    emphasize: true,
  },
  {
    title: "Witnessed synthetic CRM action",
    href: "/review/sample-cases/witnessed-crm-status-change",
    situation: "A recorded bounded action changes only Acme from NEW to REVIEWED.",
    youSee:
      "Original run authority, replay-only consent, the fixed action sequence, independent read-back, and an unsigned exact-byte demonstration receipt.",
    tags: ["Recorded synthetic run", "Replay + unsigned receipt"],
    emphasize: false,
  },
  {
    title: "Access removed proof (method sample)",
    href: "/review/sample-cases/access-removed-proof",
    situation: "One named access-removal event with sanitised before/after observations.",
    youSee:
      "Package shape and limits. Not a public product card and not universal access-elimination.",
    tags: ["Method sample", "Not a product card"],
    emphasize: false,
  },
  {
    title: "SBOM field checklist (method sample)",
    href: "/review/sample-cases/sbom-cisa-2026-minimum-elements",
    situation:
      "A labelled synthetic package shows how a field checklist can sit inside a delivery, not a public product card.",
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
      "How approval, provisioning, and entitlement evidence should connect and where replay often stays weak.",
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

const nextSteps = [
  {
    title: "Verify a receipt",
    description: "Check supported receipt JSON only. Sample-specific verifiers and historical packages have their own limits.",
    href: "/verify",
    label: "Open verifier",
  },
  {
    title: "Illustrative sample report",
    description: "A generic report shape for orientation, not a live customer report.",
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
        <header className="max-w-4xl border-b border-surface-border pb-6">
          <h1 className="text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            Sample work
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            Illustrative reviews, findings and evidence.
          </p>
          <p className="mt-3 max-w-3xl text-base leading-7 text-text-secondary">
            Inspect the evidence, findings and limits of a bounded review.
            Published sample, not live customer evidence. No production verification or certification.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
            Start with the historical agent-action specimen below. For the current
            scope of {PUBLIC_AGENT_ACTION_OFFER.name.en}, {" "}
            <Link href="/reviews/agent-action-security-review" className="text-brand-accent underline underline-offset-4">
              see the current review
            </Link>
            . Older service and method samples remain available for reference;
            they are not additional reviews offered for sale.
          </p>
        </header>

        <section className="border-b border-surface-border py-6" aria-labelledby="sample-cases-list-heading">
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
                className={`block bg-surface-card p-7 transition-colors hover:bg-brand-accent/5 md:p-9 ${
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
                <p className="mt-6 text-sm font-semibold text-brand-accent">Open example <InlineArrow /></p>
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
              A public receipt-only result names the checks that ran and remains
              indeterminate whenever required evidence or trust inputs were not
              independently checked.
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
                className="block bg-surface-card p-7 transition-colors hover:bg-brand-accent/5 md:p-9"
              >
                <h3 className="text-xl font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{item.description}</p>
                <p className="mt-5 text-sm font-semibold text-brand-accent">{item.label} <InlineArrow /></p>
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
