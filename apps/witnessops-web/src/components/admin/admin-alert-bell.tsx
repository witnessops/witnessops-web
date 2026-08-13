import { buildAdmissionQueueView } from "@/lib/server/admission-queue";
import type { PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";
import { deriveAlerts, type AlertItem } from "@/lib/admin/admin-alert-derive";
import { AdminAlertPanel } from "./admin-alert-panel";
import { buildLifecycleByRunId } from "./admin-admission-queue";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export async function AdminAlertBell() {
  let alerts: AlertItem[] = [];

  try {
    const actor = await getAdminPageActor();
    const view = await buildAdmissionQueueView(actor);
    let lifecycleByRunId = new Map<string, PostApprovalLifecycleView>();
    try {
      lifecycleByRunId = await buildLifecycleByRunId(view.rows);
    } catch {
      // Lifecycle data unavailable; customer rejection alerts omitted.
    }
    alerts = deriveAlerts(view.rows, lifecycleByRunId);
  } catch {
    // If data is unavailable, show no alerts.
    // The overview/queue pages handle their own error states.
  }

  return <AdminAlertPanel alerts={alerts} />;
}

export type { AlertItem };
