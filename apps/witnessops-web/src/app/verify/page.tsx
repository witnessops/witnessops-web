import type { Metadata } from "next";
import Link from "next/link";
import { VerifyConsole } from "@/components/verify/verify-console";
import { SectionShell } from "@/components/shared/section-shell";
import { listVerifyFixtures } from "@/lib/verify-fixtures";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Verify a Receipt",
  description:
    "Upload or paste supported WitnessOps receipt JSON to run bounded receipt-only checks and see what remains unverified.",
  alternates: languageAlternates("/verify", {
    en: "/verify",
    pl: "/pl/verify",
  }),
  openGraph: {
    title: "Verify a Receipt | WitnessOps",
    description:
      "Upload or paste supported WitnessOps receipt JSON to run bounded receipt-only checks and see what remains unverified.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verify a Receipt | WitnessOps",
    description:
      "Upload or paste supported WitnessOps receipt JSON to run bounded receipt-only checks and see what remains unverified.",
  },
};

function pickExampleReceipt(): string | null {
  const fixtures = listVerifyFixtures();
  const preferred =
    fixtures.find((fixture) => fixture.id === "pv-valid") ??
    fixtures.find(
      (fixture) =>
        fixture.expected.kind === "verification" &&
        fixture.expected.verdict === "indeterminate",
    ) ??
    fixtures[0];
  return preferred?.receiptInput ?? null;
}

export default function VerifyPage() {
  const exampleReceipt = pickExampleReceipt();

  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow className="pt-10 sm:pt-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Verify
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
          Verify a WitnessOps receipt
        </h1>
        <p className="mt-4 max-w-[36rem] text-base leading-7 text-text-secondary">
          Upload a supported receipt file or paste its JSON. The public adapter
          runs receipt-only checks and names every evidence, artifact, signature,
          or trust input that it did not independently check.
        </p>

        <div className="mt-8" id="verify-console">
          <VerifyConsole exampleReceipt={exampleReceipt} />
        </div>

        <p className="mt-8 max-w-[36rem] text-sm leading-7 text-text-muted">
          {
            "Try an example currently demonstrates an indeterminate receipt-only result. Passed checks do not establish a valid result when required evidence or trust inputs were not independently checked."
          }
        </p>

        <details className="mt-6 border border-surface-border bg-surface-bg open:bg-surface-card/20">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-text-primary">
            What this result means
          </summary>
          <div className="space-y-3 border-t border-surface-border px-5 py-4 text-sm leading-relaxed text-text-muted">
            <p>
              <strong className="text-text-secondary">Valid</strong> means the
              checks required for this receipt type passed. On this public
              surface, that is receipt-scoped only.
            </p>
            <p>
              <strong className="text-text-secondary">Invalid</strong> means one
              or more of those checks failed. Read the named failure before
              relying on any claim built on the receipt.
            </p>
            <p>
              <strong className="text-text-secondary">Incomplete</strong> means
              the receipt may be coherent, but required evidence, artifact,
              authorization, workflow, signature, or trust checks were not all
              independently completed here. The API verdict is `indeterminate`.
            </p>
            <p>
              For Public Exposure Review receipts, a structurally conforming input
              remains incomplete today because the page does not receive the full
              evidence package and the server-owned production key policy is not
              active. This page does not accept caller-supplied evidence or trust
              material and does not claim production deployment truth.
            </p>
          </div>
        </details>

        <nav
          className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-surface-border pt-6 text-sm"
          aria-label="Related technical resources"
        >
          <Link
            href="/docs/how-it-works/verification"
            className="text-brand-accent underline-offset-4 hover:underline"
          >
            How verification works
          </Link>
          <Link
            href="/docs/evidence/receipts"
            className="text-brand-accent underline-offset-4 hover:underline"
          >
            Receipts
          </Link>
          <Link
            href="/docs/evidence/receipt-spec"
            className="text-brand-accent underline-offset-4 hover:underline"
          >
            Receipt specification
          </Link>
          <Link
            href="/library"
            className="text-brand-accent underline-offset-4 hover:underline"
          >
            Library &amp; sample materials
          </Link>
        </nav>
      </SectionShell>
    </main>
  );
}
