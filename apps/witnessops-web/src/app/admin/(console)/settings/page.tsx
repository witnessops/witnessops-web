import type { Metadata } from "next";
import { getAdminCoreHealth } from "@/lib/server/admin-core-spine";
import { CoreHealthGrid, CorePage } from "../../../../components/admin/admin-core-view";
import styles from "../../../../components/admin/admin.module.css";

export const metadata: Metadata = { title: "Admin — Settings and Health", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return <CorePage title="Settings / Integration Health" eyebrow="Configuration status without secret values"><div className={styles.coreDetailSection}><div className={styles.coreText}>Founder access is enabled for the initial operating path. Delegated Operator can execute assigned work. Administrator can manage configuration but does not automatically receive authority to approve proof scope or customer-facing claims.</div></div><CoreHealthGrid health={getAdminCoreHealth()} /></CorePage>;
}
