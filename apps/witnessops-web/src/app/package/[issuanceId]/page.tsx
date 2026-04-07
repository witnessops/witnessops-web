/**
 * Customer proof package page (WEB-013).
 *
 * Read-only customer-facing view of a delivered proof package. Keyed by
 * issuanceId (what a customer has in their link), resolved to a
 * control-plane runId via the local token store.
 *
 * This page does not mutate control-plane truth. Accept/reject controls
 * land in WEB-014.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getIssuanceById } from "@/lib/server/token-store";
import {
  getCompletionView,
  getCustomerAcceptance,
} from "@/lib/server/control-plane-client";
import { buildCustomerProofPackageView } from "@/lib/server/customer-proof-package";
import { CustomerProofPackage } from "@/components/customer-proof-package";
import { CustomerDispositionForm } from "./customer-disposition-form";

export const metadata: Metadata = {
  title: "Proof package",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ issuanceId: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function CustomerPackagePage({
  params,
  searchParams,
}: Props) {
  const { issuanceId } = await params;
  const { email: rawEmail } = await searchParams;
  const email = rawEmail?.toLowerCase().trim() ?? "";

  const record = await getIssuanceById(issuanceId);
  if (!record || record.email !== email) {
    notFound();
  }

  const runId = record.controlPlaneRunId;

  if (!runId) {
    return (
      <main className="min-h-screen bg-black text-zinc-100">
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
          <Header issuanceId={issuanceId} email={email} />
          <div className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-6 text-sm text-zinc-400">
            Your proof package is not yet available. Once scope approval has
            been handed off and the package is assembled and delivered, it
            will appear here.
          </div>
        </div>
      </main>
    );
  }

  const completion = await getCompletionView(runId);
  if (completion === "not_configured") {
    return (
      <main className="min-h-screen bg-black text-zinc-100">
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
          <Header issuanceId={issuanceId} email={email} />
          <div className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-6 text-sm text-zinc-400">
            Proof package read surface is not configured in this environment.
          </div>
        </div>
      </main>
    );
  }
  if (completion === "not_found") {
    notFound();
  }

  const acceptanceResult = await getCustomerAcceptance(runId);
  const acceptance =
    acceptanceResult === "not_found" || acceptanceResult === "not_configured"
      ? null
      : acceptanceResult;

  const view = buildCustomerProofPackageView(completion, acceptance);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <Header issuanceId={issuanceId} email={email} />
        <CustomerProofPackage view={view} />
        {view.disposition === null &&
        (view.stage === "delivered" || view.stage === "acknowledged") ? (
          <CustomerDispositionForm issuanceId={issuanceId} email={email} />
        ) : null}
        <div className="text-xs text-zinc-700 border-t border-zinc-900 pt-4">
          Proof package contents are sealed with DSSE Ed25519 envelopes and
          stored as append-only proof records. This page is session-private.
          Do not share the URL.
        </div>
      </div>
    </main>
  );
}

function Header({ issuanceId, email }: { issuanceId: string; email: string }) {
  return (
    <div>
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">
        WitnessOps — Proof package
      </div>
      <h1 className="text-2xl font-semibold text-zinc-100">Your proof package</h1>
      <div className="mt-1 text-sm text-zinc-500 font-mono">
        Issuance: {issuanceId}
      </div>
      <div className="text-xs text-zinc-600 font-mono">{email}</div>
    </div>
  );
}
