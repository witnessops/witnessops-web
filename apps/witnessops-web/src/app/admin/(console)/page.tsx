import type { Metadata } from "next";
import { buildAdmissionQueueView } from "@/lib/server/admission-queue";
import { buildReconciliationReportFromView } from "@/lib/server/reconciliation-report";
import { AdminOverviewGrid } from "../../../components/admin/admin-overview-grid";
import { AdminEmptyState } from "../../../components/admin/admin-empty-state";

export const metadata: Metadata = {
  title: "Admin — Overview",
  robots: { index: false, follow: false },
};

export default async function AdminOverviewPage() {
  let view;
  let report;

  try {
    view = await buildAdmissionQueueView();
    report = buildReconciliationReportFromView(view);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error loading queue data.";
    return <AdminEmptyState variant="unavailable" detail={message} />;
  }

  return <AdminOverviewGrid view={view} report={report} />;
}
