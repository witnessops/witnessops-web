"use client";

import {
  getActionClass,
  getActionReason,
  isActionEnabled,
  type AdminAction,
} from "@/lib/admin/policy";
import { PolicyClassBadge } from "./policy-class-badge";
import styles from "./admin.module.css";

const actions: {
  action: AdminAction;
  label: string;
  buttonText: string;
}[] = [
  { action: "rebuild-site", label: "Rebuild site", buttonText: "Trigger" },
  { action: "regen-audio", label: "Regenerate audio", buttonText: "Trigger" },
  { action: "trust-drift-scan", label: "Trust drift scan", buttonText: "Trigger" },
  { action: "clear-cache", label: "Clear .next cache", buttonText: "Clear" },
];

export function AdminActions() {
  return (
    <>
      <div className={styles.sectionHeader}>Actions</div>
      {actions.map((item) => {
        const actionClass = getActionClass(item.action);
        const reason = getActionReason(item.action);
        const enabled = isActionEnabled(actionClass);

        return (
          <div key={item.action} className={styles.actionRow}>
            <div className={styles.actionRowLeft}>
              <span className={styles.rowLabel}>{item.label}</span>
              <PolicyClassBadge actionClass={actionClass} />
            </div>
            <div className={styles.actionRowRight}>
              {reason ? (
                <span className={styles.actionReason}>{reason}</span>
              ) : null}
              {enabled ? (
                <button
                  type="button"
                  className={styles.rowAction}
                  onClick={() => {
                    // TODO: wire to real API endpoints
                    // For now, actions that are enabled but not wired show
                    // an explicit "not wired" message instead of faking success.
                    alert(`${item.label}: not wired to backend yet.`);
                  }}
                >
                  {item.buttonText}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.rowActionDisabled}
                  disabled
                  aria-disabled="true"
                >
                  {item.buttonText}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
