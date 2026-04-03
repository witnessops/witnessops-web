"use client";

import styles from "./admin.module.css";

const actions = [
  { label: "Rebuild site", buttonText: "Trigger", message: "Build triggered" },
  { label: "Regenerate audio", buttonText: "Trigger", message: "Audio regen triggered" },
  { label: "Trust drift scan", buttonText: "Trigger", message: "Drift scan triggered" },
  { label: "Clear .next cache", buttonText: "Clear", message: "Cache cleared" },
] as const;

export function AdminActions() {
  return (
    <>
      <div className={styles.sectionHeader}>Actions</div>
      {actions.map((action) => (
        <div key={action.label} className={styles.row}>
          <span className={styles.rowLabel}>{action.label}</span>
          <button
            className={styles.rowAction}
            onClick={() => alert(action.message)}
          >
            {action.buttonText}
          </button>
        </div>
      ))}
    </>
  );
}
