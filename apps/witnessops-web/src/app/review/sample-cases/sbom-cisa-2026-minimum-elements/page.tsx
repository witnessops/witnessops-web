import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";
import { SampleCaseBanner } from "@/components/marketing/sample-case-banner";
import {
  cisaNewsUrl,
  cisaResourceUrl,
  intentionalGaps,
  packageFiles,
  presentHighlights,
  sampleBuyerWalkthroughUrl,
  sampleCommitShort,
  sampleId,
  sampleManifestBlobUrl,
  sampleSourcePath,
  sampleSourceRepository,
  sampleTreeUrl,
} from "./sample-contract";

export const metadata: Metadata = {
  title: "Sample — SBOM minimum-elements check",
  description:
    "Synthetic sample showing a bounded SBOM package check against the public CISA 2026 minimum elements baseline. Not live customer evidence and not a compliance certificate.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/sbom-cisa-2026-minimum-elements",
  ),
  openGraph: {
    title: "Sample — SBOM minimum-elements check | WitnessOps",
    description:
      "Inspect a synthetic SBOM package check with generation context, named gaps, and clear limits. Not a CISA compliance claim.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample — SBOM minimum-elements check | WitnessOps",
    description:
      "Inspect a synthetic SBOM package check with generation context, named gaps, and clear limits.",
  },
};

const statusChips = [
  { label: "Type", value: "Published sample package" },
  { label: "Status", value: "Not live" },
  { label: "Checklist", value: "Partial with named gaps" },
] as const;

const walkthrough = [
  [
    "Open the package",
    "Use the GitHub sample folder for the full synthetic SBOM, checklist, receipt, and challenge path.",
  ],
  [
    "Read the situation",
    "One named software unit — sample-app — with a tiny dependency set and intentional gaps.",
  ],
  [
    "Check the checklist",
    "Document-level CISA 2026 fields are present; two component-level fields are partial with named gaps.",
  ],
  [
    "Stay inside the boundary",
    "This is package shape and checklist observation only — not compliance certification or vulnerability status.",
  ],
] as const;

