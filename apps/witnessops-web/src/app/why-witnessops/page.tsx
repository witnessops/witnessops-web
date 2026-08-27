import type { Metadata } from "next";
import Link from "next/link";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Why WitnessOps",
  description:
    "Bounded independent verification of consequential AI and security work. Reconstruct what was authorized, executed, observed and left unresolved for one defined activity.",
  alternates: languageAlternates("/why-witnessops", {
    en: "/why-witnessops",
    pl: "/pl/why-witnessops",
  }),
  openGraph: {
    title: "Why WitnessOps | WitnessOps",
    description:
      "One consequential agent run, decision or security activity—reconstructed with clear scope, evidence status, named limits and unresolved items.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why WitnessOps | WitnessOps",
    description:
      "Bounded independent verification for one consequential activity—not a whole-environment program.",
  },
};

const differences = [
  [
    "One consequential activity",
    "Start from one agent run, decision or security situation—not a whole-environment program or continuous control inventory.",
  ],
  [
    "Reconstruct the story",
    "Make reconstructable what was authorized, executed, observed and left unresolved, with named limits.",
  ],
  [
    "Agree the boundary first",
    "Scope, authority, result, price, timing, evidence handling and exclusions are agreed before work starts.",
  ],
  [
    "Complement continuous compliance",
    "This is a different job from Vanta-class control mapping: verify and hand over one bounded activity, not replace your GRC suite.",
  ],
] as const;

export default function WhyWitnessOpsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <SectionShell narrow>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Why WitnessOps
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary lg:text-5xl">
          Verify one consequential activity. Reconstruct what happened.
        </h1>
        <p className="mt-6 max-w-[40rem] text-base leading-8 text-text-secondary">
          Working category:{" "}
          <strong className="font-semibold text-text-primary">
            bounded independent verification of consequential AI and security
            work
          </strong>
          . For one agent run, decision or security activity, reconstruct what
          was authorized, executed, observed and left unresolved—so another
          responsible person can inspect the result without trusting memory and
          screenshots alone.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton href="/review/request" variant="primary" label="Start a review" />
          <CtaButton href="/catalog" variant="secondary" label="View services" />
          <CtaButton
            href="/customer-security-review"
            variant="secondary"
            label="Customer Security Review"
          />
        </div>
        <p className="mt-4 text-sm">
          <Link
            href="/verify"
            className="font-semibold text-brand-accent underline-offset-4 hover:underline"
          >
            Verify a receipt
          </Link>
          <span className="text-text-muted"> · </span>
          <Link
            href="/library"
            className="font-semibold text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
          >
            Skills
          </Link>
        </p>
      </SectionShell>

      <SectionShell narrow spacing="compact" className="border-t border-surface-border">
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          What is different
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {differences.map(([title, body]) => (
            <article
              key={title}
              className="border border-surface-border bg-surface-bg p-5"
            >
              <h3 className="font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{body}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell narrow spacing="compact" className="border-t border-surface-border">
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          Limits
        </h2>
        <p className="mt-4 max-w-[40rem] text-base leading-8 text-text-secondary">
          A proof claim requires a named receipt, evidence manifest, verifier
          result, or proof bundle. WitnessOps only describes a result as verified
          when that named mechanism supports the claim. Verification of an
          artefact does not automatically prove that every underlying action was
          correct, safe or complete. This page is not a legal compliance claim,
          not a production deployment claim, and not a complete AI governance
          program. It is not whole-environment assurance and does not replace
          continuous compliance or GRC tooling feature-for-feature.
        </p>
        <div className="mt-10 border border-surface-border bg-surface-card/30 p-6">
          <p className="text-sm leading-relaxed text-text-muted">
            Ready for a bounded review? Start with a non-secret fit check.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CtaButton href="/review/request" variant="primary" label="Start a review" />
            <CtaButton href="/catalog" variant="secondary" label="View services" />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
