import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";
import { SampleCaseBanner } from "@/components/marketing/sample-case-banner";
import { SectionShell } from "@/components/shared/section-shell";
import {
  buyerWalkthroughHref,
  sampleArtifactDigest,
  sampleArtifactHref,
  sampleArtifactNames,
  sampleBaseUrl,
  sampleCommit,
  sampleCommitShort,
  sampleDisplayedArtifactNames,
  sampleDisplayedButNotManifestHashedArtifactNames,
  sampleManifestAnchor,
  sampleManifestBlobSha,
  sampleManifestHashedArtifactNames,
  sampleManifestHashedButNotDisplayedArtifactNames,
  sampleManifestHref,
  sampleManifestPath,
  sampleManifestSha256,
  sampleSourceRepository,
  type SampleArtifactName,
} from "./sample-artifact-contract";

export const metadata: Metadata = {
  title: "Sample — AI agent change package",
  description:
    "Public sample of one AI agent change: who approved it, what was allowed, what evidence was captured, and how another party can re-check the package. Not live customer evidence.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/ai-agent-action-proof-run",
  ),
  openGraph: {
    title: "Sample — AI agent change package | WitnessOps",
    description:
      "Inspect a public sample package for one AI agent change: authority, scope, evidence, receipt, and limits.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample — AI agent change package | WitnessOps",
    description:
      "Inspect a public sample package for one AI agent change: authority, scope, evidence, receipt, and limits.",
  },
};

const statusChips = [
  { label: "Type", value: "Full sample package" },
  { label: "Status", value: "Not live" },
  { label: "Situation", value: "AI agent change after approval" },
  { label: "Sample commit", value: sampleCommitShort },
];

const buyerChecks = [
  {
    label: "Buyer question",
    value:
      "Can another party inspect who approved the action, what ran, what evidence survived, and what the verifier checked?",
  },
  {
    label: "Use this page when",
    value:
      "A CISO, AI platform owner, GRC lead, or auditor needs to read the bundle without guessing what each file means.",
  },
  {
    label: "Proof boundary",
    value:
      "The sample demonstrates receipt shape and verifier path. It is not a production deployment, legal compliance claim, or whole-program assurance claim.",
  },
];

const lineageRows = [
  {
    label: "Sample commit",
    value: sampleCommit,
  },
  {
    label: "Pinned artifact links",
    value:
      "All GitHub artifact links on this page use the sample commit, not the mutable main branch.",
  },
  {
    label: "Manifest anchor",
    value: sampleManifestAnchor,
  },
  {
    label: "Boundary",
    value:
      "The commit pin and manifest line support replayable sample inspection only; they are not production custody proof.",
  },
];

const manifestProvenanceRows = [
  {
    label: "Source repository",
    value: sampleSourceRepository,
  },
  {
    label: "Manifest path",
    value: sampleManifestPath,
  },
  {
    label: "Manifest blob SHA",
    value: sampleManifestBlobSha,
  },
  {
    label: "Manifest text SHA-256",
    value: sampleManifestSha256,
  },
];

const manifestCoverageRows = [
  {
    label: "Displayed artifacts",
    value: sampleDisplayedArtifactNames.join(", "),
  },
  {
    label: "Manifest-hashed artifacts",
    value: sampleManifestHashedArtifactNames.join(", "),
  },
  {
    label: "Displayed but not manifest-hashed",
    value: sampleDisplayedButNotManifestHashedArtifactNames.join(", "),
  },
  {
    label: "Manifest-hashed but not displayed",
    value: sampleManifestHashedButNotDisplayedArtifactNames.join(", "),
  },
];

const sampleOutcomeRows = [
  {
    label: "Action",
    value:
      "A sample AI agent performed one bounded code or configuration workflow after human approval.",
  },
  {
    label: "Verifier result",
    value:
      "VERIFY_RESULT.json reports pass_with_sample_limitations for the sample receipt shape, manifest checks, and declared evidence boundaries.",
  },
  {
    label: "Limits",
    value:
      "This sample does not prove production deployment, legal compliance, source-system truth, production signing-key custody, or complete AI governance.",
  },
  {
    label: "Buyer takeaway",
    value:
      "You can inspect how authority, action scope, evidence, receipt, verifier result, challenge path, and manifest fit together before packaging your own security workflow.",
  },
];