export default function SbomCisa2026SamplePage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <SectionShell narrow>
        <SampleCaseBanner
          title="SBOM minimum-elements package check"
          note="Synthetic public sample. It shows how WitnessOps packages an SBOM check against the public CISA 2026 minimum elements baseline. It is not a live customer SBOM, not a compliance certificate, and not a vulnerability assessment."
        />

        <header className="space-y-5 border-b border-surface-border pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Sample case
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-5xl">
            SBOM minimum-elements check
          </h1>
          <p className="max-w-2xl text-base leading-7 text-text-secondary">
            Situation: you received or produced a software bill of materials and
            need a bounded answer — which CISA 2026 minimum elements appear
            present, partial, missing, or unknown for one named software unit.
          </p>
          <div className="flex flex-wrap gap-2">
            {statusChips.map((chip) => (
              <span
                key={chip.label}
                className="rounded-full border border-surface-border bg-surface-bg px-3 py-1 text-xs text-text-muted"
              >
                <span className="font-semibold text-text-primary">{chip.label}:</span>{" "}
                {chip.value}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <CtaButton href="/review/request" variant="primary" label="Start a review" />
            <CtaButton href={sampleTreeUrl} variant="secondary" label="Open sample package" />
            <CtaButton
              href="/review/sample-cases"
              variant="secondary"
              label="Browse all examples"
            />
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="border border-surface-border bg-surface-bg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              What this sample shows
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-text-secondary marker:text-brand-accent">
              <li>A synthetic machine-readable SBOM for a tiny application.</li>
              <li>Generation context: who authored it, which tool, and what was in scope.</li>
              <li>A minimum-elements checklist with named present and partial fields.</li>
              <li>How gaps stay visible instead of being smoothed over.</li>
              <li>A receipt-style package a third party can re-hash and challenge.</li>
            </ul>
          </article>
          <article className="border border-surface-border bg-surface-bg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              What it does not show
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-text-secondary marker:text-brand-accent">
              <li>CISA, federal, or third-party compliance certification.</li>
              <li>That the software is free of vulnerabilities or known exploits.</li>
              <li>Live customer or production SBOM authenticity.</li>
              <li>Full AI-SBOM or multi-tenant SaaS coverage.</li>
              <li>Production signing-key custody or supplier honesty.</li>
            </ul>
          </article>
        </section>

        <section className="mt-10" aria-labelledby="sbom-walkthrough-heading">
          <h2
            id="sbom-walkthrough-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Three-minute buyer walkthrough
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <ol className="space-y-4">
            {walkthrough.map(([title, body], index) => (
              <li
                key={title}
                className="border border-surface-border bg-surface-card/40 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="border border-brand-accent/40 bg-brand-accent/5 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Present in this sample
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-text-secondary marker:text-brand-accent">
              {presentHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="border border-surface-border bg-surface-bg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Intentional sample gaps
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              These gaps are deliberate so the checklist can demonstrate partial
              coverage without inventing a clean bill of health.
            </p>
            <ul className="mt-4 space-y-3">
              {intentionalGaps.map((gap) => (
                <li
                  key={gap.component}
                  className="border border-surface-border bg-surface-card/40 px-4 py-3 text-sm"
                >
                  <p className="font-mono text-xs text-text-muted">{gap.component}</p>
                  <p className="mt-1 text-text-secondary">{gap.issue}</p>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-10 border border-surface-border bg-surface-card/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
            Public CISA baseline (reference only)
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
            On 29 July 2026, CISA and partners published{" "}
            <strong className="font-semibold text-text-primary">
              2026 Minimum Elements for a Software Bill of Materials (SBOM)
            </strong>
            , updating the 2021 NTIA baseline. This sample maps against that
            public baseline. It is not an official CISA artifact and does not
            claim compliance with CISA guidance.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CtaButton href={cisaResourceUrl} variant="secondary" label="CISA 2026 resource" />
            <CtaButton href={cisaNewsUrl} variant="secondary" label="CISA news release" />
          </div>
        </section>

        <section className="mt-10 border border-surface-border bg-surface-bg p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
            Sample package lineage
          </h2>
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-text-muted">Sample ID</dt>
              <dd className="mt-1 font-mono text-text-primary">{sampleId}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Source repository</dt>
              <dd className="mt-1 font-mono text-text-primary">{sampleSourceRepository}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Package path</dt>
              <dd className="mt-1 font-mono text-text-primary">{sampleSourcePath}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Pinned commit</dt>
              <dd className="mt-1 font-mono text-text-primary">{sampleCommitShort}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <CtaButton href={sampleTreeUrl} variant="primary" label="Open sample package" />
            <CtaButton
              href={sampleManifestBlobUrl}
              variant="secondary"
              label="Open hash manifest"
            />
            <CtaButton
              href={sampleBuyerWalkthroughUrl}
              variant="secondary"
              label="Read buyer walkthrough"
            />
          </div>
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Package files
            </h3>
            <ul className="mt-3 grid gap-1 font-mono text-xs leading-6 text-text-muted sm:grid-cols-2">
              {packageFiles.map((file) => (
                <li key={file} className="flex gap-2">
                  <span className="text-brand-accent">✓</span>
                  <span>{file}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-10 border border-surface-border bg-surface-card/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
            Boundary note
          </h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            This page is a published explanatory sample case and package
            presentation. It is not a live customer artifact. It is not a legal compliance claim.
            It is not a production deployment claim. It is not a claim of completed verification
            for your environment. The artifacts carry the inspectable detail; this page explains
            the situation and limits.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CtaButton href="/review/request" variant="primary" label="Start a review" />
            <CtaButton
              href="/review/sample-cases"
              variant="secondary"
              label="Browse all examples"
            />
            <Link
              href="/library"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
            >
              Skills
            </Link>
          </div>
        </section>
      </SectionShell>
    </main>
  );
}
