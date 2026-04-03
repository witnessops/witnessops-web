import type { ReactNode } from "react";
import styles from "./kb-components.module.css";

export function KBCallout({
  variant = "default",
  label,
  children,
}: {
  variant?: "go" | "warn" | "stop" | "default";
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.callout} ${styles[`callout-${variant}`]}`}>
      <div className={styles.calloutLabel}>{label}</div>
      {children}
    </div>
  );
}
