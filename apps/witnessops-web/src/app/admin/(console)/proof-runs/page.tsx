import type { Metadata } from "next";
import Link from "next/link";
import { listProofRuns } from "@/lib/server/admin-core-spine";
import { CorePage, CoreState, CoreTable } from "../../../../components/admin/admin-core-view";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Proof Runs", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminProofRunsPage() {
  const runs = await listProofRuns(await getAdminPageActor());
  return <CorePage title="Proof Runs" eyebrow="Execution and evidence state"><CoreTable headers={["Run", "Product contract", "State", "Evidence", "Next action"]} rows={runs.map((run) => [<Link href={`/admin/proof-runs/${run.id}`} key={run.id}>{run.id}</Link>, `${run.productContractSnapshot.productName} v${run.productContractSnapshot.contractVersion}`, <CoreState value={run.state} key="state" />, run.evidenceState, run.nextAction])} /></CorePage>;
}
