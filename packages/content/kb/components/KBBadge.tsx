import type { ReactNode } from "react";
import styles from "./kb-components.module.css";

export function KBBadge({
  variant,
  children,
}: {
  variant: "live" | "draft" | "amber";
  children: ReactNode;
}) {
  return (
    <span className={`${styles.badge} ${styles[`badge-${variant}`]}`}>
      {children}
    </span>
  );
}
