import type { Metadata } from "next";
import { getAdminCoreHealth, listGmailSyncReceipts } from "@/lib/server/admin-core-spine";
import { buildHealthCards } from "@/lib/admin/admin-health-display";
import { getAdminPageActor } from "@/lib/server/admin-page-session";
import { AdminHealthGrid, AdminHealthSummary } from "../../../../components/admin/admin-health-view";
import { CorePage } from "../../../../components/admin/admin-core-view";
import styles from "../../../../components/admin/admin.module.css";

export const metadata: Metadata = { title: "Admin — Settings and Health", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function AdminSettingsHealth() {
  const actor = await getAdminPageActor();
  const cards = buildHealthCards(getAdminCoreHealth(), await listGmailSyncReceipts(5, actor));
  return (
    <CorePage title="Settings / Integration Health" eyebrow="Configuration status without secret values">
      <AdminHealthSummary cards={cards} />
      <div className={styles.coreDetailSection}><div className={styles.coreText}>Founder access is enabled for the initial operating path. Delegated Operator can execute assigned work. Administrator can manage configuration but does not automatically receive authority to approve proof scope or customer-facing claims.</div></div>
      <AdminHealthGrid cards={cards} />
    </CorePage>
  );
}

export default async function AdminSettingsPage() {
  await getAdminPageActor();
  return <AdminSettingsHealth />;
}
