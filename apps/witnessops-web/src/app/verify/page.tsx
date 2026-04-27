import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { VerifyConsole } from "@/components/verify/verify-console";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";
import { TrustBoundarySnippet } from "@/components/shared/trust-boundary-snippet";
import { listVerifyFixtures } from "@/lib/verify-fixtures";

export const metadata: Metadata = {
  title: "Verify a Receipt or Proof Bundle",
  description:
    "Check receipt JSON in the public console or verify a buyer proof bundle offline with the included verifier and claim boundary.",
  alternates: getCanonicalAlternates("witnessops", "/verify"),
  openGraph: {
    title: "Verify a Receipt or Proof Bundle | WitnessOps",
    description:
      "Check receipt JSON in the public console or verify a buyer proof bundle offline with the included verifier and claim boundary.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verify a Receipt or Proof Bundle | WitnessOps",
    description:
      "Check receipt JSON in the public console or verify a buyer proof bundle offline with the included verifier and claim boundary.",
  },
};

const statusChips = [
  { label: "Browser mode", value: "Receipt JSON" },
  { label: "Bundle mode", value: "Offline verifier" },
  { label: "Scope", value: "Receipt + artifact integrity" },
];

const verificationScope = [
  {
    title: "What this can show",
    body: "A verifier can check receipt structure, signature, trusted signer, and whether supplied artifacts match the hashes bound into the receipt.",
  },
  {
    title: "What this cannot show",
    body: "It does not certify that the target is secure, that every exposure was found, or that unrecorded operator behavior occurred correctly.",
  },
  {
    title: "Two verification paths",
    body: "Use the browser console for receipt JSON. Use the buyer bundle instructions for full offline verification of receipt, signature, and source artifacts.",
  },
];

const firstRunSteps = [
  {
    title: "1. Inspect the claim boundary",
    expected: "Expected outcome: understand exactly what the receipt can and cannot prove.",
    why: "Verification should not outrun the artifact. The claim boundary is part of the proof surface.",
  },
  {
    title: "2. Verify receipt JSON in browser",
    expected: "Expected outcome: receipt-scoped result from the public console.",
    why: "This checks the public verifier path for receipt-first v1 artifacts.",
  },
  {
    title: "3. Verify full bundle offline",
    expected: "Expected outcome: valid, invalid, or indeterminate from the included verifier.",
    why: "This checks the signed receipt against source artifacts without trusting a hosted service.",
  },
];

const resultSemantics = [
  {
    label: "Valid",
    detail: "The required checks for the declared scope passed. Read the claim boundary before relying on the result.",
  },
  {
    label: "Invalid",
    detail: "One or more required proof-bearing checks failed. Treat the claim as not verified.",
  },
  {
    label: "Indeterminate",
    detail: "The artifact may be coherent, but a required trust condition could not be established locally.",
  },
];

const buyerBundleFiles = [
  "witnessops-receipt.json",
  "witnessops-receipt.sig",
  "trusted-signers.json",
  "source/state.json",
  "source/manifest.json",
  "source/receipt.json",
  "source/hash-manifest.txt",
  "verifier/witnessops_verify_receipt.py",
  "verification/verification-result.json",
  "MANIFEST.sha256",
  "CLAIM_BOUNDARY.md",
  "VERIFY.md",
];

const buyerConclusions = [
  "The receipt was signed by a key listed in the supplied trusted signer registry.",
  "The source artifacts supplied in the bundle match the hashes bound into the receipt.",
  "The verifier accepted the bundle under the declared contract.",
];

const buyerNonConclusions = [
  "The target is secure.",
  "The workflow was exhaustive.",
  "All possible exposures were found.",
  "Facts outside the signed receipt and supplied artifacts were proven.",
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
              Verify a receipt or proof bundle.
            </h1>
            <p className="mt-5 max-w-[48rem] text-base leading-8 text-text-secondary">
              Use this page to check a published receipt in the browser or follow
              the offline path for a buyer proof bundle. The goal is simple: make
              the artifact checkable without asking the buyer to trust the story.
            </p>
            <p className="mt-4 max-w-[48rem] text-base leading-8 text-text-secondary">
              Browser verification is receipt-first v1. Full bundle verification
              remains offline: run the verifier included in the bundle against the
              signed receipt, detached signature, trusted signer registry, and
              source artifacts.
            </p>
            <p className="mt-4 max-w-[48rem] text-sm leading-7 text-text-muted">
              If a check passes, read the claim boundary before relying on the
              result. A valid receipt proves the recorded artifact relationship,
              not the whole truth of the assessed system.
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
              <CtaButton href="#verify-console" variant="primary" label="Verify receipt JSON" />
              <CtaButton href="#buyer-bundle" variant="secondary" label="Verify a buyer bundle" />
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
                checks in receipt-first v1 mode. Buyer bundles are not uploaded
                here; verify them offline with the included verifier.
              </p>
            </div>

            <TrustBoundarySnippet variant="verification" className="mt-8" />
          </div>

          <div className="space-y-4 border border-surface-border bg-surface-bg p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              First verification path
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

      <SectionShell className="pt-0" id="buyer-bundle">
        <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
          <div className="border border-surface-border bg-surface-bg p-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Buyer bundle
            </div>
            <h2 className="text-2xl font-semibold text-text-primary">
              Verify the portable proof package offline.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              A buyer bundle contains the signed receipt, detached signature,
              trusted signer registry, source artifacts, verifier, manifest, and
              claim boundary. The buyer can run the verifier locally and inspect
              the result without trusting this website.
            </p>
            <div className="mt-5 grid gap-2 text-sm text-text-muted">
              {buyerBundleFiles.map((file) => (
                <code key={file} className="border border-surface-border bg-surface-card px-3 py-2">
                  {file}
                </code>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-surface-border bg-surface-bg p-6">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                Offline command
              </div>
              <pre className="overflow-x-auto border border-surface-border bg-[#0a0e17] p-4 text-xs leading-6 text-text-secondary">
{`python3 verifier/witnessops_verify_receipt.py \\
  --receipt witnessops-receipt.json \\
  --signature witnessops-receipt.sig \\
  --manifest source/manifest.json \\
  --hash-manifest source/hash-manifest.txt \\
  --state source/state.json \\
  --source-receipt source/receipt.json \\
  --trusted-signers trusted-signers.json \\
  --json`}
              </pre>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Treat any result other than <code>valid</code> as not verified under
                the declared contract.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-surface-border bg-surface-bg p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                  If valid, buyer may conclude
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-muted">
                  {buyerConclusions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-surface-border bg-surface-bg p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                  Buyer must not conclude
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-muted">
                  {buyerNonConclusions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
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
