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
  title: "Sample — Local server security review",
  description:
    "Synthetic public sample of a local server security review package: posture, findings, receipt, and hash checks. Not a live customer audit or production verification result.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/local-server-security-review",
  ),
  openGraph: {
    title: "Sample — Local server security review | WitnessOps",
    description:
      "Inspect a synthetic local server security review package and its honest verification limits.",
    siteName: "WitnessOps",
    type: "website",
  },
};

const statusChips = [
  { label: "Type", value: "Full sample package" },
  { label: "Situation", value: "Read-only local server review" },
  { label: "Host", value: "Synthetic demo host" },
  {
    label: "WitnessOps /verify",
    value: "Not verified through /api/verify; inspect manifest and sidecars",
  },
];

export default function LocalServerSecurityReviewSamplePage() {
  const manifest = loadShieldSampleManifest();

  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>

        <SampleCaseBanner
          title="Local server security review"
          note="Synthetic public sample package for a read-only local server review. It is not a live customer audit, not a production verification result, and not evidence that any third-party system was tested."
        />
        <div className="space-y-8">
          <section className="space-y-5 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample case
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Local server security review
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              Situation: a read-only review of a local server was packaged so a
              buyer can see posture, findings, a receipt, and hash checks side by
              side. This sample shows the deliverable shape and honest limits.
            </p>
            <p className="max-w-[48rem] text-sm leading-7 text-text-muted">
              Stable sample storage id: offsec-shield-local-server-audit (public fixture path).
              This sample is not currently verified through WitnessOps /api/verify.
              Use{" "}
              <Link href="/verify" className="text-brand-accent underline">
                /verify
              </Link>{" "}
              for supported receipt types; for this sample, inspect the included
              manifest and sidecars instead.
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
              <CtaButton href="/review/request" variant="primary" label="Start a review" />
              <CtaButton href="/verify" variant="secondary" label="Verify a receipt" />
              <CtaButton
                href="/review/sample-cases"
                variant="secondary"
                label="Browse all examples"
              />
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
                      with the offline operator CLI for this package.
                    </p>
                  </li>
                </ul>
              </section>
            </>
          )}

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Full suite product sample (OFFSEC-LOCAL-AUDIT)
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              Complete synthetic product package from the OffSec suite: buyer walkthrough,
              report, findings, receipt, and downloadable proofpack. Run id{" "}
              <code className="font-mono text-xs">pr_lsa_20260710120000_198fd7aceb</code>.
            </p>
            <ul className="mt-4 space-y-3">
              {[
                "local-server-audit-pr_lsa_20260710120000_198fd7aceb/BUYER_WALKTHROUGH.md",
                "local-server-audit-pr_lsa_20260710120000_198fd7aceb/report.md",
                "local-server-audit-pr_lsa_20260710120000_198fd7aceb/findings.json",
                "local-server-audit-pr_lsa_20260710120000_198fd7aceb/posture.json",
                "local-server-audit-pr_lsa_20260710120000_198fd7aceb/receipt.json",
                "local-server-audit-pr_lsa_20260710120000_198fd7aceb/evidence_manifest.json",
                "proofpack-pr_lsa_20260710120000_198fd7aceb.proofpack",
                "proofpack-pr_lsa_20260710120000_198fd7aceb.proofpack.sha256",
                "proofpack-pr_lsa_20260710120000_198fd7aceb.proofpack.sig.json",
              ].map((file) => (
                <li
                  key={file}
                  className="rounded-xl border border-surface-border bg-surface-bg p-4"
                >
                  <a
                    href={`/samples/offsec-local-audit/${file}`}
                    className="break-all font-mono text-sm font-semibold text-brand-accent hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {file}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-6 text-text-muted">
              Offline product verifier path (suite):{" "}
              <code className="font-mono">witnessops-local-audit verify</code> with the
              proofpack, detached signature, and a trust registry obtained separately.{" "}
              <code className="font-mono">valid</code> is not a host-security grade.
            </p>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Proof boundary
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-text-secondary">
              <li>
                Integrity checks use Shield <code>MANIFEST.sha256</code> semantics
                (READY / MISMATCH / MISSING) on the web fixture family.
              </li>
              <li>
                Does not prove regulatory compliance, EDR coverage, or that your
                production hosts match this fixture.
              </li>
              <li>
                Web fixture receipt is structural; full suite sample uses offline product
                verify. A public verifier path must be named before any verification claim
                is made. Neither sample is live customer evidence.
              </li>
            </ul>
          </section>

          <p className="text-xs text-text-muted">
            Web fixture id: {shieldSampleId}. Suite sample id:{" "}
            <code className="font-mono">offsec-local-audit</code> /{" "}
            <code className="font-mono">pr_lsa_20260710120000_198fd7aceb</code>.
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
