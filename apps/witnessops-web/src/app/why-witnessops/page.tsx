import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Why WitnessOps",
  description:
    "Clear work. Evidence you can follow. Limits you can see. WitnessOps turns one defined security or operational problem into a practical result that another responsible person can inspect.",
  alternates: getCanonicalAlternates("witnessops", "/why-witnessops"),
  openGraph: {
    title: "Why WitnessOps | WitnessOps",
    description:
      "Clear work. Evidence you can follow. Limits you can see. WitnessOps turns one defined problem into a practical result with evidence references, named limits and unresolved items.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why WitnessOps | WitnessOps",
    description:
      "Clear work. Evidence you can follow. Limits you can see. Bounded security and operational reviews with a practical handover.",
  },
};

const differences = [
  [
    "Start with the situation",
    "The buyer describes the problem in ordinary language. WitnessOps proposes the smallest useful review.",
  ],
  [
    "Agree the boundary first",
    "Scope, authority, result, price, timing, evidence handling and exclusions are agreed before work starts.",
  ],
  [
    "Keep evidence status visible",
    "Observed material, management assertions, unsupported claims, unknowns and unresolved items remain distinct.",
  ],
  [
    "Leave a practical handover",
    "The final package is organised so the next person can inspect the result, understand the limits and decide what happens next.",
  ],
] as const;

export default function WhyWitnessOpsPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Why WitnessOps
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          Clear work. Evidence you can follow. Limits you can see.
        </h1>
        <p className="mt-8 text-base leading-8 text-text-secondary">
          Security and operational work becomes difficult to trust when the scope, source material
          and remaining gaps are scattered across tickets, screenshots, messages and memory.
          WitnessOps turns one defined problem into a practical result that another responsible
          person can inspect.
        </p>
      </SectionShell>

      <SectionShell narrow spacing="compact" className="border-t border-surface-border">
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">What is different</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {differences.map(([title, body]) => (
            <article key={title} className="border border-surface-border bg-surface-bg p-5">
              <h3 className="font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{body}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell narrow spacing="compact" className="border-t border-surface-border">
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          Verification boundary
        </h2>
        <p className="mt-4 text-base leading-8 text-text-secondary">
          A proof claim requires a named receipt, evidence manifest, verifier result, or proof
          bundle. WitnessOps only describes a result as verified when that named mechanism supports
          the claim. Verification of an artefact does not automatically prove that every underlying
          action was correct, safe or complete. This page is not a legal compliance claim, production
          deployment claim, or complete AI governance program.
        </p>
        <div className="mt-10 border-t border-surface-border pt-8">
          <p className="mb-4 text-sm leading-relaxed text-text-muted">
            Tell us what happened. Start with a non-secret fit check.
          </p>
          <div className="flex flex-wrap gap-3">
            <CtaButton href="/review/request" variant="primary" label="Start a review" />
            <CtaButton href="/catalog" variant="secondary" label="View services" />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
