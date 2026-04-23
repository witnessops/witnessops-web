import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Why WitnessOps",
  description:
    "WitnessOps helps teams turn consequential security work into signed receipts and reviewable evidence packages that customers, auditors, and partners can inspect after the work is done.",
  alternates: getCanonicalAlternates("witnessops", "/why-witnessops"),
  openGraph: {
    title: "Why WitnessOps | WitnessOps",
    description:
      "WitnessOps helps teams turn consequential security work into signed receipts and reviewable evidence packages that customers, auditors, and partners can inspect after the work is done.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why WitnessOps | WitnessOps",
    description:
      "WitnessOps helps teams turn consequential security work into signed receipts and reviewable evidence packages that customers, auditors, and partners can inspect after the work is done.",
  },
};

export default function WhyWitnessOpsPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Why WitnessOps
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          Why security work needs proof people can check.
        </h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-text-secondary">
          <p>
            Most security work becomes hard to trust once it leaves the team that
            ran it. Reports, screenshots, and logs can show that something
            happened, but they usually do not make the work easy to check later.
          </p>
          <p>
            WitnessOps is built to leave a better handoff behind. It records what
            was approved, what ran, and what evidence was kept, then packages
            that into signed receipts and reviewable evidence packages other people
            can inspect for themselves.
          </p>
          <p>
            The goal is simple: when the work changes hands, the next person
            should not have to rely on memory, loose screenshots, or a vendor
            summary to understand what happened.
          </p>
          <p>That is why the public path stays focused on a few clear actions:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Review one real workflow.</li>
            <li>See who could approve or act.</li>
            <li>Inspect verifier fixtures, explanatory sample cases, and the illustrative sample report.</li>
            <li>Read the trust limits in plain language.</li>
          </ul>
          <p>
            The system behind this may be complex. The explanation should not be.
            That is why WitnessOps keeps execution, evidence, and verification as
            separate concerns and says clearly where trust still sits with us.
          </p>
        </div>

        <div className="mt-10 border-t border-surface-border pt-8">
          <p className="mb-4 text-sm leading-relaxed text-text-muted">
            Keep going with Review or inspect a verifier fixture first.
          </p>
          <div className="flex flex-wrap gap-3">
            <CtaButton href="/review" variant="primary" label="Review one workflow" />
            <CtaButton href="/verify" variant="secondary" label="Verify a sample receipt" />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
