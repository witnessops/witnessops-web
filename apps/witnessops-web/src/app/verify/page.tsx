import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { VerifyConsole } from "@/components/verify/verify-console";
import { CodeFrame } from "@/components/shared/code-frame";
import { SectionShell } from "@/components/shared/section-shell";
import { TrustBoundarySnippet } from "@/components/shared/trust-boundary-snippet";
import { listVerifyFixtures } from "@/lib/verify-fixtures";

export const metadata: Metadata = {
  title: "Verify a Receipt",
  description:
    "Verify WitnessOps receipts in receipt-only mode, inspect deterministic checks, and distinguish malformed input from unsupported inputs.",
  alternates: getCanonicalAlternates("witnessops", "/verify"),
};

const verificationScope = [
  {
    title: "Included in v1",
    body: "Receipt JSON verification, deterministic checks, breach reporting, and explicit malformed versus unsupported failure classes.",
  },
  {
    title: "Not included in v1",
    body: "Bundle uploads, mixed payloads, legacy bundle contracts, and artifact-byte revalidation.",
  },
  {
    title: "Public result model",
    body: "The public verdict stays deterministic while still exposing receipt-only scope and artifact-revalidation state.",
  },
];

export default function VerifyPage() {
  const fixtures = listVerifyFixtures();

  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell>
        <div className="grid gap-10 lg:grid-cols-[1.08fr,0.92fr] lg:items-start">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Verify
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary lg:text-5xl">
              Verify a WitnessOps receipt without depending on the original runtime.
            </h1>
            <p className="mt-5 max-w-[48rem] text-base leading-8 text-text-secondary">
              <code>/verify</code> is receipt-first and fail-closed. Paste or upload receipt
              JSON, inspect the deterministic checks, and see malformed input,
              unsupported input, and proof failure separated clearly.
            </p>

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

            <TrustBoundarySnippet variant="verification" className="mt-8" />

            <div className="mt-8 border border-surface-border bg-surface-bg p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                Receipt-only caveat
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">
                A tampered PV example can still verify here.
              </h2>
              <p className="mt-3 max-w-[48rem] text-sm leading-relaxed text-text-secondary">
                In <code>/verify</code> v1, `valid` means the receipt artifact verified in
                receipt-only mode. It does not mean the referenced artifact bytes
                were fetched and rehashed again. That is why scope and artifact
                revalidation stay visible beside the public verdict.
              </p>
            </div>
          </div>

          <CodeFrame
            language="bash"
            variant="terminal"
            title="verify-flow"
            lines={[
              "$ paste receipt JSON",
              "$ POST /api/verify",
              "",
              "verdict: valid",
              "scope: receipt-only",
              "artifact_revalidation: not_performed",
              "proof_stage_verified: PV",
            ]}
          />
        </div>
      </SectionShell>

      <SectionShell className="pt-0">
        <CodeFrame
          language="bash"
          variant="terminal"
          title="tampered-pv-example"
          lines={[
            "$ POST /api/verify  # tampered PV receipt",
            "",
            "verdict: valid",
            "scope: receipt-only",
            "artifact_revalidation: not_performed",
            "meaning: receipt artifact verified; referenced bytes not rechecked",
          ]}
        />
      </SectionShell>

      <SectionShell className="pt-0">
        <VerifyConsole fixtures={fixtures} />
      </SectionShell>

      <SectionShell className="pt-0" narrow>
        <div className="border border-surface-border bg-surface-bg p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Read Next
          </div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Verification is one trust layer, not the whole system.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Use the docs to understand receipt structure, verification scope, and
            where higher-assurance bundle checks fit after receipt-first v1.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/docs/how-it-works/verification"
              className="inline-flex items-center border border-brand-accent bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90"
            >
              Verification Docs
            </Link>
            <Link
              href="/docs/evidence/receipt-spec"
              className="inline-flex items-center border border-surface-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent"
            >
              Receipt Spec
            </Link>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
