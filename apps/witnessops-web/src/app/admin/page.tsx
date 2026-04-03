import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminAdmissionQueue } from "../../components/admin/admin-admission-queue";
import { AdminSystem } from "../../components/admin/admin-system";
import { AdminActions } from "../../components/admin/admin-actions";
import { AdminAuthInfo } from "../../components/admin/admin-auth-info";
import { AdminKbLink } from "../../components/admin/admin-kb-link";
import styles from "../../components/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

function extractKeyHash(cookieValue: string | undefined): string {
  if (!cookieValue) return "";
  try {
    const dotIndex = cookieValue.lastIndexOf(".");
    if (dotIndex === -1) return "";
    const payloadB64 = cookieValue.slice(0, dotIndex);
    const payload = JSON.parse(atob(payloadB64));
    return typeof payload.hash === "string" ? payload.hash : "";
  } catch {
    return "";
  }
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("witnessops-admin-session")?.value;
  const keyHash = extractKeyHash(sessionCookie);

  return (
    <>
      <style>{`
        body { overflow: hidden !important; }
        .skip-link { display: none !important; }
        nav, footer { display: none !important; }
      `}</style>

      <div className={styles.shell}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>&#x2B21; WitnessOps Admin</span>
            <span className={styles.panelUser}>
              <span className={styles.dot} /> Authenticated
            </span>
          </div>
          <div className={styles.panelBody}>
            <AdminSystem />
            <AdminAdmissionQueue />
            <AdminActions />
            <AdminAuthInfo keyHash={keyHash} />
            <AdminKbLink />
          </div>
          <div className={styles.panelFooter}>
            &#x1F427; Respect the penguin. Bring receipts.
          </div>
        </div>
      </div>
    </>
  );
}
