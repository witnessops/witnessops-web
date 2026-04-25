import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";
import { SectionShell } from "@/components/shared/section-shell";

const sampleBaseUrl =
  "https://github.com/witnessops/witnessops-sample-cases/tree/main/sample-cases/ai-agent-action-proof-run";
const sampleBlobBaseUrl =
  "https://github.com/witnessops/witnessops-sample-cases/blob/main/sample-cases/ai-agent-action-proof-run";

export const metadata: Metadata = {
  title: "Sample Proof Run - AI Agent Action",
  description:
    "Inspect the public AI Agent Action Proof Run sample bundle: authority map, action boundary, evidence manifest, receipt, verifier result, challenge path, and manifest digest.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/ai-agent-action-proof-run",
  ),
  openGraph: {
    title: "Sample Proof Run - AI Agent Action | WitnessOps",
    description:
      "Inspect the public AI Agent Action Proof Run sample bundle and see what another party can check after an agent acts.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Proof Run - AI Agent Action | WitnessOps",
    description:
      "Inspect the public AI Agent Action Proof Run sample bundle and see what another party can check after an agent acts.",
  },
};

const statusChips = [
  { label: "Offer", value: "AI Agent Action Proof Run" },
  { label: "Artifact class", value: "Public sample bundle" },
  { label: "Status", value: "Receipt shape only" },
];

const inspectionSteps = [
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
];

const artifactFiles = [
  {
    name: "ACTION_BOUNDARY.json",
    purpose: "The one workflow, one action path, and one system boundary under review.",
  },
  {
    name: "AUTHORITY_MAP.json",
    purpose: "Who can approve, run, review, and challenge the agent-assisted action.",
  },
  {
    name: "EVIDENCE_MANIFEST.json",
    purpose: "The captured artifacts, hashes, sources, and known evidence gaps.",
  },
  {
    name: "RECEIPT.json",
    purpose: "The signed or simulated receipt binding approval, action, evidence, result, and limits.",
  },
  {
    name: "VERIFY_RESULT.json",
    purpose: "The verifier result showing pass, fail, or limits for the sample bundle.",
  },
  {
    name: "CHALLENGE_PATH.md",
    purpose: "How a third party can inspect, dispute, or request stronger evidence.",
  },
  {
    name: "MANIFEST.sha256",
    purpose: "Digest list for checking that the sample artifacts did not silently drift.",
  },
];

const proofRunOutputs = [
  "one workflow",
  "one action path",
  "one receipt",
  "one verifier result",
  "one challenge path",
];

function artifactHref(name: string) {
  return `${sampleBlobBaseUrl}/${name}`;
}

export default function AiAgentActionProofRunSamplePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <div className="space-y-8">
          <section className="space-y-5 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample proof run
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              AI Agent Action Proof Run
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              This sample shows how another party checks a proof bundle after an
              AI agent acts. Inspect the action boundary, evidence manifest,
              receipt, verifier result, challenge path, and digest manifest
              before requesting a proof run for your own workflow.
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
                label="Request an AI Agent Action Proof Run"
              />
              <CtaButton
                href={sampleBaseUrl}
                variant="secondary"
                label="Open GitHub sample bundle"
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
                  href={artifactHref(step.artifact)}
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
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-text-muted">
              Finish by comparing the bundle files against <span className="font-mono text-text-primary">MANIFEST.sha256</span>.
              The manifest is the sample drift check, not a production custody claim.
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
                bounded agent-assisted workflow for your own proof run.
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
                  href={artifactHref(artifact.name)}
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
                This sample proves the receipt shape and verifier path only. It
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
              own workflow. The request page asks for the workflow name,
              agent/tool involved, system touched, approval boundary, evidence
              available, buyer email, and urgency.
            </p>
            <div className="flex flex-wrap gap-3">
              <CtaButton
                href="/review/request"
                variant="primary"
                label="Request an AI Agent Action Proof Run"
              />
              <Link
                href="/review"
                className="inline-flex items-center justify-center rounded-md border border-surface-border px-6 py-3 text-sm text-text-primary transition-all hover:border-brand-accent/40 hover:bg-surface-card"
              >
                Read the offer
              </Link>
            </div>
          </section>
        </div>
      </SectionShell>
    </main>
  );
}
