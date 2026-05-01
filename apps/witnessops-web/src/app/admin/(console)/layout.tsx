import { Suspense } from "react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminSidebar } from "../../../components/admin/admin-sidebar";
import { AdminAlertBell } from "../../../components/admin/admin-alert-bell";
import styles from "../../../components/admin/admin.module.css";

export const metadata: Metadata = {
  title: "WitnessOps Admin Console",
  robots: { index: false, follow: false },
};

export default function AdminConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style>{`
        body { overflow: hidden !important; }
        .skip-link { display: none !important; }
        nav:not([aria-label="Admin navigation"]), footer { display: none !important; }
      `}</style>

      <div className={styles.consoleShell}>
        <AdminSidebar />
        <div className={styles.consoleMain}>
          <div className={styles.consoleHeader}>
            <div className={styles.consoleHeaderStatus}>
              <span className={styles.dot} /> Authenticated
            </div>
            <Suspense>
              <AdminAlertBell />
            </Suspense>
          </div>
          <div className={styles.consoleContent}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
