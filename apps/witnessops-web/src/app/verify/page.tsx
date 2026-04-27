import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { VerifyConsole } from "@/components/verify/verify-console";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";
import { TrustBoundarySnippet } from "@/components/shared/trust-boundary-snippet";
import { listVerifyFixtures } from "@/lib/verify-fixtures";
import { publicProofBundles } from "@/lib/public-proof-bundles";

export const metadata: Metadata = {
  title: "Verify a Receipt or Proof Bundle",
  description:
    "Check receipt JSON in the public console or verify a buyer proof bundle offline with the included verifier and claim boundary.",
  alternates: getCanonicalAlternates("witnessops", "/verify"),
};

export default function VerifyPage() {
  const fixtures = listVerifyFixtures();

  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell>
        <h1 className="text-4xl font-bold text-text-primary">Verify a receipt or proof bundle.</h1>
      </SectionShell>

      <SectionShell>
        <div className="border border-surface-border bg-surface-bg p-6">
          <div className="text-xs uppercase text-brand-accent mb-3">Public proof bundles</div>
          <div className="grid gap-4">
            {publicProofBundles.map((bundle) => (
              <div key={bundle.id} className="border border-surface-border p-4">
                <div className="font-semibold text-text-primary">{bundle.title}</div>
                <div className="text-sm text-text-muted mt-1">Workflow: {bundle.workflow}</div>
                <div className="text-sm text-text-muted mt-1">Status: {bundle.status}</div>

                {bundle.status === "published" && bundle.artifactPath ? (
                  <a href={bundle.artifactPath} className="text-brand-accent mt-3 inline-block">
                    Download proof bundle
                  </a>
                ) : (
                  <div className="text-sm text-text-muted mt-3">
                    Proof bundle will appear here once a real signed run is published.
                  </div>
                )}

                <div className="text-xs text-text-muted mt-3">
                  {bundle.claimBoundary}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell id="verify-console">
        <VerifyConsole fixtures={fixtures} />
      </SectionShell>

      <TrustBoundarySnippet variant="verification" />
    </main>
  );
}
