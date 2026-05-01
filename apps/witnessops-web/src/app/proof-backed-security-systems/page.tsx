import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { CodeFrame } from "@/components/shared/code-frame";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata: Metadata = {
  title: "Proof-Backed Security Systems",
  description:
    "Proof-backed security systems turn governed operations into portable artifacts that can be checked independently of the runtime that emitted them.",
  alternates: getCanonicalAlternates("witnessops", "/proof-backed-security-systems"),
};

const modelBoundaries = [
  "This page explains the architecture model. It does not verify a specific workflow or customer environment.",
  "Independent checking requires the named artifact set: receipt, manifest, evidence bundle, verifier result, or status digest.",
  "A proof-backed surface can show what was captured and what passed the declared verifier path. It does not remove source-system or key-custody trust assumptions.",
  "Operator internals stay separate from public proof presentation unless an artifact explicitly declares a public disclosure boundary.",
];

export default function ProofBackedSecuritySystemsPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell>
        <div className="grid gap-12 lg:grid-cols-[1fr,0.95fr] lg:items-start">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Proof-Backed Security Systems
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Security evidence should outlive the runtime that produced it.
            </h1>
            <div className="mt-8 space-y-6 text-base leading-8 text-text-secondary">
              <p>
                A proof-backed security system emits artifacts that stay useful
                after the incident, deployment, or remediation run is over.
                Instead of relying on screenshots or log spelunking, operators
                publish bundles, manifests, receipts, and status digests that
                can be checked independently.
              </p>
              <p>
                This architecture matters because public trust, auditor review,
                and cross-team handoff all happen outside the original runtime.
                The public surface should show how proof is produced and where
                to inspect it, without exposing operator internals directly.
              </p>
              <p>
                WitnessOps explains that model. Verification, attestation, and
                status surfaces carry the actual proof. Operator pathways
                are governed from runbook to receipt.
              </p>
            </div>
          </div>

          <CodeFrame
            language="json"
            title="artifact-model"
            lines={[
              "{",
              '  "receipt": "signed output of a governed action",',
              '  "manifest": "evidence inventory with content hashes",',
              '  "evidence_chain": "ordered sequence of receipts",',
              '  "status": "freshness and posture summary",',
              '  "scope": "authorized targets and policy version"',
              "}",
            ]}
          />
        </div>
      </SectionShell>

      <SectionShell className="pt-0">
        <section className="border border-surface-border bg-surface-bg p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Model boundary
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
            The page describes the proof model. The artifacts carry the proof.
          </h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-text-secondary md:grid-cols-2">
            {modelBoundaries.map((boundary) => (
              <li key={boundary} className="border border-surface-border bg-surface-card p-4">
                {boundary}
              </li>
            ))}
          </ul>
        </section>
      </SectionShell>
    </main>
  );
}
