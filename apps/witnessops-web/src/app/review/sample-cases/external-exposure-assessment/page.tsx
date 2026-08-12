import type { Metadata } from "next";

import { SampleCaseBanner } from "@/components/marketing/sample-case-banner";
import { CtaButton } from "@/components/shared/cta-button";
import { buyerOfferRequestHref } from "@/lib/buyer-services";

const samplePath = "/review/sample-cases/external-exposure-assessment";
const sampleBase = "/samples/offsec-external-exposure";
const sampleFiles = [
  "README.md",
  "external-exposure-assessment.md",
  "exposure-map.json",
  "findings.json",
  "evidence-register.json",
  "handover-agenda.md",
  "focused-retest-result.md",
  "synthetic-rehearsal-checklist.md",
  "synthetic-timesheet.md",
  "CLAIM_BOUNDARY.md",
  "evidence-manifest.json",
  "verifier-result.json",
  "MANIFEST.sha256",
] as const;

export const metadata: Metadata = {
  title: "Synthetic sample — External Exposure Assessment",
  description:
    "Inspect a synthetic External Exposure Assessment package with bounded scope, findings, evidence references, a focused retest, hashes, and explicit claim limitations. Not customer evidence.",
  alternates: { canonical: samplePath },
  openGraph: {
    title: "Synthetic sample — External Exposure Assessment | WitnessOps",
    description:
      "Inspect a synthetic outside-in assessment package and its evidence, retest, integrity, and claim boundaries.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synthetic sample — External Exposure Assessment | WitnessOps",
    description:
      "Inspect a synthetic outside-in assessment package and its evidence, retest, integrity, and claim boundaries.",
  },
};

const walkthrough = [
  [
    "Start with authority and scope",
    "Read the assessment and exposure map to see the synthetic target boundary, fixed caps, allowed checks, exclusions, and unknowns.",
  ],
  [
    "Trace findings to evidence",
    "Compare the synthetic findings with the evidence register. Each finding should name the observation that supports it.",
  ],
  [
    "Inspect closure",
    "Use the handover agenda and focused retest result to see what was explained, rechecked, and left unresolved.",
  ],
  [
    "Check package integrity",
    "Use MANIFEST.sha256 and the recorded verifier result for the named file and hash checks only. Integrity is not proof that a system is secure.",
  ],
] as const;

const boundaries = [
  "Synthetic worked example — not customer evidence.",
  "Not a live customer artifact or production verification result.",
  "No public company or customer was assessed to produce this package.",
  "This is not a penetration test, certification, attestation, or security guarantee.",
  "The package does not prove that a target is secure, complete, compliant, accepted, or free of vulnerabilities.",
  "The verifier result supports only the checks and files it names; it does not prove observation completeness or system security.",
] as const;

export default function ExternalExposureAssessmentSamplePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="buyer-page"
      data-page="external-exposure-assessment-sample"
      data-sample-product="OFFSEC-EXTERNAL-EXPOSURE"
    >
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <SampleCaseBanner
          title="External Exposure Assessment"
          note="Synthetic worked example — not customer evidence. Local fixture observations only; no public company or customer was assessed."
        />

        <header className="mt-8 max-w-4xl border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Synthetic sample
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            External Exposure Assessment
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
            A concise, buyer-safe example of the authority summary, exposure map,
            evidence-linked findings, handover, focused retest, manifest, and verifier
            result produced for a bounded synthetic target.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton
              href={buyerOfferRequestHref("en", "OFFSEC-EXTERNAL-EXPOSURE")}
              variant="primary"
              label="Start a review"
            />
            <CtaButton
              href="/catalog/offsec-external-exposure"
              variant="secondary"
              label="View service"
            />
          </div>
        </header>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            How to inspect the sample
          </h2>
          <ol className="mt-8 space-y-4">
            {walkthrough.map(([title, body], index) => (
              <li key={title} className="border-t border-surface-border pt-4">
                <p className="text-sm font-semibold text-text-primary">
                  {index + 1}. {title}
                </p>
                <p className="mt-1 text-sm leading-7 text-text-secondary">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Sample package files
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            These files are sanitized synthetic artifacts. They are published for buyer
            inspection, not as evidence about WitnessOps or any customer.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {sampleFiles.map((file) => (
              <li key={file} className="border border-surface-border bg-surface-card/40 p-4">
                <a
                  href={`${sampleBase}/${file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-sm font-semibold text-brand-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                >
                  {file}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            What the integrity result means
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            MANIFEST.sha256 checks the files in this public sample. The published
            verifier result is preserved from the complete internal signed synthetic
            bundle and names the verifier, schema, trust set, and checks that ran; it is
            not a receipt for this smaller web copy. Neither result proves that
            observations are complete, that findings are universally correct, or that
            any system is secure.
          </p>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Boundaries
          </h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            {boundaries.map((boundary) => (
              <li key={boundary} className="border-t border-surface-border pt-4">
                {boundary}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
