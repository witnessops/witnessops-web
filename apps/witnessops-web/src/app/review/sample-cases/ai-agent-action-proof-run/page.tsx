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

const proofRunFacts = [
  {
    label: "Workflow",
    value: "AI agent proposes and performs a bounded code or configuration change after human approval.",
  },
  {
    label: "Proof question",
    value:
      "Can another party inspect who approved the action, what agent/tool path ran, what system it touched, what evidence survived, and what could not be verified?",
  },
  {
    label: "Buyer path",
    value:
      "Use this sample to inspect the artifact set, then request one bounded proof run for your own agent-assisted workflow.",
  },
  {
    label: "Boundary",
    value:
      "This sample proves receipt shape and verifier path only. It does not claim production deployment, legal compliance, or complete AI governance coverage.",
  },
];

const artifactFiles = [
  {
    name: "AUTHORITY_MAP.json",
    purpose: "Who can approve, run, review, and challenge the agent-assisted action.",
  },
  {
    name: "ACTION_BOUNDARY.json",
    purpose: "The one workflow, one action path, and one system boundary under review.",
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

const ctaCopy = [
  "Start with one consequential agent-assisted workflow.",
  "We map the approval boundary, capture the evidence path, produce a signed receipt, and return a verifier result showing what another party can check.",
  "If the evidence is incomplete, the proof says so.",
];

function artifactHref(name: string) {
  return `${sampleBlobBaseUrl}/${name}`;
}

export default function AiAgentActionProofRunSamplePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <div className="space-y-8">
          <section className="space-y-4 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample proof run
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              AI Agent Action Proof Run
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              A public sample bundle for the offer: Agents act. WitnessOps
              proves. Inspect the artifact set before requesting a proof run for
              your own agent-assisted workflow.
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
              Conversion path
            </h2>
            <div className="mt-4 space-y-3 text-base leading-8 text-text-secondary">
              {ctaCopy.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6 md:grid-cols-2">
            {proofRunFacts.map((fact) => (
              <div key={fact.label}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {fact.label}
                </div>
                <p className="mt-2 text-base leading-8 text-text-secondary">
                  {fact.value}
                </p>
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              What the bundle exposes
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

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Proof-run shape
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              {proofRunOutputs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Boundary
            </h2>
            <p className="mt-4 text-base leading-8 text-text-secondary">
              This sample proves the receipt shape and verifier path only. It
              does not claim production deployment, legal compliance, or
              complete AI governance coverage.
            </p>
          </section>

          <section className="space-y-4 border-t border-surface-border pt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
              Ready to test your own workflow?
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              Bring one consequential agent-assisted workflow. The request page
              asks for the workflow name, agent/tool involved, system touched,
              approval boundary, evidence available, buyer email, and urgency.
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
