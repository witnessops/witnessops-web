import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata: Metadata = {
  title: "Why WitnessOps",
  description:
    "WitnessOps governs security operations and produces signed receipts that customers, auditors, and counterparties can verify after the run.",
  alternates: getCanonicalAlternates("witnessops", "/why-witnessops"),
  openGraph: {
    title: "Why WitnessOps | WitnessOps",
    description:
      "WitnessOps governs security operations and produces signed receipts that customers, auditors, and counterparties can verify after the run.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why WitnessOps | WitnessOps",
    description:
      "WitnessOps governs security operations and produces signed receipts that customers, auditors, and counterparties can verify after the run.",
  },
};

export default function WhyWitnessOpsPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Why WitnessOps
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          WitnessOps is the governed execution surface for security operations.
        </h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-text-secondary">
          <p>
            WitnessOps governs approved security work under scope, policy, and
            approval controls. It records what happened and produces signed
            evidence that can be verified after the run is complete.
          </p>
          <p>
            The point is not to generate a prettier incident report. The point
            is to make the operational record durable enough that auditors,
            insurers, regulators, customers, and acquirers can inspect it
            without trusting WitnessOps to stay in the loop.
          </p>
          <p>
            Security operations should not end as a story reconstructed from
            logs, screenshots, and memory. They should end as signed records
            that preserve the decision, the execution binding, and the
            evidence chain.
          </p>
          <p>WitnessOps keeps the public surface focused on what readers need to do next:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>start a governed engagement,</li>
            <li>operate under policy,</li>
            <li>verify what happened,</li>
            <li>understand the trust model.</li>
          </ul>
          <p>
            The runtime may be complex. The public explanation should not be.
            That is why the documentation is organized around user intent,
            states trust boundaries directly, and treats verification as a
            separate act rather than a vendor-controlled response.
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
