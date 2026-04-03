import type { Metadata } from "next";
import { getCanonicalAlternates } from "@public-surfaces/config";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata: Metadata = {
  title: "Why WitnessOps",
  description:
    "WitnessOps is the governed execution layer for security operations, producing signed records that can be verified independently.",
  alternates: getCanonicalAlternates("witnessops", "/why-witnessops"),
};

export default function WhyWitnessOpsPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Why WitnessOps
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          WitnessOps is the governed execution layer for security operations.
        </h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-text-secondary">
          <p>
            WitnessOps is the governed execution layer for security operations.
          </p>
          <p>
            It runs approved security work under scope, policy, and approval
            controls. It records what happened and produces signed evidence
            that can be verified independently after the run is complete.
          </p>
          <p>
            The point is simple: security operations should not end as a story
            reconstructed from logs, screenshots, and memory. They should end
            as signed records that preserve the decision, the execution
            binding, and the evidence chain.
          </p>
          <p>WitnessOps keeps the public surface focused on what readers need to do next:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>get started,</li>
            <li>operate under policy,</li>
            <li>verify what happened,</li>
            <li>understand the trust model.</li>
          </ul>
          <p>The runtime may be complex. The public explanation should not be.</p>
          <p>
            That is why the documentation is organized around user intent,
            states trust boundaries directly, and treats verification as an
            independent act rather than a vendor-controlled response.
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
