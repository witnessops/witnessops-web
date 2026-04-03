import type { Metadata } from "next";
import { buildAdmissionQueueView } from "@/lib/server/admission-queue";
import { buildReconciliationReportFromView } from "@/lib/server/reconciliation-report";
import { ReconciliationReportView } from "../../../../components/admin/reconciliation-report-view";
import { AdminEmptyState } from "../../../../components/admin/admin-empty-state";

export const metadata: Metadata = {
  title: "Admin — Reports",
  robots: { index: false, follow: false },
};

const STALE_ACCEPTED_HOURS = 24;

function hoursAgo(iso: string): number {
  const diff = Date.now() - Date.parse(iso);
  return diff > 0 ? Math.floor(diff / (60 * 60 * 1000)) : 0;
}

export default async function AdminReportsPage() {
  let report;
  let staleAcceptedCount = 0;

  try {
    const view = await buildAdmissionQueueView();
    report = buildReconciliationReportFromView(view);
    staleAcceptedCount = view.rows.filter(
      (row) =>
        row.responseProviderOutcomeStatus === "accepted" &&
        row.responseProviderOutcomeObservedAt !== null &&
        hoursAgo(row.responseProviderOutcomeObservedAt) >= STALE_ACCEPTED_HOURS &&
        !row.reconciliationResolved,
    ).length;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error loading report data.";
    return <AdminEmptyState variant="unavailable" detail={message} />;
  }

  return (
    <ReconciliationReportView
      report={report}
      staleAcceptedCount={staleAcceptedCount}
    />
  );
}
