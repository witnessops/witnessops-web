"use client";

import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

export function AdminAuthInfo({ keyHash }: { keyHash: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <>
      <div className={styles.sectionHeader}>Auth</div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Key hash (first 16)</span>
        <span className={styles.rowValueSmall}>
          {keyHash ? `${keyHash}...` : "\u2014"}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Session</span>
        <span className={styles.rowValueGreen}>Active</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Logout</span>
        <button className={styles.rowAction} onClick={handleLogout}>
          End Session
        </button>
      </div>
    </>
  );
}
