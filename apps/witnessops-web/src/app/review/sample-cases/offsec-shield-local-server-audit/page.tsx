import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";
import { SampleCaseBanner } from "@/components/marketing/sample-case-banner";
import {
  loadShieldSampleManifest,
  shieldArtifactDigest,
  shieldDisplayedArtifacts,
  shieldSampleHref,
  shieldSampleId,
} from "./shield-sample-contract";

export const metadata: Metadata = {
  title: "Sample — OffSec Shield Local Server Audit",
  description:
    "Synthetic public OffSec Shield sample proofpack fixture with demo-host posture, evidence manifest, receipt, and offline manifest inspection boundaries.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/offsec-shield-local-server-audit",
  ),
  openGraph: {
    title: "Sample — OffSec Shield Local Server Audit | WitnessOps",
    description:
      "Inspect a synthetic OffSecAgent + OffSecShield local-audit deliverable and how it relates to WitnessOps verification boundaries.",
    siteName: "WitnessOps",
    type: "website",
  },
};

const statusChips = [
  { label: "Offer class", value: "OffSec Local Server Audit" },
  { label: "Artifact class", value: "Shield fixture proof bundle" },
  { label: "Host", value: "Synthetic demo-host (fixture)" },
  {
    label: "WitnessOps /verify",
    value: "Not verified through /api/verify; inspect manifest and sidecars",
  },
];

export default function OffSecShieldSamplePage() {
  const manifest = loadShieldSampleManifest();

  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>

        <SampleCaseBanner />
        <div className="space-y-8">
          <section className="space-y-5 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              OffSec + WitnessOps wiring (R1)
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              OffSec Shield — local server audit sample
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              OffSec collects read-only posture and ships a receipt-backed audit
              package fixture. WitnessOps proves named workflows on{" "}
              <Link href="/verify" className="text-brand-accent underline">
                /verify
              </Link>{" "}
              for supported PV/QV/WV receipt stages. This sample shows the
              Shield deliverable shape and honest limits. This sample is not currently verified through WitnessOps /api/verify.
            </p>
            <p className="max-w-[48rem] text-sm leading-7 text-text-muted">
              This is a synthetic public sample proofpack fixture. It demonstrates
              the structure of a receipt-backed audit package. It is not a live customer audit, not a production verification result, and not evidence that any third-party system was tested.
            </p>
            <div className="flex flex-wrap gap-2">
              {statusChips.map((chip) => (
                <span
                  key={chip.label}
                  className="rounded-full border border-surface-border bg-surface-bg px-3 py-1 text-xs text-text-muted"
                >
                  <span className="font-semibold text-text-primary">
                    {chip.label}:
                  </span>{" "}
                  {chip.value}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaButton href="/verify" variant="secondary" label="Read /verify boundary" />
              <CtaButton
                href="/docs/security-systems/mesh-federation-and-vmesh"
                variant="secondary"
                label="Mesh vs verify boundaries"
              />
              <CtaButton href="/review/request" variant="primary" label="Start a review" />
            </div>
          </section>

          {!manifest ? (
            <section className="rounded-2xl border border-amber-500/40 bg-surface-card/40 p-6 text-sm text-text-secondary">
              Sample files not published yet. Operator:{" "}
              <code className="font-mono text-xs">
                publish-shield-sample-witnessops.sh
              </code>
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Run metadata
                </h2>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div>
                    <dt className="text-text-muted">Receipt id</dt>
                    <dd className="font-mono text-text-primary">{manifest.receipt_id}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Run id</dt>
                    <dd className="font-mono text-text-primary">{manifest.run_id}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Module</dt>
                    <dd className="font-mono text-text-primary">{manifest.module}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Download artifacts
                </h2>
                <ul className="mt-4 space-y-3">
                  {shieldDisplayedArtifacts.map((file) => {
                    const digest = shieldArtifactDigest(manifest, file);
                    return (
                      <li
                        key={file}
                        className="rounded-xl border border-surface-border bg-surface-bg p-4"
                      >
                        <a
                          href={shieldSampleHref(file)}
                          className="font-mono text-sm font-semibold text-brand-accent hover:underline"
                        >
                          {file}
                        </a>
                        {digest ? (
                          <p className="mt-2 break-all font-mono text-xs text-text-muted">
                            sha256 {digest}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                  <li className="rounded-xl border border-surface-border bg-surface-bg p-4">
                    <a
                      href={shieldSampleHref("proofpack-demo-host-local-fixture-b.zip")}
                      className="font-mono text-sm font-semibold text-brand-accent hover:underline"
                    >
                      proofpack-demo-host-local-fixture-b.zip
                    </a>
                    <p className="mt-2 text-xs text-text-muted">
                      Optional portable proof-pack (fixture B drift demo). Verify
                      with OffSecShield CLI offline.
                    </p>
                  </li>
                </ul>
              </section>
            </>
          )}

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Proof boundary
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-text-secondary">
              <li>
                Integrity checks use Shield <code>MANIFEST.sha256</code> semantics
                (READY / MISMATCH / MISSING).
              </li>
              <li>
                Does not prove regulatory compliance, EDR coverage, or that your
                production hosts match this fixture.
              </li>
              <li>
                This sample is not currently verified through WitnessOps /api/verify.
                Use the included manifest and sidecars to inspect
                fixture structure. A public verifier path must be named before
                any verification claim is made.
              </li>
            </ul>
          </section>

          <p className="text-xs text-text-muted">
            Sample id: {shieldSampleId}. Regenerate via OffSec-Lane{" "}
            <code className="font-mono">publish-shield-sample-witnessops.sh</code>.
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
