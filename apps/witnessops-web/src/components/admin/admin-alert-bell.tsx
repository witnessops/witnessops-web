import { unstable_rethrow } from "next/navigation";
import { buildAdmissionQueueView } from "@/lib/server/admission-queue";
import type { PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";
import { deriveAlerts, type AlertItem } from "@/lib/admin/admin-alert-derive";
import { AdminAlertPanel } from "./admin-alert-panel";
import { buildLifecycleByRunId } from "./admin-admission-queue";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export async function AdminAlertBell() {
  let alerts: AlertItem[] = [];
  let loadError: string | null = null;

  try {
    const actor = await getAdminPageActor();
    const view = await buildAdmissionQueueView(actor);
    let lifecycleByRunId = new Map<string, PostApprovalLifecycleView>();
    try {
      lifecycleByRunId = await buildLifecycleByRunId(view.rows);
    } catch (error) {
      unstable_rethrow(error);
      loadError = "Could not load lifecycle alerts.";
    }
    alerts = deriveAlerts(view.rows, lifecycleByRunId);
  } catch (error) {
    unstable_rethrow(error);
    loadError = "Could not load alerts.";
  }

  return <AdminAlertPanel alerts={alerts} loadError={loadError} />;
}

export type { AlertItem };
