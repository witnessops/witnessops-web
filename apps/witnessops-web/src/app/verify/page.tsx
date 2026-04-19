import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { VerifyConsole } from "@/components/verify/verify-console";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";
import { TrustBoundarySnippet } from "@/components/shared/trust-boundary-snippet";
import { listVerifyFixtures } from "@/lib/verify-fixtures";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

export const metadata: Metadata = {
  title: "Verify a Receipt",
  description:
    "Evaluate receipt integrity and proof boundaries with deterministic receipt-first verification.",
  alternates: getCanonicalAlternates("witnessops", "/verify"),
  openGraph: {
    title: "Verify a Receipt | WitnessOps",
    description:
      "Evaluate receipt integrity and proof boundaries with deterministic receipt-first verification.",
    siteName: "WitnessOps",
    type: "website",
    images: DEFAULT_OPEN_GRAPH_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: "Verify a Receipt | WitnessOps",
    description:
      "Evaluate receipt integrity and proof boundaries with deterministic receipt-first verification.",
    images: DEFAULT_TWITTER_IMAGES,
  },
};

const verificationScope = [
  {
    title: "What this proves now",
    body: "Receipt integrity checks executed by the verifier: signature/timestamp consistency, declared stage consistency, and deterministic breach reporting.",
  },
  {
    title: "What this does not prove",
    body: "Execution correctness, decision quality, complete incident truth, or full bundle-byte revalidation outside receipt-only scope.",
  },
  {
    title: "Decision semantics",
    body: "Results are presented as verified, declared, inferred, or not proven so verification scope stays explicit.",
  },
];

const firstRunSteps = [
  {
    title: "1. Run a known-valid sample",
    expected: "Expected outcome: inferred (receipt checks pass in receipt-only mode).",
    why: "Confirms the verifier can reproduce a deterministic pass path.",
  },
  {
    title: "2. Run a known-invalid sample",
    expected: "Expected outcome: not proven (breach is detected and explained).",
    why: "Confirms failure detection is visible and auditable.",
  },
  {
    title: "3. Run your own receipt",
    expected: "Expected outcome: explicit scope-bound result with trust assumptions.",
    why: "Applies the same contract to your real artifact.",
  },
];

const resultSemantics = [
  {
    label: "Verified",
    detail: "Directly established by checks executed in this verifier mode.",
  },
  {
    label: "Declared",
    detail: "Claimed by artifact metadata, not independently established.",
  },
  {
    label: "Inferred",
    detail: "Suggested by partial evidence or mode limits, not fully established.",
  },
  {
    label: "Not proven",
    detail: "Failed, missing, unsupported, or not executed.",
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
              Verify a published proof bundle.
            </h1>
            <p className="mt-5 max-w-[48rem] text-base leading-8 text-text-secondary">
              Use this page to check what a published bundle can prove now, what
              it cannot prove, and what to do next.
            </p>
            <p className="mt-4 max-w-[48rem] text-base leading-8 text-text-secondary">
              This verifier checks receipt integrity and scope-bound claims; it
              does not prove complete incident truth or total runtime
              correctness.
            </p>
            <p className="mt-4 max-w-[48rem] text-sm leading-7 text-text-muted">
              If verification passes, inspect assumptions and evidence
              continuity. If it fails, inspect the named breach before trusting
              downstream claims.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <CtaButton href="#verify-console" variant="primary" label="Verify a sample bundle" />
              <CtaButton href="#verify-console" variant="secondary" label="Verify a bundle" />
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
                Browser input is sent to <code>/api/verify</code> for receipt-first
                deterministic checks. Keep sensitive handling policy aligned to your
                environment before submitting production artifacts.
              </p>
            </div>

            <TrustBoundarySnippet variant="verification" className="mt-8" />
          </div>

          <div className="space-y-4 border border-surface-border bg-surface-bg p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              First-run path
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
            Result semantics
          </div>
          <div className="grid gap-3 md:grid-cols-2">
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
            Read Next
          </div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Continue with the full verification map.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Use load-bearing docs to inspect receipt structure, verification scope,
            and threat-boundary assumptions.
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
              label="Receipt Concepts"
            />
            <CtaButton
              href="/docs/evidence/receipt-spec"
              variant="secondary"
              label="Receipt Spec"
            />
            <CtaButton
              href="/docs/security-systems/threat-model"
              variant="secondary"
              label="Threat Model"
            />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