const inspectionSteps: Array<{
  title: string;
  summary: string;
  artifact: SampleArtifactName;
}> = [
  {
    title: "Read the action boundary",
    summary: "Confirm the sample is scoped to one workflow, one agent/tool path, and one touched system.",
    artifact: "ACTION_BOUNDARY.json",
  },
  {
    title: "Check who had authority",
    summary: "Inspect who may approve, run, review, and challenge the action.",
    artifact: "AUTHORITY_MAP.json",
  },
  {
    title: "Inspect the evidence manifest",
    summary: "Review captured artifacts, hashes, sources, and declared evidence gaps.",
    artifact: "EVIDENCE_MANIFEST.json",
  },
  {
    title: "Read the receipt",
    summary: "See how approval, action, evidence, result, and limits are bound into one record.",
    artifact: "RECEIPT.json",
  },
  {
    title: "Read the verifier result",
    summary: "See what passed, what failed, and what remained outside the verifier boundary.",
    artifact: "VERIFY_RESULT.json",
  },
  {
    title: "Follow the challenge path",
    summary: "Understand how another party can inspect, dispute, or ask for stronger evidence.",
    artifact: "CHALLENGE_PATH.md",
  },
  {
    title: "Compare the manifest digest",
    summary: "Check the published file digests so artifact drift is visible.",
    artifact: "MANIFEST.sha256",
  },
];

const artifactPurposes: Record<SampleArtifactName, string> = {
  "ACTION_BOUNDARY.json":
    "The one workflow, one action path, and one system boundary under review.",
  "AUTHORITY_MAP.json":
    "Who can approve, run, review, and challenge the agent-assisted action.",
  "EVIDENCE_MANIFEST.json":
    "The captured artifacts, hashes, sources, and known evidence gaps.",
  "RECEIPT.json":
    "The signed or simulated receipt binding approval, action, evidence, result, and limits.",
  "VERIFY_RESULT.json":
    "The verifier result showing pass, fail, or limits for the sample bundle.",
  "CHALLENGE_PATH.md":
    "How a third party can inspect, dispute, or request stronger evidence.",
  "MANIFEST.sha256":
    "Digest list for checking that the sample artifacts did not silently drift.",
};

const artifactFiles = sampleArtifactNames.map((name) => ({
  name,
  digest: sampleArtifactDigest(name),
  purpose: artifactPurposes[name],
}));

const proofRunOutputs = [
  "one workflow",
  "one action path",
  "one receipt",
  "one verifier result",
  "one challenge path",
];

export default function AiAgentActionProofRunSamplePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>

        <SampleCaseBanner
          title="AI agent change package"
          note="Full sample package on GitHub. Shows how a third party inspects one AI agent change after human approval. Not live customer evidence, production deployment, or AI governance certification."
        />
        <div className="space-y-8">
          <section className="space-y-5 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample case
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              AI agent change package
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              Situation: an AI agent proposed and applied one bounded code or
              configuration change after human approval. Use this public package
              to see who authorized it, what was allowed, what evidence was
              captured, and how another party can re-check the files.
            </p>
            <p className="text-sm leading-7 text-text-muted">
              Package title in the repository: AI Agent Action Proof Run. This
              page is the buyer-facing walkthrough of that sample.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
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
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaButton
                href="/review/request"
                variant="primary"
                label="Start a review"
              />
              <CtaButton
                href={sampleBaseUrl}
                variant="secondary"
                label="Open sample package"
              />
              <CtaButton
                href={buyerWalkthroughHref}
                variant="secondary"
                label="Read buyer walkthrough"
              />
              <CtaButton
                href="/review/sample-cases"
                variant="secondary"
                label="Browse all examples"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Sample lineage
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {lineageRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-surface-border bg-surface-bg p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                    {row.label}
                  </div>
                  <p className="mt-3 break-words font-mono text-xs leading-6 text-text-secondary">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Manifest provenance
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {manifestProvenanceRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-surface-border bg-surface-bg p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                    {row.label}
                  </div>
                  <p className="mt-3 break-words font-mono text-xs leading-6 text-text-secondary">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
            <a
              href={sampleManifestHref}
              className="mt-5 inline-flex items-center justify-center rounded-md border border-surface-border px-5 py-3 text-sm text-text-primary transition-all hover:border-brand-accent/40 hover:bg-surface-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open pinned manifest
            </a>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Manifest coverage
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              MANIFEST.sha256 is displayed as the digest-list artifact, but it is
              not self-listed inside MANIFEST.sha256. README.md is hashed in the
              pinned manifest, but it is not shown as a page inspection artifact.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {manifestCoverageRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-surface-border bg-surface-bg p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                    {row.label}
                  </div>
                  <p className="mt-3 break-words font-mono text-xs leading-6 text-text-secondary">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Three-minute buyer walkthrough
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {buyerChecks.map((item) => (
                <div key={item.label} className="rounded-xl border border-surface-border bg-surface-bg p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                    {item.label}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <a
              href={buyerWalkthroughHref}
              className="mt-5 inline-flex items-center justify-center rounded-md border border-surface-border px-5 py-3 text-sm text-text-primary transition-all hover:border-brand-accent/40 hover:bg-surface-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open BUYER_WALKTHROUGH.md
            </a>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample outcome
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
              What this sample shows before you open the artifacts
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {sampleOutcomeRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-surface-border bg-surface-bg p-4"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                    {row.label}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-text-muted">
              Read the buyer walkthrough first if you want the plain-English
              path. Open the artifacts when you want to inspect the bundle
              directly.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CtaButton
                href={buyerWalkthroughHref}
                variant="secondary"
                label="Read buyer walkthrough"
              />
              <CtaButton
                href={sampleBaseUrl}
                variant="secondary"
                label="View artifacts"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              How to inspect this sample
            </h2>
            <div className="mt-5 grid gap-4">
              {inspectionSteps.map((step, index) => (
                <a
                  key={step.artifact}
                  href={sampleArtifactHref(step.artifact)}
                  className="grid gap-3 rounded-xl border border-surface-border bg-surface-bg p-4 transition-colors hover:bg-surface-card/60 sm:grid-cols-[56px_1fr]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="font-mono text-xs uppercase tracking-[0.16em] text-brand-accent">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">
                      {step.title}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">
                      {step.summary}
                    </p>
                    <p className="mt-3 font-mono text-xs text-text-muted">
                      {step.artifact}
                    </p>
                    <p className="mt-2 break-all font-mono text-[11px] leading-5 text-text-muted">
                      SHA-256: {sampleArtifactDigest(step.artifact)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-text-muted">
              The manifest is the sample drift check, not a production custody
              claim.
            </p>
          </section>

          <section className="grid gap-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6 md:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Workflow
              </div>
              <p className="mt-2 text-base leading-8 text-text-secondary">
                AI agent proposes and performs a bounded code or configuration
                change after human approval.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Proof question
              </div>
              <p className="mt-2 text-base leading-8 text-text-secondary">
                Can another party inspect who approved the action, what ran,
                what system it touched, what evidence survived, and what could
                not be verified?
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Buyer path
              </div>
              <p className="mt-2 text-base leading-8 text-text-secondary">
                Use the sample to inspect the proof shape, then submit one
                bounded agent-assisted workflow for your own package.
              </p>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Artifact set
            </h2>
            <div className="grid gap-3">
              {artifactFiles.map((artifact) => (
                <a
                  key={artifact.name}
                  href={sampleArtifactHref(artifact.name)}
                  className="block rounded-xl border border-surface-border bg-surface-bg p-4 transition-colors hover:bg-surface-card/60"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="font-mono text-sm font-semibold text-text-primary">
                    {artifact.name}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    {artifact.purpose}
                  </p>
                  <p className="mt-3 break-all font-mono text-[11px] leading-5 text-text-muted">
                    SHA-256: {artifact.digest}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-accent">
                    Open artifact
                  </p>
                </a>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                Proof-run shape
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
                {proofRunOutputs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                Boundary
              </h2>
              <p className="mt-4 text-base leading-8 text-text-secondary">
                This sample demonstrates the receipt shape and verifier path only. It
                does not claim production deployment, legal compliance, or
                complete AI governance coverage.
              </p>
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-border pt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
              Ready to test your own workflow?
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              Use the sample to inspect the proof shape before submitting your
              own workflow. The request page asks for your name, work email,
              optional company or team, security workflow, workflow/tool path
              and touched system, scope and approval boundary, and evidence
              available.
            </p>
            <div className="flex flex-wrap gap-3">
              <CtaButton
                href="/review/request"
                variant="primary"
                label="Start a review"
              />
              <Link
                href="/review"
                className="inline-flex items-center justify-center rounded-md border border-surface-border px-6 py-3 text-sm text-text-primary transition-all hover:border-brand-accent/40 hover:bg-surface-card"
              >
                Read package offer
              </Link>
            </div>
          </section>
        </div>
      </SectionShell>
    </main>
  );
}
