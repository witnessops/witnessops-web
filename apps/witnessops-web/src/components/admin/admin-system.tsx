"use client";

import styles from "./admin.module.css";

export function AdminSystem() {
  return (
    <>
      <div className={styles.sectionHeader}>System</div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Surface</span>
        <span className={styles.rowValueAccent}>witnessops.com</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Build</span>
        <span className={styles.rowValue}>STATIC</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Status</span>
        <span className={styles.rowValueGreen}>LIVE</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Docs Pages</span>
        <span className={styles.rowValue}>48</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Audio Files</span>
        <span className={styles.rowValue}>48</span>
      </div>
    </>
  );
}
