import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { VerifyConsole } from "@/components/verify/verify-console";
import { SectionShell } from "@/components/shared/section-shell";
import { listVerifyFixtures } from "@/lib/verify-fixtures";

export const metadata: Metadata = {
  title: "Verify a Receipt",
  description:
    "Upload or paste a WitnessOps receipt to check structural validity, integrity, and what the result does and does not establish.",
  alternates: getCanonicalAlternates("witnessops", "/verify"),
  openGraph: {
    title: "Verify a Receipt | WitnessOps",
    description:
      "Upload or paste a WitnessOps receipt to check structural validity, integrity, and what the result does and does not establish.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verify a Receipt | WitnessOps",
    description:
      "Upload or paste a WitnessOps receipt to check structural validity, integrity, and what the result does and does not establish.",
  },
};

function pickExampleReceipt(): string | null {
  const fixtures = listVerifyFixtures();
  const preferred =
    fixtures.find((fixture) => fixture.id === "pv-valid") ??
    fixtures.find(
      (fixture) =>
        fixture.expected.kind === "verification" &&
        fixture.expected.verdict === "valid",
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
          Upload a receipt file or paste its JSON. The check confirms whether
          the receipt is structurally valid, whether its integrity checks pass,
          and what the result does—and does not—establish.
        </p>

        <div className="mt-8" id="verify-console">
          <VerifyConsole exampleReceipt={exampleReceipt} />
        </div>

        <p className="mt-8 max-w-[36rem] text-sm leading-7 text-text-muted">
          {
            "A valid result confirms the checks named in the receipt. It does not prove that every underlying action was correct, and it does not prove the full runtime story."
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
              the receipt may be coherent, but a required trust condition could
              not be established here.
            </p>
            <p>
              This page does not revalidate full proof bundles or claim production
              deployment truth. For mechanism detail, use the technical docs
              linked below.
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
