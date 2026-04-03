import { Suspense } from "react";
import { AdminSidebar } from "../../../components/admin/admin-sidebar";
import { AdminAlertBell } from "../../../components/admin/admin-alert-bell";
import styles from "../../../components/admin/admin.module.css";

export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
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
