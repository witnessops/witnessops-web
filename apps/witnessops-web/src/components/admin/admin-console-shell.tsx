"use client";

import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import styles from "./admin.module.css";

export function AdminConsoleShell({ children, alert }: { children: ReactNode; alert: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className={`${styles.consoleShell}${mobileOpen ? ` ${styles.consoleShellOpen}` : ""}`}>
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <button type="button" className={styles.mobileNavScrim} aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />
      <div className={styles.consoleMain}>
        <div className={styles.consoleHeader}>
          <button type="button" className={styles.mobileNavToggle} aria-label={mobileOpen ? "Close admin navigation" : "Open admin navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
          <div className={styles.consoleBreadcrumb}><span>HQ</span><span>/</span><strong>Operations</strong></div>
          <div className={styles.consoleHeaderActions}>
            <div className={styles.consoleBoundary}>Operator review required · no automatic execution</div>
            <div className={styles.consoleHeaderStatus}><span className={styles.dot} /> Authenticated</div>
            {alert}
          </div>
        </div>
        <div className={styles.consoleContent}>{children}</div>
      </div>
    </div>
  );
}
