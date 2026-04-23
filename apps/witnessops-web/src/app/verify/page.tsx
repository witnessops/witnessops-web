import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { VerifyConsole } from "@/components/verify/verify-console";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";
import { TrustBoundarySnippet } from "@/components/shared/trust-boundary-snippet";
import { listVerifyFixtures } from "@/lib/verify-fixtures";

export const metadata: Metadata = {
  title: "Verify a Receipt",
  description:
    "Check what a published receipt can show, what it cannot show, and where the trust limits still are.",
  alternates: getCanonicalAlternates("witnessops", "/verify"),
  openGraph: {
    title: "Verify a Receipt | WitnessOps",
    description:
      "Check what a published receipt can show, what it cannot show, and where the trust limits still are.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verify a Receipt | WitnessOps",
    description:
      "Check what a published receipt can show, what it cannot show, and where the trust limits still are.",
  },
};

const statusChips = [
  { label: "Sample class", value: "Verifier fixtures" },
  { label: "Mode", value: "Public verifier" },
  { label: "Scope", value: "Receipt-first v1" },
];

const verificationScope = [
  {
    title: "What this can show",
    body: "The verifier checks the receipt itself: signature, timestamp, stage, and other receipt-level consistency checks.",
  },
  {
    title: "What this cannot show",
    body: "It does not prove that every action was correct, that every decision was right, or that you now know the full story of an incident.",
  },
  {
    title: "Verifier mode",
    body: "This public surface runs in receipt-first v1 mode. Proof-bundle uploads and unsupported receipt classes fail closed.",
  },
];

const firstRunSteps = [
  {
    title: "1. Try a known-good sample",
    expected: "Expected outcome: valid for a known-good receipt.",
    why: "This shows the verifier can reproduce a clean receipt pass path.",
  },
  {
    title: "2. Try a known-bad sample",
    expected: "Expected outcome: invalid or input rejected with a named breach or failure.",
    why: "This shows that failure is visible and explained, not hidden.",
  },
  {
    title: "3. Try your own receipt",
    expected: "Expected outcome: a receipt-scoped result with clear trust limits.",
    why: "This applies the same rules to your real artifact.",
  },
];

const resultSemantics = [
  {
    label: "Valid",
    detail: "The required checks for the declared receipt scope passed.",
  },
  {
    label: "Invalid",
    detail: "One or more proof-bearing receipt checks failed.",
  },
  {
    label: "Indeterminate",
    detail: "The receipt may be coherent, but a required outside trust condition could not be established locally.",
  },
];

export default function VerifyPage() {
  const fixtures = listVerifyFixtures();

  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell>
        <div className="grid gap-8 lg:grid-cols-[1.14fr,0.86fr] lg:items-start">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Verify
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary lg:text-5xl">
              Check a published receipt.
            </h1>
            <p className="mt-5 max-w-[48rem] text-base leading-8 text-text-secondary">
              Use this page to see what a published receipt can show now, what it
              cannot show, and what to inspect next.
            </p>
            <p className="mt-4 max-w-[48rem] text-base leading-8 text-text-secondary">
              This verifier checks receipt JSON in receipt-first v1 mode. It does
              not currently accept proof-bundle uploads, and it does not claim to
              prove the full runtime story.
            </p>
            <p className="mt-4 max-w-[48rem] text-sm leading-7 text-text-muted">
              If a check passes, read the trust limits before relying on the
              result. If it fails, read the named breach or failure before
              trusting any claim built on top of it.
            </p>
            <p className="mt-4 max-w-[48rem] text-sm leading-7 text-text-muted">
              The sample buttons below load verifier fixtures: public sample
              receipts used to show clean pass, named failure, and fail-closed
              behavior. They are not live customer artifacts.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {statusChips.map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-full border border-surface-border bg-surface-bg px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-text-muted"
                >
                  <span className="font-semibold text-text-primary">{chip.label}:</span>{" "}
                  {chip.value}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <CtaButton href="#verify-console" variant="primary" label="Try a sample receipt" />
              <CtaButton href="/docs/how-it-works/verification" variant="secondary" label="How verification works" />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {verificationScope.map((item) => (
                <div key={item.title} className="border border-surface-border bg-surface-bg p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 border border-surface-border bg-surface-bg p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                Data handling boundary
              </div>
              <p className="mt-3 max-w-[48rem] text-sm leading-relaxed text-text-secondary">
                Browser input is sent to <code>/api/verify</code> for receipt-level
                checks in receipt-first v1 mode. Make sure that matches your
                handling rules before you submit a production artifact.
              </p>
            </div>

            <TrustBoundarySnippet variant="verification" className="mt-8" />
          </div>

          <div className="space-y-4 border border-surface-border bg-surface-bg p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              First run
            </div>
            <div className="space-y-4">
              {firstRunSteps.map((step) => (
                <div key={step.title} className="border border-surface-border bg-surface-card p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {step.expected}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">
                    {step.why}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="pt-0">
        <div className="border border-surface-border bg-surface-bg p-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Result verdicts
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {resultSemantics.map((state) => (
              <div key={state.label} className="border border-surface-border bg-surface-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                  {state.label}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {state.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="pt-0" id="verify-console">
        <VerifyConsole fixtures={fixtures} />
      </SectionShell>

      <SectionShell className="pt-0" narrow>
        <div className="border border-surface-border bg-surface-bg p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Read next
          </div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Keep going with the verification docs.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Use the docs below to inspect receipt structure, verification scope,
            and trust limits in more detail.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <CtaButton
              href="/docs/quickstart/verify-first"
              variant="primary"
              label="Verify First Quickstart"
            />
            <CtaButton
              href="/docs/how-it-works/verification"
              variant="secondary"
              label="Verification Docs"
            />
            <CtaButton
              href="/docs/evidence/receipts"
              variant="secondary"
              label="Receipt Basics"
            />
            <CtaButton
              href="/docs/evidence/receipt-spec"
              variant="secondary"
              label="Receipt Spec"
            />
            <CtaButton
              href="/docs/security-systems/threat-model"
              variant="secondary"
              label="Trust Limits"
            />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
