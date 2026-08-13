import type { Metadata } from "next";
import { buildAdmissionQueueView } from "@/lib/server/admission-queue";
import { buildReconciliationReportFromView } from "@/lib/server/reconciliation-report";
import { AdminOverviewGrid } from "../../../components/admin/admin-overview-grid";
import { AdminEmptyState } from "../../../components/admin/admin-empty-state";
import { buildLifecycleByRunId } from "../../../components/admin/admin-admission-queue";
import { AdminCoreDashboard } from "../../../components/admin/admin-core-dashboard";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = {
  title: "Admin — Overview",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const coreDashboard = <AdminCoreDashboard />;
  let view;
  let report;

  try {
    view = await buildAdmissionQueueView(await getAdminPageActor());
    report = buildReconciliationReportFromView(view);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error loading queue data.";
    return <>{coreDashboard}<AdminEmptyState variant="unavailable" detail={message} /></>;
  }

  let customerAccepted = 0;
  let customerRejected = 0;
  try {
    const lifecycleByRunId = await buildLifecycleByRunId(view.rows);
    for (const lifecycle of lifecycleByRunId.values()) {
      if (lifecycle.stage === "accepted") customerAccepted++;
      else if (lifecycle.stage === "rejected") customerRejected++;
    }
  } catch {
    // Lifecycle data unavailable; customer acceptance counts remain 0.
  }

  return <><AdminCoreDashboard /><AdminOverviewGrid view={view} report={report} customerAccepted={customerAccepted} customerRejected={customerRejected} /></>;
}
