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
      {/*
        WEB-011: removed the "Session: Active" row. It was a tautology —
        the component only renders behind admin-session auth, so the
        operator is by definition viewing it through an active session.
        The component does not check session expiry; the row added no
        operational signal. Key hash and Logout remain — both carry
        real, verifiable information.
      */}
      <div className={styles.row}>
        <span className={styles.rowLabel}>Key hash (first 16)</span>
        <span className={styles.rowValueSmall}>
          {keyHash ? `${keyHash}...` : "\u2014"}
        </span>
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
